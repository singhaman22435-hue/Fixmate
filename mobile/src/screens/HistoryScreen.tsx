import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, typography, touchTarget } from '../theme/colors';
import { History, Trash2, ChevronRight, RotateCcw } from 'lucide-react-native';
import { ApiService, MobileAnalysisResult } from '../services/api';
import { ResultCard } from '../components/ResultCard';

export function HistoryScreen() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedResult, setSelectedResult] = useState<MobileAnalysisResult | null>(null);

  const fetchHistory = async () => {
    try {
      const data = await ApiService.getHistory();
      setItems(data.items || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchHistory();
  };

  const handleDeleteItem = (id: string) => {
    Alert.alert('Delete Analysis', 'Are you sure you want to delete this solve record?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await ApiService.deleteHistoryItem(id);
          setItems((prev) => prev.filter((i) => i.id !== id));
        },
      },
    ]);
  };

  const handleWipeAll = () => {
    Alert.alert(
      'Wipe Local History',
      'This will permanently delete all records from your local database.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Wipe All',
          style: 'destructive',
          onPress: async () => {
            await ApiService.wipeAllHistory();
            setItems([]);
          },
        },
      ]
    );
  };

  const openDetail = (item: any) => {
    try {
      const payload = JSON.parse(item.resultJson);
      setSelectedResult({
        analysisId: item.id,
        intent: item.intent,
        inputType: item.inputType,
        title: item.title,
        summary: item.summary,
        confidence: item.confidence,
        riskLevel: item.riskLevel,
        extractedText: item.processedText || '',
        result: payload,
        aiModelUsed: item.aiModelUsed || 'local',
        fallbackUsed: item.aiModelUsed === 'deterministic_fallback',
      });
    } catch {
      Alert.alert('Parsing Error', 'Unable to parse analysis record payload.');
    }
  };

  if (selectedResult) {
    return (
      <ResultCard
        result={selectedResult}
        onReset={() => {
          setSelectedResult(null);
          fetchHistory();
        }}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>History</Text>
          <Text style={styles.subtitle}>Locally stored solve logs</Text>
        </View>

        {items.length > 0 && (
          <TouchableOpacity style={styles.wipeBtn} onPress={handleWipeAll}>
            <Trash2 size={16} color={colors.danger} />
            <Text style={styles.wipeBtnText}>Clear All</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <History size={40} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>No solves recorded yet</Text>
              <Text style={styles.emptySubtitle}>
                Analyses you perform on mobile or web will appear here.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => openDetail(item)}
            >
              <View style={styles.cardContent}>
                <View style={styles.cardHeader}>
                  <View style={styles.intentBadge}>
                    <Text style={styles.intentBadgeText}>
                      {item.intent.replace(/_/g, ' ')}
                    </Text>
                  </View>
                  <Text style={styles.dateText}>
                    {new Date(item.createdAt).toLocaleDateString()}
                  </Text>
                </View>

                <Text style={styles.cardTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.cardSummary} numberOfLines={2}>
                  {item.summary}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.deleteIcon}
                onPress={() => handleDeleteItem(item.id)}
              >
                <Trash2 size={16} color={colors.textMuted} />
              </TouchableOpacity>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  title: {
    ...typography.h2,
    color: colors.text,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  wipeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: colors.dangerLight,
    minHeight: touchTarget.minHeight,
  },
  wipeBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.danger,
  },
  listContent: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    minHeight: 72,
  },
  cardContent: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  intentBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  intentBadgeText: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '600',
  },
  dateText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  cardSummary: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  deleteIcon: {
    padding: spacing.sm,
    marginLeft: spacing.sm,
    minHeight: touchTarget.minHeight,
    minWidth: touchTarget.minWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  emptySubtitle: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
  },
});

