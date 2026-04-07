export interface ModelDefinition {
  id: string;
  name: string;
  description: string;
  sizeLabel: string;
  sizeMB: number;
  url: string;
  filename: string;
  recommended: boolean;
}

export const MODELS: ModelDefinition[] = [
  {
    id: 'qwen-0.5b',
    name: 'Qwen 0.5B',
    description: 'Ultra-fast. Best for low-end devices.',
    sizeLabel: '~350 MB',
    sizeMB: 350,
    url: 'https://huggingface.co/Qwen/Qwen1.5-0.5B-Chat-GGUF/resolve/main/qwen1_5-0_5b-chat-q4_k_m.gguf',
    filename: 'qwen1_5-0_5b-chat-q4_k_m.gguf',
    recommended: true,
  },
  {
    id: 'tinyllama-1.1b',
    name: 'TinyLlama 1.1B',
    description: 'Balanced speed and intelligence.',
    sizeLabel: '~670 MB',
    sizeMB: 670,
    url: 'https://huggingface.co/TheBloke/TinyLlama-1.1B-Chat-v1.0-GGUF/resolve/main/tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf',
    filename: 'tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf',
    recommended: false,
  },
];

export const DEFAULT_MODEL_ID = 'qwen-0.5b';
