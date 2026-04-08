import AsyncStorage from '@react-native-async-storage/async-storage';
import { CallLog } from './call_handler';
import { PERSONAS } from '../constants/personas';

export interface PastCall {
  id: string;
  timestamp: number;
  personaId: string;
  logs: CallLog[];
}

const STORAGE_KEY = '@aura_call_history';

class HistoryService {
  async getHistory(): Promise<PastCall[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Failed to parse call history', e);
      return [];
    }
  }

  async addCall(personaId: string, logs: CallLog[]): Promise<void> {
    const history = await this.getHistory();
    const newCall: PastCall = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      personaId,
      logs,
    };
    // Prepend to history
    history.unshift(newCall);
    
    // Keep a maximum of 50 calls to save space
    if (history.length > 50) {
      history.pop();
    }

    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch (e) {
      console.error('Failed to save call history', e);
    }
  }

  async clearHistory(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.error('Failed to clear call history', e);
    }
  }
}

export const historyService = new HistoryService();
