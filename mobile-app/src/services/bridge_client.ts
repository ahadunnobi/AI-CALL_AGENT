/**
 * bridge_client.ts — Connect to laptop's Python AI Brain over WiFi.
 *
 * When on the same network, the mobile app offloads inference to the
 * existing FastAPI server (more powerful, faster). Falls back to
 * on-device AI when the laptop is unreachable.
 */
import axios, { AxiosInstance } from 'axios';

export interface BridgeHealth {
  status: string;
  model: string;
}

export interface TurnResult {
  text: string;
  audio_b64?: string;
}

class BridgeClient {
  private client: AxiosInstance;
  private _baseUrl: string;
  private _available = false;

  constructor() {
    this._baseUrl = 'http://192.168.1.100:8000'; // Default, user configures
    this.client = axios.create({
      baseURL: this._baseUrl,
      timeout: 10000,
    });
  }

  get baseUrl(): string {
    return this._baseUrl;
  }

  set baseUrl(url: string) {
    this._baseUrl = url;
    this.client = axios.create({ baseURL: url, timeout: 10000 });
    this._available = false;
  }

  get available(): boolean {
    return this._available;
  }

  async checkHealth(): Promise<boolean> {
    try {
      const res = await this.client.get<BridgeHealth>('/health', { timeout: 3000 });
      this._available = res.data?.status === 'ok';
      return this._available;
    } catch {
      this._available = false;
      return false;
    }
  }

  async startCall(phone: string): Promise<any> {
    const res = await this.client.post('/call/start', { phone });
    return res.data;
  }

  async processTurn(phone: string, audioB64: string): Promise<TurnResult> {
    const res = await this.client.post<TurnResult>('/call/turn', {
      phone,
      audio_b64: audioB64,
    });
    return res.data;
  }

  async endCall(phone: string): Promise<any> {
    const res = await this.client.post('/call/end', { phone });
    return res.data;
  }

  async getGreeting(phone: string): Promise<TurnResult> {
    const res = await this.client.post<TurnResult>('/call/greeting', { phone });
    return res.data;
  }
}

export const bridgeClient = new BridgeClient();
