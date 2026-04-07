/**
 * ModelManager.tsx — Download and manage on-device AI models.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { THEME } from '../constants/theme';
import { MODELS, ModelDefinition } from '../constants/models';
import { aiEngine, AIStatus, DownloadProgress } from '../services/ai_engine';

const ModelCard: React.FC<{
  model: ModelDefinition;
  downloaded: boolean;
  isActive: boolean;
  aiStatus: AIStatus;
  progress: DownloadProgress | null;
  onDownload: () => void;
  onDelete: () => void;
  onLoad: () => void;
}> = ({ model, downloaded, isActive, aiStatus, progress, onDownload, onDelete, onLoad }) => {
  const isDownloading = aiStatus === 'downloading' && progress !== null;
  const isLoading = aiStatus === 'loading' && isActive;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <View style={styles.nameRow}>
            <Text style={styles.modelName}>{model.name}</Text>
            {model.recommended && (
              <View style={styles.recBadge}>
                <Text style={styles.recText}>RECOMMENDED</Text>
              </View>
            )}
          </View>
          <Text style={styles.modelDesc}>{model.description}</Text>
        </View>
        <Text style={styles.sizeLabel}>{model.sizeLabel}</Text>
      </View>

      {/* Progress Bar */}
      {isDownloading && progress && (
        <View style={styles.progressContainer}>
          <View style={styles.progressBg}>
            <View style={[styles.progressFill, { width: `${progress.percent}%` }]} />
          </View>
          <Text style={styles.progressText}>
            {progress.percent}% ({Math.round(progress.writtenBytes / 1024 / 1024)} MB)
          </Text>
        </View>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        {!downloaded ? (
          <TouchableOpacity
            style={[styles.btn, styles.btnPrimary]}
            onPress={onDownload}
            disabled={isDownloading}
          >
            <Text style={styles.btnText}>
              {isDownloading ? 'Downloading...' : 'Download'}
            </Text>
          </TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity
              style={[
                styles.btn,
                isActive ? styles.btnActive : styles.btnSecondary,
              ]}
              onPress={onLoad}
              disabled={isActive || isLoading}
            >
              <Text style={styles.btnText}>
                {isActive ? 'Active' : isLoading ? 'Loading...' : 'Load'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, styles.btnDanger]}
              onPress={onDelete}
              disabled={isActive}
            >
              <Text style={styles.btnTextDanger}>Delete</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
};

// =============================================================================

export default function ModelManager() {
  const [downloadedMap, setDownloadedMap] = useState<Record<string, boolean>>({});
  const [aiStatus, setAiStatus] = useState<AIStatus>(aiEngine.status);
  const [progress, setProgress] = useState<DownloadProgress | null>(null);
  const [activeModel, setActiveModel] = useState<string | null>(null);

  const refreshDownloaded = useCallback(async () => {
    const map: Record<string, boolean> = {};
    for (const m of MODELS) {
      map[m.id] = await aiEngine.isModelDownloaded(m.id);
    }
    setDownloadedMap(map);
  }, []);

  useEffect(() => {
    refreshDownloaded();
    const unsub1 = aiEngine.onStatusChange((s) => setAiStatus(s));
    const unsub2 = aiEngine.onDownloadProgress((p) => setProgress(p));
    return () => {
      unsub1();
      unsub2();
    };
  }, []);

  const handleDownload = useCallback(async (id: string) => {
    try {
      await aiEngine.downloadModel(id);
      await refreshDownloaded();
    } catch (err: any) {
      Alert.alert('Download Failed', err.message);
    }
    setProgress(null);
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    Alert.alert('Delete Model', 'Are you sure? You will need to re-download.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await aiEngine.deleteModel(id);
          if (activeModel === id) setActiveModel(null);
          await refreshDownloaded();
        },
      },
    ]);
  }, [activeModel]);

  const handleLoad = useCallback(async (id: string) => {
    try {
      await aiEngine.load(id);
      setActiveModel(id);
    } catch (err: any) {
      Alert.alert('Load Failed', err.message);
    }
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>AI Models</Text>
      <Text style={styles.subtitle}>
        Download a model for on-device AI inference. Smaller = faster but less smart.
      </Text>

      <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
        {MODELS.map((model) => (
          <ModelCard
            key={model.id}
            model={model}
            downloaded={!!downloadedMap[model.id]}
            isActive={activeModel === model.id}
            aiStatus={aiStatus}
            progress={progress}
            onDownload={() => handleDownload(model.id)}
            onDelete={() => handleDelete(model.id)}
            onLoad={() => handleLoad(model.id)}
          />
        ))}
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
    marginBottom: 4,
  },
  subtitle: {
    fontSize: THEME.font.size.sm,
    color: THEME.colors.textSecondary,
    marginBottom: THEME.spacing.lg,
    lineHeight: 20,
  },
  list: {
    flex: 1,
  },
  card: {
    backgroundColor: THEME.colors.bgCard,
    borderRadius: THEME.radius.lg,
    padding: THEME.spacing.md,
    marginBottom: THEME.spacing.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: THEME.spacing.sm,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: THEME.spacing.sm,
    marginBottom: 4,
  },
  modelName: {
    fontSize: THEME.font.size.lg,
    fontWeight: THEME.font.weight.semibold,
    color: THEME.colors.text,
  },
  recBadge: {
    backgroundColor: THEME.colors.accent + '20',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: THEME.radius.full,
    borderWidth: 1,
    borderColor: THEME.colors.accent + '40',
  },
  recText: {
    fontSize: 9,
    fontWeight: THEME.font.weight.bold,
    color: THEME.colors.accent,
    letterSpacing: 0.5,
  },
  modelDesc: {
    fontSize: THEME.font.size.sm,
    color: THEME.colors.textSecondary,
  },
  sizeLabel: {
    fontSize: THEME.font.size.sm,
    color: THEME.colors.textMuted,
    fontWeight: THEME.font.weight.medium,
  },
  // Progress
  progressContainer: {
    marginBottom: THEME.spacing.sm,
  },
  progressBg: {
    height: 6,
    backgroundColor: THEME.colors.bgElevated,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: THEME.colors.primary,
    borderRadius: 3,
  },
  progressText: {
    fontSize: THEME.font.size.xs,
    color: THEME.colors.textMuted,
  },
  // Actions
  actions: {
    flexDirection: 'row',
    gap: THEME.spacing.sm,
  },
  btn: {
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: THEME.spacing.sm,
    borderRadius: THEME.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimary: {
    backgroundColor: THEME.colors.primary + '20',
    borderWidth: 1,
    borderColor: THEME.colors.primary + '50',
    flex: 1,
  },
  btnSecondary: {
    backgroundColor: THEME.colors.bgElevated,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    flex: 1,
  },
  btnActive: {
    backgroundColor: THEME.colors.accent + '20',
    borderWidth: 1,
    borderColor: THEME.colors.accent + '50',
    flex: 1,
  },
  btnDanger: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: THEME.colors.danger + '30',
  },
  btnText: {
    fontSize: THEME.font.size.sm,
    fontWeight: THEME.font.weight.semibold,
    color: THEME.colors.text,
  },
  btnTextDanger: {
    fontSize: THEME.font.size.sm,
    fontWeight: THEME.font.weight.semibold,
    color: THEME.colors.danger,
  },
});
