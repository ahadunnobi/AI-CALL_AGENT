/**
 * ai_engine.ts — On-device LLM inference service.
 *
 * Uses llama.rn to run GGUF models directly on the phone.
 * Manages model lifecycle: download → load → infer → unload.
 */
import * as FileSystem from 'expo-file-system';
import { initLlama, LlamaContext } from 'llama.rn';
import { MODELS, DEFAULT_MODEL_ID, ModelDefinition } from '../constants/models';

export type AIStatus = 'idle' | 'downloading' | 'loading' | 'ready' | 'thinking' | 'error';

export interface DownloadProgress {
  totalBytes: number;
  writtenBytes: number;
  percent: number;
}

type StatusListener = (status: AIStatus, detail?: string) => void;
type ProgressListener = (progress: DownloadProgress) => void;

class AIEngine {
  private context: LlamaContext | null = null;
  private currentModelId: string | null = null;
  private _status: AIStatus = 'idle';
  private statusListeners: StatusListener[] = [];
  private progressListeners: ProgressListener[] = [];

  get status(): AIStatus {
    return this._status;
  }

  get isReady(): boolean {
    return this._status === 'ready';
  }

  get modelDir(): string {
    return `${FileSystem.documentDirectory}models/`;
  }

  // --- Listeners ---

  onStatusChange(fn: StatusListener): () => void {
    this.statusListeners.push(fn);
    return () => {
      this.statusListeners = this.statusListeners.filter((l) => l !== fn);
    };
  }

  onDownloadProgress(fn: ProgressListener): () => void {
    this.progressListeners.push(fn);
    return () => {
      this.progressListeners = this.progressListeners.filter((l) => l !== fn);
    };
  }

  private setStatus(s: AIStatus, detail?: string) {
    this._status = s;
    this.statusListeners.forEach((fn) => fn(s, detail));
  }

  // --- Model Management ---

  private getModel(id: string): ModelDefinition {
    const m = MODELS.find((m) => m.id === id);
    if (!m) throw new Error(`Unknown model: ${id}`);
    return m;
  }

  private modelPath(model: ModelDefinition): string {
    return `${this.modelDir}${model.filename}`;
  }

  async isModelDownloaded(id: string): Promise<boolean> {
    const model = this.getModel(id);
    const info = await FileSystem.getInfoAsync(this.modelPath(model));
    return info.exists;
  }

  async downloadModel(id: string): Promise<void> {
    const model = this.getModel(id);

    // Ensure directory exists
    const dirInfo = await FileSystem.getInfoAsync(this.modelDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(this.modelDir, { intermediates: true });
    }

    // Check if already downloaded
    if (await this.isModelDownloaded(id)) {
      console.log(`Model ${id} already downloaded.`);
      return;
    }

    this.setStatus('downloading', model.name);

    const callback = (downloadProgress: FileSystem.DownloadProgressData) => {
      const percent =
        downloadProgress.totalBytesExpectedToWrite > 0
          ? Math.round(
              (downloadProgress.totalBytesWritten /
                downloadProgress.totalBytesExpectedToWrite) *
                100
            )
          : 0;
      this.progressListeners.forEach((fn) =>
        fn({
          totalBytes: downloadProgress.totalBytesExpectedToWrite,
          writtenBytes: downloadProgress.totalBytesWritten,
          percent,
        })
      );
    };

    const downloadResumable = FileSystem.createDownloadResumable(
      model.url,
      this.modelPath(model),
      {},
      callback
    );

    const result = await downloadResumable.downloadAsync();
    if (!result || !result.uri) {
      this.setStatus('error', 'Download failed');
      throw new Error('Model download failed.');
    }

    console.log(`Model ${id} downloaded to ${result.uri}`);
  }

  async deleteModel(id: string): Promise<void> {
    const model = this.getModel(id);
    const path = this.modelPath(model);
    const info = await FileSystem.getInfoAsync(path);
    if (info.exists) {
      await FileSystem.deleteAsync(path);
    }
    if (this.currentModelId === id) {
      await this.unload();
    }
  }

  // --- Inference Lifecycle ---

  async load(id?: string): Promise<void> {
    const modelId = id || DEFAULT_MODEL_ID;
    const model = this.getModel(modelId);

    if (this.currentModelId === modelId && this.context) {
      this.setStatus('ready');
      return;
    }

    // Unload previous
    await this.unload();

    // Download if needed
    if (!(await this.isModelDownloaded(modelId))) {
      await this.downloadModel(modelId);
    }

    this.setStatus('loading', model.name);

    try {
      this.context = await initLlama({
        model: this.modelPath(model),
        n_ctx: 2048,
        n_batch: 256,
        n_threads: 4,
        use_mlock: true,
      });
      this.currentModelId = modelId;
      this.setStatus('ready');
      console.log(`Model ${modelId} loaded successfully.`);
    } catch (err: any) {
      this.setStatus('error', err.message);
      throw err;
    }
  }

  async unload(): Promise<void> {
    if (this.context) {
      await this.context.release();
      this.context = null;
      this.currentModelId = null;
      this.setStatus('idle');
    }
  }

  async complete(
    systemPrompt: string,
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    onToken?: (token: string) => void
  ): Promise<string> {
    if (!this.context) throw new Error('No model loaded.');

    this.setStatus('thinking');

    // Build prompt (ChatML format)
    let prompt = `<|im_start|>system\n${systemPrompt}<|im_end|>\n`;
    for (const msg of messages) {
      prompt += `<|im_start|>${msg.role}\n${msg.content}<|im_end|>\n`;
    }
    prompt += '<|im_start|>assistant\n';

    try {
      const result = await this.context.completion(
        {
          prompt,
          n_predict: 256,
          stop: ['<|im_end|>', '<|im_start|>'],
          temperature: 0.7,
          top_p: 0.9,
        },
        (data) => {
          if (onToken && data.token) {
            onToken(data.token);
          }
        }
      );

      this.setStatus('ready');
      return result.text.trim();
    } catch (err: any) {
      this.setStatus('error', err.message);
      throw err;
    }
  }
}

// Singleton
export const aiEngine = new AIEngine();
