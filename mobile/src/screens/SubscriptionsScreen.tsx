import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  SafeAreaView,
} from 'react-native';
import { ApiService, MobileSubscriptionItem } from '../services/api';
import { colors } from '../theme/colors';
import {
  Repeat,
  Plus,
  Trash2,
  Calendar,
  CreditCard,
  ShieldCheck,
  X,
} from 'lucide-react-native';

export function SubscriptionsScreen() {
  const [subscriptions, setSubscriptions] = useState<MobileSubscriptionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Add modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [merchant, setMerchant] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('₹');
  const [frequency, setFrequency] = useState('monthly');
  const [saving, setSaving] = useState(false);

  const loadSubscriptions = useCallback(async () => {
    try {
      const items = await ApiService.getSubscriptions();
      setSubscriptions(items);
    } catch (e) {
      console.error('Failed to load subscriptions:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadSubscriptions();
  }, [loadSubscriptions]);

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'CANCELLED' : 'ACTIVE';
    setSubscriptions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: newStatus } : s))
    );
    try {
      await ApiService.toggleSubscription(id, currentStatus);
    } catch {
      loadSubscriptions();
    }
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert('Delete Subscription', `Remove ${name} from local tracking?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setSubscriptions((prev) => prev.filter((s) => s.id !== id));
          try {
            await ApiService.deleteSubscription(id);
          } catch {
            loadSubscriptions();
          }
        },
      },
    ]);
  };

  const handleCreate = async () => {
    if (!merchant.trim()) {
      Alert.alert('Error', 'Please enter a merchant or service name');
      return;
    }
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      Alert.alert('Error', 'Please enter a valid positive subscription amount');
      return;
    }

    setSaving(true);
    try {
      const created = await ApiService.createSubscription({
        merchant: merchant.trim(),
        amount: numAmount,
        currency,
        frequency,
      });
      setSubscriptions((prev) => [created, ...prev]);
      setIsAddModalOpen(false);
      setMerchant('');
      setAmount('');
    } catch (e: any) {
      Alert.alert('Failed to save subscription', e.message);
    } finally {
      setSaving(false);
    }
  };

  // Calculations
  const activeSubs = useMemo(
    () => subscriptions.filter((s) => s.status === 'ACTIVE'),
    [subscriptions]
  );

  const totalAnnualCost = useMemo(
    () => activeSubs.reduce((acc, s) => acc + (s.estimatedYearlyCost || 0), 0),
    [activeSubs]
  );

  const monthlyEquivalent = useMemo(() => {
    return activeSubs.reduce((acc, s) => {
      const freq = (s.frequency || 'monthly').toLowerCase();
      if (freq === 'yearly' || freq === 'annual') return acc + s.amount / 12;
      if (freq === 'quarterly') return acc + (s.amount * 4) / 12;
      if (freq === 'weekly') return acc + (s.amount * 52) / 12;
      return acc + s.amount;
    }, 0);
  }, [activeSubs]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Subscriptions</Text>
          <Text style={styles.subtitle}>
            {activeSubs.length} active recurring commitment{activeSubs.length === 1 ? '' : 's'}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setIsAddModalOpen(true)}
          activeOpacity={0.8}
        >
          <Plus size={16} color="#ffffff" />
          <Text style={styles.addButtonText}>Add</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Metric Cards */}
        <View style={styles.metricGrid}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Monthly Spend</Text>
            <Text style={styles.metricValue}>
              ₹{Math.round(monthlyEquivalent).toLocaleString()}
            </Text>
            <Text style={styles.metricSub}>Normalized monthly</Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Annual Total</Text>
            <Text style={[styles.metricValue, { color: colors.warning }]}>
              ₹{Math.round(totalAnnualCost).toLocaleString()}
            </Text>
            <Text style={styles.metricSub}>Total annual commitment</Text>
          </View>
        </View>

        {/* List Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>TRACKED SERVICES</Text>
          <View style={styles.privacyBadge}>
            <ShieldCheck size={12} color={colors.success} />
            <Text style={styles.privacyText}>Zero bank logins</Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading subscriptions...</Text>
          </View>
        ) : subscriptions.length === 0 ? (
          <View style={styles.emptyCard}>
            <Repeat size={44} color={colors.textSecondary} />
            <Text style={styles.emptyTitle}>Nothing tracked yet.</Text>
            <Text style={styles.emptySubtitle}>
              Tap &quot;Add&quot; above to track a recurring membership manually, or scan a statement on the Solve tab.
            </Text>
          </View>
        ) : (
          <View style={styles.listCard}>
            {subscriptions.map((sub, idx) => (
              <View
                key={sub.id}
                style={[
                  styles.subRow,
                  idx < subscriptions.length - 1 && styles.subRowBorder,
                  sub.status !== 'ACTIVE' && styles.subRowInactive,
                ]}
              >
                <View style={styles.subLeft}>
                  <Text style={styles.merchantName}>{sub.merchant}</Text>
                  <Text style={styles.subAmount}>
                    {sub.currency}{sub.amount} / {sub.frequency}
                  </Text>
                  <Text style={styles.subYearly}>
                    Yearly: {sub.currency}{Math.round(sub.estimatedYearlyCost || 0).toLocaleString()}
                  </Text>
                </View>

                <View style={styles.subRight}>
                  <TouchableOpacity
                    onPress={() => handleToggleStatus(sub.id, sub.status)}
                    style={[
                      styles.statusPill,
                      sub.status === 'ACTIVE'
                        ? styles.statusActive
                        : styles.statusCancelled,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusPillText,
                        sub.status === 'ACTIVE'
                          ? styles.statusActiveText
                          : styles.statusCancelledText,
                      ]}
                    >
                      {sub.status === 'ACTIVE' ? 'Active' : 'Cancelled'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handleDelete(sub.id, sub.merchant)}
                    style={styles.deleteButton}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Trash2 size={16} color="#cbd5e1" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Add Subscription Modal */}
      <Modal
        visible={isAddModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsAddModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Subscription</Text>
              <TouchableOpacity
                onPress={() => setIsAddModalOpen(false)}
                style={styles.modalCloseButton}
              >
                <X size={20} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.fieldLabel}>Service / Merchant *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Netflix, Gym, Google One"
                placeholderTextColor={colors.textSecondary}
                value={merchant}
                onChangeText={setMerchant}
              />

              <View style={styles.row}>
                <View style={[styles.col, { flex: 2 }]}>
                  <Text style={styles.fieldLabel}>Amount *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. 649"
                    keyboardType="numeric"
                    placeholderTextColor={colors.textSecondary}
                    value={amount}
                    onChangeText={setAmount}
                  />
                </View>

                <View style={[styles.col, { flex: 1 }]}>
                  <Text style={styles.fieldLabel}>Currency</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="₹"
                    placeholderTextColor={colors.textSecondary}
                    value={currency}
                    onChangeText={setCurrency}
                  />
                </View>
              </View>

              <Text style={styles.fieldLabel}>Billing Frequency</Text>
              <View style={styles.freqRow}>
                {['monthly', 'yearly', 'quarterly', 'weekly'].map((f) => (
                  <TouchableOpacity
                    key={f}
                    onPress={() => setFrequency(f)}
                    style={[
                      styles.freqChip,
                      frequency === f && styles.freqChipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.freqChipText,
                        frequency === f && styles.freqChipTextActive,
                      ]}
                    >
                      {f.charAt(0).toUpperCase() + f.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleCreate}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.submitButtonText}>Track Subscription</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  addButton: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    minHeight: 40,
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  metricGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 14,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: 4,
  },
  metricSub: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: colors.textSecondary,
  },
  privacyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  privacyText: {
    fontSize: 11,
    color: colors.success,
    fontWeight: '600',
  },
  listCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    overflow: 'hidden',
  },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  subRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  subRowInactive: {
    opacity: 0.6,
    backgroundColor: '#f8fafc',
  },
  subLeft: {
    flex: 1,
  },
  merchantName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  subAmount: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  subYearly: {
    fontSize: 11,
    color: colors.textPrimary,
    fontWeight: '600',
    marginTop: 2,
  },
  subRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    minHeight: 32,
    justifyContent: 'center',
  },
  statusPillText: {
    fontSize: 11,
  },
  statusActive: {
    backgroundColor: '#ecfdf5',
  },
  statusActiveText: {
    color: '#059669',
    fontSize: 11,
    fontWeight: '700',
  },
  statusCancelled: {
    backgroundColor: '#f1f5f9',
  },
  statusCancelledText: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '600',
  },
  deleteButton: {
    padding: 6,
    minHeight: 36,
    minWidth: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerContainer: {
    padding: 32,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 12,
    color: colors.textSecondary,
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 32,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 260,
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  modalCloseButton: {
    padding: 4,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.textPrimary,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  col: {
    flex: 1,
  },
  freqRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  freqChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    minHeight: 36,
    justifyContent: 'center',
  },
  freqChipActive: {
    backgroundColor: colors.primary,
  },
  freqChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  freqChipTextActive: {
    color: '#ffffff',
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 12,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});
