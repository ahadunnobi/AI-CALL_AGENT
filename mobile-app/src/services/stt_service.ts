/**
 * stt_service.ts — Speech-to-Text using native platform engines.
 *
 * Uses @react-native-voice/voice for zero-footprint, on-device STT.
 * Falls back gracefully if permissions are denied.
 */
import Voice, {
  SpeechResultsEvent,
  SpeechErrorEvent,
  SpeechStartEvent,
  SpeechEndEvent,
} from '@react-native-voice/voice';

type TranscriptCallback = (text: string, isFinal: boolean) => void;
type ErrorCallback = (error: string) => void;

class STTService {
  private isListening = false;
  private onTranscript: TranscriptCallback | null = null;
  private onError: ErrorCallback | null = null;

  constructor() {
    Voice.onSpeechStart = this.handleStart;
    Voice.onSpeechEnd = this.handleEnd;
    Voice.onSpeechResults = this.handleResults;
    Voice.onSpeechPartialResults = this.handlePartial;
    Voice.onSpeechError = this.handleError;
  }

  private handleStart = (_e: SpeechStartEvent) => {
    this.isListening = true;
  };

  private handleEnd = (_e: SpeechEndEvent) => {
    this.isListening = false;
  };

  private handleResults = (e: SpeechResultsEvent) => {
    const text = e.value?.[0] || '';
    if (text && this.onTranscript) {
      this.onTranscript(text, true);
    }
  };

  private handlePartial = (e: SpeechResultsEvent) => {
    const text = e.value?.[0] || '';
    if (text && this.onTranscript) {
      this.onTranscript(text, false);
    }
  };

  private handleError = (e: SpeechErrorEvent) => {
    const msg = e.error?.message || 'STT Error';
    console.error('STT Error:', msg);
    this.isListening = false;
    if (this.onError) this.onError(msg);
  };

  async start(
    onTranscript: TranscriptCallback,
    onError?: ErrorCallback,
    locale = 'en-US'
  ): Promise<void> {
    this.onTranscript = onTranscript;
    this.onError = onError || null;

    try {
      await Voice.start(locale);
    } catch (err: any) {
      console.error('Failed to start STT:', err);
      if (this.onError) this.onError(err.message);
    }
  }

  async stop(): Promise<string | null> {
    try {
      await Voice.stop();
      this.isListening = false;
      return null;
    } catch (err: any) {
      return err.message;
    }
  }

  async destroy(): Promise<void> {
    try {
      await Voice.destroy();
    } catch (_) {
      // Ignore
    }
    this.isListening = false;
    this.onTranscript = null;
    this.onError = null;
  }

  get listening(): boolean {
    return this.isListening;
  }
}

export const sttService = new STTService();
