/**
 * tts_service.ts — Text-to-Speech using Expo's native speech API.
 *
 * Zero-footprint: uses the platform's built-in speech engine.
 */
import * as Speech from 'expo-speech';

class TTSService {
  private speaking = false;

  async speak(text: string, options?: { rate?: number; pitch?: number; language?: string }): Promise<void> {
    if (this.speaking) {
      await this.stop();
    }

    return new Promise<void>((resolve, reject) => {
      this.speaking = true;
      Speech.speak(text, {
        language: options?.language || 'en-US',
        rate: options?.rate || 0.95,
        pitch: options?.pitch || 1.0,
        onDone: () => {
          this.speaking = false;
          resolve();
        },
        onError: (err) => {
          this.speaking = false;
          reject(err);
        },
        onStopped: () => {
          this.speaking = false;
          resolve();
        },
      });
    });
  }

  async stop(): Promise<void> {
    if (this.speaking) {
      await Speech.stop();
      this.speaking = false;
    }
  }

  get isSpeaking(): boolean {
    return this.speaking;
  }

  async getVoices(): Promise<Speech.Voice[]> {
    return Speech.getAvailableVoicesAsync();
  }
}

export const ttsService = new TTSService();
