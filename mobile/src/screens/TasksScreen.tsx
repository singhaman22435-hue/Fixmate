import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { ApiService, MobileTaskItem } from '../services/api';
import { colors } from '../theme/colors';
import {
  CheckSquare,
  Square,
  Plus,
  Trash2,
  Calendar,
  Clock,
  User,
  X,
  Filter,
} from 'lucide-react-native';

export function TasksScreen() {
  const [tasks, setTasks] = useState<MobileTaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'COMPLETED'>('ALL');

  // Add Task Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('Today');
  const [time, setTime] = useState('');
  const [person, setPerson] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [saving, setSaving] = useState(false);

  const loadTasks = useCallback(async () => {
    try {
      const items = await ApiService.getTasks();
      setTasks(items);
    } catch (e) {
      console.error('Failed to load tasks:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const onRefresh = () => {
    setRefreshing(true);
    loadTasks();
  };

  const handleToggle = async (id: string, currentCompleted: boolean) => {
    const updated = !currentCompleted;
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: updated } : t))
    );
    try {
      await ApiService.toggleTask(id, updated);
    } catch {
      // rollback if failed
      loadTasks();
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete Task', 'Are you sure you want to delete this action item?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setTasks((prev) => prev.filter((t) => t.id !== id));
          try {
            await ApiService.deleteTask(id);
          } catch {
            loadTasks();
          }
        },
      },
    ]);
  };

  const handleClearCompleted = () => {
    Alert.alert(
      'Clear Completed',
      'Remove all completed tasks from your local checklist?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            setTasks((prev) => prev.filter((t) => !t.completed));
            try {
              await ApiService.clearCompletedTasks();
            } catch {
              loadTasks();
            }
          },
        },
      ]
    );
  };

  const handleCreateTask = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a task title');
      return;
    }

    setSaving(true);
    try {
      const created = await ApiService.createTask({
        title: title.trim(),
        dueDate: dueDate.trim() || undefined,
        time: time.trim() || undefined,
        person: person.trim() || undefined,
        priority,
      });
      setTasks((prev) => [created, ...prev]);
      setIsAddModalOpen(false);
      setTitle('');
      setTime('');
      setPerson('');
    } catch (e: any) {
      Alert.alert('Failed to create task', e.message);
    } finally {
      setSaving(false);
    }
  };

  // Grouping
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const tomorrowStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }, []);

  const categorize = (t: MobileTaskItem) => {
    if (t.completed) return 'COMPLETED';
    if (!t.dueDate) return 'LATER';
    const due = t.dueDate.toLowerCase().trim();
    if (due === 'today' || due.startsWith(todayStr)) return 'TODAY';
    if (due === 'tomorrow' || due.startsWith(tomorrowStr)) return 'TOMORROW';
    return 'LATER';
  };

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      if (filter === 'PENDING') return !t.completed;
      if (filter === 'COMPLETED') return t.completed;
      return true;
    });
  }, [tasks, filter]);

  const groups = useMemo(() => {
    const today: MobileTaskItem[] = [];
    const tomorrow: MobileTaskItem[] = [];
    const later: MobileTaskItem[] = [];
    const completed: MobileTaskItem[] = [];

    filtered.forEach((t) => {
      const cat = categorize(t);
      if (cat === 'COMPLETED') completed.push(t);
      else if (cat === 'TODAY') today.push(t);
      else if (cat === 'TOMORROW') tomorrow.push(t);
      else later.push(t);
    });

    return [
      { title: 'TODAY', data: today },
      { title: 'TOMORROW', data: tomorrow },
      { title: 'LATER', data: later },
      { title: 'COMPLETED', data: completed },
    ].filter((g) => g.data.length > 0);
  }, [filtered]);

  const pendingCount = tasks.filter((t) => !t.completed).length;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Tasks &amp; Action Items</Text>
          <Text style={styles.subtitle}>
            {pendingCount} pending task{pendingCount === 1 ? '' : 's'} in SQLite
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

      {/* Filter Chips */}
      <View style={styles.filterRow}>
        {(['ALL', 'PENDING', 'COMPLETED'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => setFilter(tab)}
            style={[
              styles.filterChip,
              filter === tab && styles.filterChipActive,
            ]}
          >
            <Text
              style={[
                styles.filterChipText,
                filter === tab && styles.filterChipTextActive,
              ]}
            >
              {tab === 'ALL' ? 'All' : tab === 'PENDING' ? 'Pending' : 'Completed'}
            </Text>
          </TouchableOpacity>
        ))}

        {tasks.some((t) => t.completed) && (
          <TouchableOpacity
            onPress={handleClearCompleted}
            style={styles.clearButton}
          >
            <Text style={styles.clearButtonText}>Clear completed</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading tasks from SQLite...</Text>
        </View>
      ) : groups.length === 0 ? (
        <View style={styles.emptyContainer}>
          <CheckSquare size={48} color={colors.textSecondary} />
          <Text style={styles.emptyTitle}>No tasks found</Text>
          <Text style={styles.emptySubtitle}>
            Tap &quot;Add&quot; above to create a task, or dictate a voice note from the Solve tab.
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          {groups.map((group) => (
            <View key={group.title} style={styles.groupContainer}>
              <View style={styles.groupHeader}>
                <Text style={styles.groupTitle}>{group.title}</Text>
                <View style={styles.groupBadge}>
                  <Text style={styles.groupBadgeText}>{group.data.length}</Text>
                </View>
              </View>

              <View style={styles.groupCard}>
                {group.data.map((item, idx) => (
                  <View
                    key={item.id}
                    style={[
                      styles.taskRow,
                      idx < group.data.length - 1 && styles.taskRowBorder,
                      item.completed && styles.taskRowCompleted,
                    ]}
                  >
                    <TouchableOpacity
                      onPress={() => handleToggle(item.id, item.completed)}
                      style={styles.checkButton}
                      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    >
                      {item.completed ? (
                        <CheckSquare size={22} color={colors.success} />
                      ) : (
                        <Square size={22} color={colors.textSecondary} />
                      )}
                    </TouchableOpacity>

                    <View style={styles.taskContent}>
                      <Text
                        style={[
                          styles.taskTitle,
                          item.completed && styles.taskTitleCompleted,
                        ]}
                      >
                        {item.title}
                      </Text>

                      <View style={styles.taskMetaRow}>
                        {item.dueDate && (
                          <View style={styles.metaBadge}>
                            <Calendar size={11} color={colors.primary} />
                            <Text style={styles.metaBadgeTextPrimary}>
                              {item.dueDate}
                            </Text>
                          </View>
                        )}
                        {item.time && (
                          <View style={styles.metaBadge}>
                            <Clock size={11} color={colors.textSecondary} />
                            <Text style={styles.metaBadgeText}>{item.time}</Text>
                          </View>
                        )}
                        {item.person && (
                          <View style={styles.metaBadge}>
                            <User size={11} color={colors.textSecondary} />
                            <Text style={styles.metaBadgeText}>{item.person}</Text>
                          </View>
                        )}
                        {item.priority === 'HIGH' && (
                          <View style={[styles.metaBadge, styles.highBadge]}>
                            <Text style={styles.highBadgeText}>High</Text>
                          </View>
                        )}
                      </View>
                    </View>

                    <TouchableOpacity
                      onPress={() => handleDelete(item.id)}
                      style={styles.deleteButton}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Trash2 size={16} color="#cbd5e1" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Add Task Modal */}
      <Modal
        visible={isAddModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsAddModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Action Item</Text>
              <TouchableOpacity
                onPress={() => setIsAddModalOpen(false)}
                style={styles.modalCloseButton}
              >
                <X size={20} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.fieldLabel}>Task Title *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Call Rahul to review quotation"
                placeholderTextColor={colors.textSecondary}
                value={title}
                onChangeText={setTitle}
              />

              <View style={styles.row}>
                <View style={styles.col}>
                  <Text style={styles.fieldLabel}>Due Date</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Today / Tomorrow"
                    placeholderTextColor={colors.textSecondary}
                    value={dueDate}
                    onChangeText={setDueDate}
                  />
                </View>
                <View style={styles.col}>
                  <Text style={styles.fieldLabel}>Time</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. 5:00 PM"
                    placeholderTextColor={colors.textSecondary}
                    value={time}
                    onChangeText={setTime}
                  />
                </View>
              </View>

              <View style={styles.row}>
                <View style={styles.col}>
                  <Text style={styles.fieldLabel}>Assignee</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Rahul"
                    placeholderTextColor={colors.textSecondary}
                    value={person}
                    onChangeText={setPerson}
                  />
                </View>
                <View style={styles.col}>
                  <Text style={styles.fieldLabel}>Priority</Text>
                  <View style={styles.prioritySelector}>
                    {['LOW', 'MEDIUM', 'HIGH'].map((p) => (
                      <TouchableOpacity
                        key={p}
                        onPress={() => setPriority(p)}
                        style={[
                          styles.priorityOption,
                          priority === p && styles.priorityOptionActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.priorityOptionText,
                            priority === p && styles.priorityOptionTextActive,
                          ]}
                        >
                          {p[0]}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleCreateTask}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.submitButtonText}>Save Task to Checklist</Text>
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
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#f1f5f9',
    minHeight: 32,
    justifyContent: 'center',
  },
  filterChipActive: {
    backgroundColor: colors.primary,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  filterChipTextActive: {
    color: '#ffffff',
  },
  clearButton: {
    marginLeft: 'auto',
    paddingVertical: 6,
  },
  clearButtonText: {
    fontSize: 12,
    color: colors.danger,
    fontWeight: '600',
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  groupContainer: {
    gap: 6,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  groupTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: colors.textSecondary,
  },
  groupBadge: {
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
  },
  groupBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  groupCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    overflow: 'hidden',
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    gap: 12,
  },
  taskRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  taskRowCompleted: {
    opacity: 0.6,
    backgroundColor: '#f8fafc',
  },
  checkButton: {
    marginTop: 2,
    minHeight: 36,
    minWidth: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskContent: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    lineHeight: 19,
  },
  taskTitleCompleted: {
    textDecorationLine: 'line-through',
    color: colors.textSecondary,
  },
  taskMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  metaBadgeText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  metaBadgeTextPrimary: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '600',
  },
  highBadge: {
    backgroundColor: '#fef2f2',
  },
  highBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.danger,
  },
  deleteButton: {
    padding: 6,
    minHeight: 36,
    minWidth: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: colors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 16,
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
  prioritySelector: {
    flexDirection: 'row',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    overflow: 'hidden',
    height: 42,
  },
  priorityOption: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },
  priorityOptionActive: {
    backgroundColor: colors.primary,
  },
  priorityOptionText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  priorityOptionTextActive: {
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

