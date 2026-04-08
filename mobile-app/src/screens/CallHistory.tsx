import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { THEME } from '../constants/theme';
import { PERSONAS } from '../constants/personas';
import { historyService, PastCall } from '../services/history_service';
import { CallLog } from '../services/call_handler';

// --- Single Log Entry ---
const LogEntryView: React.FC<{ log: CallLog }> = ({ log }) => {
  const time = new Date(log.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  const isAgent = log.role === 'agent';
  const isSystem = log.role === 'system';

  const roleColor = isAgent
    ? THEME.colors.accent
    : isSystem
    ? THEME.colors.textMuted
    : THEME.colors.primary;

  const roleLabel = isAgent ? 'AGENT' : isSystem ? 'SYS' : 'CALLER';

  return (
    <View style={styles.logEntry}>
      <View style={styles.logHeader}>
        <Text style={[styles.logRole, { color: roleColor }]}>{roleLabel}</Text>
        <Text style={styles.logTime}>{time}</Text>
      </View>
      <Text style={[styles.logText, isSystem && { color: THEME.colors.textMuted, fontStyle: 'italic' }]}>
        {log.text}
      </Text>
    </View>
  );
};

// --- Call Card ---
const CallHistoryCard: React.FC<{ call: PastCall; onPress: () => void; isExpanded: boolean }> = ({
  call,
  onPress,
  isExpanded,
}) => {
  const dateStr = new Date(call.timestamp).toLocaleDateString();
  const timeStr = new Date(call.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const personaName = PERSONAS.find(p => p.id === call.personaId)?.name || 'Unknown';
  
  // Count only speaking turns
  const turnCount = call.logs.filter(l => l.role === 'agent' || l.role === 'caller').length;

  return (
    <View style={styles.cardContainer}>
      <TouchableOpacity style={styles.cardHeader} onPress={onPress} activeOpacity={0.7}>
        <View>
          <Text style={styles.cardTitle}>{dateStr} at {timeStr}</Text>
          <Text style={styles.cardSubtitle}>🎭 Persona: {personaName} • {turnCount} turns</Text>
        </View>
        <Text style={styles.expandIcon}>{isExpanded ? '▲' : '▼'}</Text>
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.cardBody}>
          {call.logs.map((log, index) => (
            <LogEntryView key={index} log={log} />
          ))}
        </View>
      )}
    </View>
  );
};

export default function CallHistory() {
  const [history, setHistory] = useState<PastCall[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    const data = await historyService.getHistory();
    setHistory(data);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [loadHistory])
  );

  const clearAll = async () => {
    await historyService.clearHistory();
    setHistory([]);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={THEME.colors.bg} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>History</Text>
        <Text style={styles.subtitle}>Past Calls & Transcripts</Text>
      </View>

      {history.length > 0 && (
        <TouchableOpacity style={styles.clearBtn} onPress={clearAll}>
          <Text style={styles.clearBtnText}>Clear All</Text>
        </TouchableOpacity>
      )}

      {history.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>📭</Text>
          <Text style={styles.emptyText}>No past calls recorded yet.</Text>
        </View>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <CallHistoryCard
              call={item}
              isExpanded={expandedId === item.id}
              onPress={() => setExpandedId(expandedId === item.id ? null : item.id)}
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.bg,
    paddingTop: 50,
  },
  header: {
    paddingHorizontal: THEME.spacing.lg,
    marginBottom: THEME.spacing.md,
  },
  title: {
    fontSize: THEME.font.size.xxl,
    fontWeight: THEME.font.weight.bold,
    color: THEME.colors.primary,
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: THEME.font.size.sm,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  clearBtn: {
    alignSelf: 'flex-end',
    marginHorizontal: THEME.spacing.lg,
    marginBottom: THEME.spacing.sm,
    padding: 6,
  },
  clearBtnText: {
    color: THEME.colors.danger,
    fontSize: THEME.font.size.sm,
    fontWeight: THEME.font.weight.semibold,
  },
  listContent: {
    paddingHorizontal: THEME.spacing.lg,
    paddingBottom: THEME.spacing.xxl,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: THEME.spacing.md,
  },
  emptyText: {
    color: THEME.colors.textMuted,
    fontSize: THEME.font.size.md,
  },
  cardContainer: {
    backgroundColor: THEME.colors.bgCard,
    borderRadius: THEME.radius.lg,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginBottom: THEME.spacing.md,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: THEME.spacing.md,
  },
  cardTitle: {
    fontSize: THEME.font.size.md,
    fontWeight: THEME.font.weight.bold,
    color: THEME.colors.text,
  },
  cardSubtitle: {
    fontSize: THEME.font.size.xs,
    color: THEME.colors.textMuted,
    marginTop: 4,
  },
  expandIcon: {
    color: THEME.colors.textMuted,
    fontSize: 18,
  },
  cardBody: {
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
    padding: THEME.spacing.sm,
    backgroundColor: '#1E1E1E',
  },
  logEntry: {
    marginBottom: THEME.spacing.sm,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  logRole: {
    fontSize: 10,
    fontWeight: THEME.font.weight.bold,
  },
  logTime: {
    fontSize: 10,
    color: THEME.colors.textMuted,
  },
  logText: {
    fontSize: THEME.font.size.sm,
    color: THEME.colors.text,
    lineHeight: 20,
  },
});
