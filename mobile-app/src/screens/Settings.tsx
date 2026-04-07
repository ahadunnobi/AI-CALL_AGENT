/**
 * Settings.tsx — App configuration screen.
 */
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { THEME } from '../constants/theme';
import { bridgeClient } from '../services/bridge_client';
import { callHandler, InferenceMode } from '../services/call_handler';

const MODES: { value: InferenceMode; label: string; desc: string }[] = [
  { value: 'auto', label: 'Auto', desc: 'Use laptop when available, else local AI' },
  { value: 'local', label: 'Local Only', desc: 'Always use on-device AI (offline)' },
  { value: 'bridge', label: 'Laptop Only', desc: 'Always use laptop Python Brain' },
];

export default function Settings() {
  const [bridgeUrl, setBridgeUrl] = useState(bridgeClient.baseUrl);
  const [selectedMode, setSelectedMode] = useState<InferenceMode>(callHandler.mode);
  const [testing, setTesting] = useState(false);

  const handleSaveUrl = useCallback(async () => {
    bridgeClient.baseUrl = bridgeUrl;
    await AsyncStorage.setItem('bridge_url', bridgeUrl);
    Alert.alert('Saved', 'Bridge URL updated.');
  }, [bridgeUrl]);

  const handleTestConnection = useCallback(async () => {
    setTesting(true);
    const ok = await bridgeClient.checkHealth();
    setTesting(false);
    if (ok) {
      Alert.alert('Connected', 'Laptop Brain is reachable!');
    } else {
      Alert.alert('Failed', 'Could not reach the laptop. Check the IP and make sure the server is running.');
    }
  }, []);

  const handleModeChange = useCallback(async (mode: InferenceMode) => {
    setSelectedMode(mode);
    callHandler.mode = mode;
    await AsyncStorage.setItem('inference_mode', mode);
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Inference Mode */}
        <Text style={styles.sectionTitle}>Inference Mode</Text>
        <View style={styles.modeGroup}>
          {MODES.map((m) => (
            <TouchableOpacity
              key={m.value}
              style={[
                styles.modeOption,
                selectedMode === m.value && styles.modeOptionActive,
              ]}
              onPress={() => handleModeChange(m.value)}
            >
              <View style={styles.modeRadio}>
                {selectedMode === m.value && <View style={styles.modeRadioInner} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modeLabel}>{m.label}</Text>
                <Text style={styles.modeDesc}>{m.desc}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Bridge URL */}
        <Text style={styles.sectionTitle}>Laptop Bridge URL</Text>
        <Text style={styles.sectionHint}>
          Your laptop's local IP + port 8000 (e.g. http://192.168.1.100:8000)
        </Text>
        <TextInput
          style={styles.input}
          value={bridgeUrl}
          onChangeText={setBridgeUrl}
          placeholder="http://192.168.1.100:8000"
          placeholderTextColor={THEME.colors.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
        />
        <View style={styles.btnRow}>
          <TouchableOpacity style={styles.btnSave} onPress={handleSaveUrl}>
            <Text style={styles.btnSaveText}>Save</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.btnTest}
            onPress={handleTestConnection}
            disabled={testing}
          >
            <Text style={styles.btnTestText}>
              {testing ? 'Testing...' : 'Test Connection'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* About */}
        <Text style={styles.sectionTitle}>About</Text>
        <View style={styles.aboutCard}>
          <Text style={styles.aboutText}>
            PAICA v1.0 — Personal AI Communication Agent{'\n'}
            On-device AI powered by llama.rn{'\n'}
            Built for Ahad
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.bg,
    paddingTop: 50,
    paddingHorizontal: THEME.spacing.lg,
  },
  title: {
    fontSize: THEME.font.size.xl,
    fontWeight: THEME.font.weight.bold,
    color: THEME.colors.text,
    marginBottom: THEME.spacing.lg,
  },
  scroll: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: THEME.font.size.sm,
    fontWeight: THEME.font.weight.semibold,
    color: THEME.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: THEME.spacing.sm,
    marginTop: THEME.spacing.lg,
  },
  sectionHint: {
    fontSize: THEME.font.size.xs,
    color: THEME.colors.textMuted,
    marginBottom: THEME.spacing.sm,
  },
  // Mode selector
  modeGroup: {
    gap: THEME.spacing.sm,
  },
  modeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: THEME.spacing.md,
    backgroundColor: THEME.colors.bgCard,
    padding: THEME.spacing.md,
    borderRadius: THEME.radius.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  modeOptionActive: {
    borderColor: THEME.colors.primary + '80',
    backgroundColor: THEME.colors.bgGlow,
  },
  modeRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: THEME.colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeRadioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: THEME.colors.primary,
  },
  modeLabel: {
    fontSize: THEME.font.size.md,
    fontWeight: THEME.font.weight.semibold,
    color: THEME.colors.text,
  },
  modeDesc: {
    fontSize: THEME.font.size.xs,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  // Input
  input: {
    backgroundColor: THEME.colors.bgCard,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.radius.md,
    padding: THEME.spacing.md,
    color: THEME.colors.text,
    fontSize: THEME.font.size.md,
  },
  btnRow: {
    flexDirection: 'row',
    gap: THEME.spacing.sm,
    marginTop: THEME.spacing.sm,
  },
  btnSave: {
    flex: 1,
    backgroundColor: THEME.colors.primary + '20',
    borderWidth: 1,
    borderColor: THEME.colors.primary + '50',
    padding: THEME.spacing.sm,
    borderRadius: THEME.radius.md,
    alignItems: 'center',
  },
  btnSaveText: {
    color: THEME.colors.primary,
    fontWeight: THEME.font.weight.semibold,
    fontSize: THEME.font.size.sm,
  },
  btnTest: {
    flex: 1,
    backgroundColor: THEME.colors.bgElevated,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    padding: THEME.spacing.sm,
    borderRadius: THEME.radius.md,
    alignItems: 'center',
  },
  btnTestText: {
    color: THEME.colors.textSecondary,
    fontWeight: THEME.font.weight.semibold,
    fontSize: THEME.font.size.sm,
  },
  // About
  aboutCard: {
    backgroundColor: THEME.colors.bgCard,
    borderRadius: THEME.radius.md,
    padding: THEME.spacing.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginBottom: THEME.spacing.xxl,
  },
  aboutText: {
    fontSize: THEME.font.size.sm,
    color: THEME.colors.textSecondary,
    lineHeight: 22,
  },
});
