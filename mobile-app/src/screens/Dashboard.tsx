/**
 * Dashboard.tsx — Main screen of the PAICA mobile app.
 *
 * Displays AI status, call controls, and a live log feed.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
  StatusBar,
} from 'react-native';
import { THEME } from '../constants/theme';
import { aiEngine, AIStatus } from '../services/ai_engine';
import { callHandler, CallState, CallLog } from '../services/call_handler';
import { PERSONAS } from '../constants/personas';

const { width } = Dimensions.get('window');

// --- Pulsing Dot ---
const PulsingDot: React.FC<{ color: string; active: boolean }> = ({ color, active }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (active) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(scale, { toValue: 1.6, duration: 800, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
          ]),
          Animated.parallel([
            Animated.timing(scale, { toValue: 1, duration: 800, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
          ]),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      scale.setValue(1);
      opacity.setValue(1);
    }
  }, [active]);

  return (
    <View style={{ width: 12, height: 12, justifyContent: 'center', alignItems: 'center' }}>
      <Animated.View
        style={{
          width: 10,
          height: 10,
          borderRadius: 5,
          backgroundColor: color,
          transform: [{ scale }],
          opacity,
        }}
      />
    </View>
  );
};

// --- Status Badge ---
const StatusBadge: React.FC<{ label: string; color: string; active?: boolean }> = ({
  label,
  color,
  active = false,
}) => (
  <View style={[styles.badge, { borderColor: color + '40' }]}>
    <PulsingDot color={color} active={active} />
    <Text style={[styles.badgeText, { color }]}>{label}</Text>
  </View>
);

// --- Log Entry ---
const LogEntry: React.FC<{ log: CallLog }> = ({ log }) => {
  const time = new Date(log.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const roleColor =
    log.role === 'caller'
      ? THEME.colors.warning
      : log.role === 'agent'
      ? THEME.colors.accent
      : THEME.colors.textMuted;

  const roleLabel =
    log.role === 'caller' ? 'CALLER' : log.role === 'agent' ? 'AGENT' : 'SYS';

  return (
    <View style={styles.logEntry}>
      <View style={styles.logHeader}>
        <Text style={[styles.logRole, { color: roleColor }]}>{roleLabel}</Text>
        <Text style={styles.logTime}>{time}</Text>
      </View>
      <Text style={styles.logText}>{log.text}</Text>
    </View>
  );
};

// =============================================================================

export default function Dashboard() {
  const [aiStatus, setAiStatus] = useState<AIStatus>(aiEngine.status);
  const [callState, setCallState] = useState<CallState>(callHandler.state);
  const [logs, setLogs] = useState<CallLog[]>([]);
  const [personaId, setPersonaId] = useState<string>(callHandler.personaId);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    const unsub1 = aiEngine.onStatusChange((s) => setAiStatus(s));
    const unsub2 = callHandler.onStateChange((s) => setCallState(s));
    const unsub3 = callHandler.onLog(() => setLogs(callHandler.logs));
    return () => {
      unsub1();
      unsub2();
      unsub3();
    };
  }, []);

  useEffect(() => {
    // Auto-scroll to bottom
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, [logs]);

  const handleCallToggle = useCallback(async () => {
    if (callState === 'idle' || callState === 'ended') {
      callHandler.reset();
      await callHandler.startCall();
    } else {
      await callHandler.endCall();
    }
  }, [callState]);

  const togglePersona = useCallback(() => {
    const currentIndex = PERSONAS.findIndex((p) => p.id === personaId);
    const nextIndex = (currentIndex + 1) % PERSONAS.length;
    const nextPersona = PERSONAS[nextIndex];
    setPersonaId(nextPersona.id);
    callHandler.personaId = nextPersona.id;
  }, [personaId]);

  const isCallActive = !['idle', 'ended'].includes(callState);

  const aiStatusColor =
    aiStatus === 'ready'
      ? THEME.colors.accent
      : aiStatus === 'thinking'
      ? THEME.colors.warning
      : aiStatus === 'error'
      ? THEME.colors.danger
      : THEME.colors.textMuted;

  const callStateColor =
    callState === 'active'
      ? THEME.colors.accent
      : callState === 'processing' || callState === 'speaking'
      ? THEME.colors.warning
      : callState === 'ringing'
      ? THEME.colors.primary
      : THEME.colors.textMuted;

  const currentPersonaName = PERSONAS.find((p) => p.id === personaId)?.name || 'Unknown';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={THEME.colors.bg} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>PAICA</Text>
        <Text style={styles.subtitle}>Personal AI Call Agent</Text>
      </View>

      {/* Status Cards */}
      <View style={styles.statusRow}>
        <View style={styles.statusCard}>
          <Text style={styles.statusLabel}>AI Engine</Text>
          <StatusBadge
            label={aiStatus.toUpperCase()}
            color={aiStatusColor}
            active={aiStatus === 'thinking' || aiStatus === 'loading'}
          />
        </View>
        <View style={styles.statusCard}>
          <Text style={styles.statusLabel}>Call</Text>
          <StatusBadge
            label={callState.toUpperCase()}
            color={callStateColor}
            active={callState === 'active' || callState === 'processing'}
          />
        </View>
      </View>

      {/* Persona Selector */}
      <TouchableOpacity
        style={styles.personaCard}
        onPress={togglePersona}
        disabled={isCallActive}
        activeOpacity={0.7}
      >
        <Text style={styles.statusLabel}>Active Persona</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={styles.personaText}>🎭 {currentPersonaName}</Text>
          {!isCallActive && <Text style={styles.tapToChange}>Tap to change</Text>}
        </View>
      </TouchableOpacity>

      {/* Call Button */}
      <TouchableOpacity
        style={[
          styles.callButton,
          isCallActive ? styles.callButtonEnd : styles.callButtonStart,
        ]}
        onPress={handleCallToggle}
        activeOpacity={0.8}
      >
        <Text style={styles.callButtonIcon}>{isCallActive ? '✕' : '📞'}</Text>
        <Text style={styles.callButtonText}>
          {isCallActive ? 'End Call' : 'Start Demo Call'}
        </Text>
      </TouchableOpacity>

      {/* Live Log Feed */}
      <View style={styles.logContainer}>
        <View style={styles.logTitleRow}>
          <Text style={styles.logTitle}>Live Activity</Text>
          {logs.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                callHandler.reset();
                setLogs([]);
              }}
            >
              <Text style={styles.clearBtn}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>
        <ScrollView
          ref={scrollRef}
          style={styles.logScroll}
          contentContainerStyle={styles.logContent}
          showsVerticalScrollIndicator={false}
        >
          {logs.length === 0 ? (
            <Text style={styles.emptyLog}>
              Press "Start Demo Call" to test the AI agent
            </Text>
          ) : (
            logs.map((log, i) => <LogEntry key={i} log={log} />)
          )}
        </ScrollView>
      </View>

      {/* Mode Indicator */}
      <View style={styles.modeBar}>
        <Text style={styles.modeText}>
          Mode: {callHandler.mode.toUpperCase()} | Inference:{' '}
          {aiStatus === 'ready' ? 'Local AI Ready' : aiStatus}
        </Text>
      </View>
    </View>
  );
}

// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.bg,
    paddingTop: 50,
  },
  // Header
  header: {
    paddingHorizontal: THEME.spacing.lg,
    marginBottom: THEME.spacing.lg,
  },
  title: {
    fontSize: THEME.font.size.xxl,
    fontWeight: THEME.font.weight.bold,
    color: THEME.colors.primary,
    letterSpacing: 3,
  },
  subtitle: {
    fontSize: THEME.font.size.sm,
    color: THEME.colors.textSecondary,
    marginTop: 2,
    letterSpacing: 1,
  },
  // Status Row
  statusRow: {
    flexDirection: 'row',
    paddingHorizontal: THEME.spacing.lg,
    gap: THEME.spacing.md,
    marginBottom: THEME.spacing.lg,
  },
  statusCard: {
    flex: 1,
    backgroundColor: THEME.colors.bgCard,
    borderRadius: THEME.radius.lg,
    padding: THEME.spacing.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  statusLabel: {
    fontSize: THEME.font.size.xs,
    fontWeight: THEME.font.weight.semibold,
    color: THEME.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: THEME.spacing.sm,
  },
  // Badge
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: THEME.radius.full,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: THEME.font.size.xs,
    fontWeight: THEME.font.weight.bold,
    letterSpacing: 0.5,
  },
  // Persona Selector
  personaCard: {
    backgroundColor: THEME.colors.bgCard,
    marginHorizontal: THEME.spacing.lg,
    padding: THEME.spacing.md,
    borderRadius: THEME.radius.lg,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginBottom: THEME.spacing.lg,
  },
  personaText: {
    fontSize: THEME.font.size.lg,
    fontWeight: THEME.font.weight.bold,
    color: THEME.colors.text,
  },
  tapToChange: {
    fontSize: THEME.font.size.xs,
    color: THEME.colors.textMuted,
    fontStyle: 'italic',
  },
  // Call Button
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: THEME.spacing.lg,
    paddingVertical: THEME.spacing.md,
    borderRadius: THEME.radius.lg,
    gap: THEME.spacing.sm,
    marginBottom: THEME.spacing.lg,
  },
  callButtonStart: {
    backgroundColor: THEME.colors.accent + '20',
    borderWidth: 1,
    borderColor: THEME.colors.accent + '60',
  },
  callButtonEnd: {
    backgroundColor: THEME.colors.danger + '20',
    borderWidth: 1,
    borderColor: THEME.colors.danger + '60',
  },
  callButtonIcon: {
    fontSize: 20,
  },
  callButtonText: {
    fontSize: THEME.font.size.md,
    fontWeight: THEME.font.weight.semibold,
    color: THEME.colors.text,
  },
  // Log
  logContainer: {
    flex: 1,
    marginHorizontal: THEME.spacing.lg,
    backgroundColor: THEME.colors.bgCard,
    borderRadius: THEME.radius.lg,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    overflow: 'hidden',
  },
  logTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: THEME.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  logTitle: {
    fontSize: THEME.font.size.sm,
    fontWeight: THEME.font.weight.semibold,
    color: THEME.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  clearBtn: {
    fontSize: THEME.font.size.xs,
    color: THEME.colors.danger,
    fontWeight: THEME.font.weight.semibold,
  },
  logScroll: {
    flex: 1,
  },
  logContent: {
    padding: THEME.spacing.sm,
    gap: 2,
  },
  emptyLog: {
    color: THEME.colors.textMuted,
    fontSize: THEME.font.size.sm,
    textAlign: 'center',
    marginTop: THEME.spacing.xxl,
  },
  logEntry: {
    paddingVertical: 6,
    paddingHorizontal: THEME.spacing.sm,
    borderRadius: THEME.radius.sm,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  logRole: {
    fontSize: THEME.font.size.xs,
    fontWeight: THEME.font.weight.bold,
    letterSpacing: 0.5,
  },
  logTime: {
    fontSize: THEME.font.size.xs,
    color: THEME.colors.textMuted,
  },
  logText: {
    fontSize: THEME.font.size.sm,
    color: THEME.colors.text,
    lineHeight: 20,
  },
  // Mode Bar
  modeBar: {
    paddingVertical: THEME.spacing.sm,
    paddingHorizontal: THEME.spacing.lg,
    marginBottom: THEME.spacing.sm,
  },
  modeText: {
    fontSize: THEME.font.size.xs,
    color: THEME.colors.textMuted,
    textAlign: 'center',
  },
});
