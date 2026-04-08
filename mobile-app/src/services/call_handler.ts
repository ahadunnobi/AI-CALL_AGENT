/**
 * call_handler.ts — Orchestrates the full call pipeline on mobile.
 *
 * Flow: Incoming audio → STT → AI (local or bridge) → TTS → respond
 * Manages SIP registration and call state.
 */
import { aiEngine } from './ai_engine';
import { sttService } from './stt_service';
import { ttsService } from './tts_service';
import { bridgeClient } from './bridge_client';
import { PERSONAS, DEFAULT_PERSONA_ID } from '../constants/personas';

export type CallState = 'idle' | 'ringing' | 'active' | 'processing' | 'speaking' | 'ended';
export type InferenceMode = 'local' | 'bridge' | 'auto';

export interface CallLog {
  timestamp: number;
  role: 'caller' | 'agent' | 'system';
  text: string;
}

type CallStateListener = (state: CallState) => void;
type LogListener = (log: CallLog) => void;

class CallHandler {
  private _state: CallState = 'idle';
  private _mode: InferenceMode = 'auto';
  private _logs: CallLog[] = [];
  private _personaId: string = DEFAULT_PERSONA_ID;
  private stateListeners: CallStateListener[] = [];
  private logListeners: LogListener[] = [];

  get systemPrompt(): string {
    const persona = PERSONAS.find(p => p.id === this._personaId);
    return persona ? persona.systemPrompt : PERSONAS[0].systemPrompt;
  }

  get personaId(): string {
    return this._personaId;
  }

  set personaId(id: string) {
    this._personaId = id;
  }

  get state(): CallState {
    return this._state;
  }

  get logs(): CallLog[] {
    return [...this._logs];
  }

  get mode(): InferenceMode {
    return this._mode;
  }

  set mode(m: InferenceMode) {
    this._mode = m;
  }

  // --- Listeners ---

  onStateChange(fn: CallStateListener): () => void {
    this.stateListeners.push(fn);
    return () => {
      this.stateListeners = this.stateListeners.filter((l) => l !== fn);
    };
  }

  onLog(fn: LogListener): () => void {
    this.logListeners.push(fn);
    return () => {
      this.logListeners = this.logListeners.filter((l) => l !== fn);
    };
  }

  private setState(s: CallState) {
    this._state = s;
    this.stateListeners.forEach((fn) => fn(s));
  }

  private addLog(role: CallLog['role'], text: string) {
    const log: CallLog = { timestamp: Date.now(), role, text };
    this._logs.push(log);
    this.logListeners.forEach((fn) => fn(log));
  }

  // --- Inference Mode Selection ---

  private async shouldUseBridge(): Promise<boolean> {
    if (this._mode === 'local') return false;
    if (this._mode === 'bridge') return true;
    // Auto: try bridge first
    return await bridgeClient.checkHealth();
  }

  // --- Call Pipeline ---

  async startCall(): Promise<void> {
    this._logs = [];
    this.setState('active');
    this.addLog('system', 'Call started');

    // Determine inference mode
    const useBridge = await this.shouldUseBridge();
    if (useBridge) {
      this.addLog('system', 'Using laptop AI (bridge mode)');
    } else {
      this.addLog('system', 'Using on-device AI (local mode)');
      if (!aiEngine.isReady) {
        this.addLog('system', 'Loading AI model...');
        await aiEngine.load();
        this.addLog('system', 'AI model ready');
      }
    }

    // Speak greeting
    this.setState('speaking');
    const greeting = "Hello, this is Ahad's assistant. How can I help you?";
    this.addLog('agent', greeting);
    await ttsService.speak(greeting);

    // Start listening
    this.startListening();
  }

  private startListening(): void {
    this.setState('active');
    this.addLog('system', 'Listening...');

    sttService.start(
      async (text: string, isFinal: boolean) => {
        if (isFinal && text.trim().length > 0) {
          await this.processTurn(text.trim());
        }
      },
      (error: string) => {
        this.addLog('system', `STT error: ${error}`);
      }
    );
  }

  private async processTurn(callerText: string): Promise<void> {
    this.setState('processing');
    this.addLog('caller', callerText);

    // Stop listening while processing
    await sttService.stop();

    try {
      let responseText: string;
      const useBridge = await this.shouldUseBridge();

      if (useBridge) {
        // Offload to laptop
        this.addLog('system', 'Thinking (bridge)...');
        const result = await bridgeClient.processTurn('mobile-user', callerText);
        responseText = result.text;
      } else {
        // Local inference
        this.addLog('system', 'Thinking (local)...');
        const messages = this.buildConversationHistory();
        messages.push({ role: 'user', content: callerText });
        responseText = await aiEngine.complete(this.systemPrompt, messages);
      }

      // Speak response
      this.setState('speaking');
      this.addLog('agent', responseText);
      await ttsService.speak(responseText);

      // Check for goodbye
      const lowerCaller = callerText.toLowerCase();
      const lowerResponse = responseText.toLowerCase();
      if (
        lowerCaller.includes('goodbye') ||
        lowerCaller.includes('bye') ||
        lowerResponse.includes('goodbye')
      ) {
        await this.endCall();
        return;
      }

      // Resume listening
      this.startListening();
    } catch (err: any) {
      this.addLog('system', `Error: ${err.message}`);
      this.setState('active');
      this.startListening();
    }
  }

  private buildConversationHistory(): Array<{ role: 'user' | 'assistant'; content: string }> {
    return this._logs
      .filter((l) => l.role === 'caller' || l.role === 'agent')
      .slice(-6)
      .map((l) => ({
        role: l.role === 'caller' ? 'user' as const : 'assistant' as const,
        content: l.text,
      }));
  }

  async endCall(): Promise<void> {
    await sttService.stop();
    await ttsService.stop();
    this.setState('ended');
    this.addLog('system', 'Call ended');
  }

  reset(): void {
    this._logs = [];
    this.setState('idle');
  }
}

export const callHandler = new CallHandler();
