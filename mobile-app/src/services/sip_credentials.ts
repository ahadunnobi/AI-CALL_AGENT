import AsyncStorage from '@react-native-async-storage/async-storage';

export interface SIPCredentials {
  uri: string;
  password: string;
  registrar: string;
  enabled: boolean;
}

const STORAGE_KEY = '@aura_sip_credentials';

const DEFAULT_SIP: SIPCredentials = {
  uri: 'sip:user@domain.com',
  password: '',
  registrar: 'wss://sip.domain.com:5063',
  enabled: false,
};

export class SIPCredentialsManager {
  static async get(): Promise<SIPCredentials> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      if (data) {
        return { ...DEFAULT_SIP, ...JSON.parse(data) };
      }
    } catch (e) {
      console.error('Failed to load SIP credentials', e);
    }
    return DEFAULT_SIP;
  }

  static async save(creds: SIPCredentials): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(creds));
    } catch (e) {
      console.error('Failed to save SIP credentials', e);
    }
  }
}
