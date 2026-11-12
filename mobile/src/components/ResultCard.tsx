import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Share,
  Platform,
} from 'react-native';
import { colors, spacing, typography, touchTarget } from '../theme/colors';
import {
  Wrench,
  Receipt,
  ShieldAlert,
  ShoppingCart,
  Repeat,
  CheckSquare,
  Square,
  AlertTriangle,
  Terminal,
  Copy,
  Check,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  ThumbsUp,
  ThumbsDown,
  Sparkles,
  Share2,
  Calendar,
  Clock,
  Info,
} from 'lucide-react-native';
import { MobileAnalysisResult, ApiService } from '../services/api';
import { useSettings } from '../context/SettingsContext';

export function ResultCard({
  result,
  onReset,
}: {
  result: MobileAnalysisResult;
  onReset: () => void;
}) {
  const { selectedLanguage } = useSettings();
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [tasks, setTasks] = useState<any[]>(
    result.result?.type === 'VOICE_TASK_EXTRACTION' ? result.result.data?.tasks || [] : []
  );
  const [tasksSaved, setTasksSaved] = useState(false);
  const [savingTasks, setSavingTasks] = useState(false);

  const handleSaveAllVoiceTasks = async () => {
    setSavingTasks(true);
    try {
      for (const t of tasks) {
        await ApiService.createTask({
          title: t.title,
          dueDate: t.dueDate || undefined,
          time: t.time || undefined,
          person: t.person || undefined,
          priority: t.priority || 'MEDIUM',
        });
      }
      setTasksSaved(true);
    } catch {
      // ignore
    } finally {
      setSavingTasks(false);
    }
  };

  const copyCommand = (cmd: string, index: number) => {
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleShare = async () => {
    try {
      const shareMessage = `FixMate Solution:\n\n${result.title}\n\n${result.summary}\n\nSolved with 100% offline local privacy by FixMate.`;
      await Share.share({
        message: shareMessage,
        title: result.title,
      });
    } catch {
      // ignore
    }
  };

  const toggleTask = async (idx: number) => {
    const updated = [...tasks];
    updated[idx].completed = !updated[idx].completed;
    setTasks(updated);

    if (updated[idx].id) {
      await ApiService.toggleTask(updated[idx].id, updated[idx].completed);
    }
  };

  const renderContent = () => {
    const { type, data } = result.result;

    switch (type) {
      case 'PRODUCT_ANALYSIS': {
        const prodName = data.productName || result.title || 'Product Evaluation';
        const price = data.price;
        const verdict = data.quickVerdict || result.summary;
        const pros = Array.isArray(data.pros) ? data.pros : [];
        const cons = Array.isArray(data.cons) ? data.cons : [];
        const goodFor = Array.isArray(data.goodFor) ? data.goodFor : [];
        const notIdealFor = Array.isArray(data.notIdealFor) ? data.notIdealFor : [];
        const specs = Array.isArray(data.importantSpecifications) ? data.importantSpecifications : [];
        const concerns = Array.isArray(data.potentialConcerns) ? data.potentialConcerns : [];
        const questions = Array.isArray(data.questionsToAskBeforeBuying) ? data.questionsToAskBeforeBuying : [];

        return (
          <View style={styles.section}>
            {/* Product Hero Info */}
            <View style={styles.productHeroCard}>
              <View style={styles.productBadgeRow}>
                <View style={styles.shoppingPill}>
                  <ShoppingCart size={13} color={colors.primary} />
                  <Text style={styles.shoppingPillText}>BUY ADVISOR</Text>
                </View>
                {price && (
                  <View style={styles.priceBadge}>
                    <Text style={styles.priceBadgeText}>{price}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.productHeroTitle}>{prodName}</Text>
              {data.valueAssessment && (
                <Text style={styles.valueAssessmentText}>{data.valueAssessment}</Text>
              )}
            </View>

            {/* Quick Verdict Banner */}
            {verdict && (
              <View style={styles.verdictCard}>
                <View style={styles.cardHeaderIconRow}>
                  <Sparkles size={18} color="#4f46e5" />
                  <Text style={styles.verdictCardTitle}>Decisive Verdict</Text>
                </View>
                <Text style={styles.verdictBodyText}>{verdict}</Text>
              </View>
            )}

            {/* Pros & Cons Side-by-Side or Stacked */}
            {pros.length > 0 && (
              <View style={[styles.box, { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }]}>
                <View style={styles.cardHeaderIconRow}>
                  <ThumbsUp size={16} color="#15803d" />
                  <Text style={[styles.blockTitle, { color: '#15803d' }]}>Pros & Key Strengths</Text>
                </View>
                {pros.map((p: string, i: number) => (
                  <View key={i} style={styles.bulletRow}>
                    <CheckCircle2 size={15} color="#16a34a" style={styles.bulletIcon} />
                    <Text style={[styles.bulletText, { color: '#166534' }]}>{p}</Text>
                  </View>
                ))}
              </View>
            )}

            {cons.length > 0 && (
              <View style={[styles.box, { backgroundColor: '#fef2f2', borderColor: '#fecaca' }]}>
                <View style={styles.cardHeaderIconRow}>
                  <ThumbsDown size={16} color="#b91c1c" />
                  <Text style={[styles.blockTitle, { color: '#b91c1c' }]}>Cons & Limitations</Text>
                </View>
                {cons.map((c: string, i: number) => (
                  <View key={i} style={styles.bulletRow}>
                    <AlertCircle size={15} color="#dc2626" style={styles.bulletIcon} />
                    <Text style={[styles.bulletText, { color: '#991b1b' }]}>{c}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Who is it for? */}
            {(goodFor.length > 0 || notIdealFor.length > 0) && (
              <View style={styles.fitGrid}>
                {goodFor.length > 0 && (
                  <View style={[styles.fitCard, { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' }]}>
                    <Text style={[styles.fitTitle, { color: '#1d4ed8' }]}>👍 Recommended For</Text>
                    {goodFor.map((item: string, i: number) => (
                      <Text key={i} style={[styles.fitItem, { color: '#1e40af' }]}>• {item}</Text>
                    ))}
                  </View>
                )}

                {notIdealFor.length > 0 && (
                  <View style={[styles.fitCard, { backgroundColor: '#fffbeb', borderColor: '#fde68a' }]}>
                    <Text style={[styles.fitTitle, { color: '#b45309' }]}>✋ Avoid If</Text>
                    {notIdealFor.map((item: string, i: number) => (
                      <Text key={i} style={[styles.fitItem, { color: '#92400e' }]}>• {item}</Text>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* Specifications Table */}
            {specs.length > 0 && (
              <View style={styles.subCard}>
                <Text style={styles.subCardTitle}>Detected Specifications</Text>
                <View style={styles.specTable}>
                  {specs.map((s: { label: string; value: string }, i: number) => (
                    <View key={i} style={[styles.specRow, i === specs.length - 1 && { borderBottomWidth: 0 }]}>
                      <Text style={styles.specLabel}>{s.label}</Text>
                      <Text style={styles.specValue}>{s.value}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Pre-purchase checks & Questions to ask */}
            {questions.length > 0 && (
              <View style={styles.subCard}>
                <Text style={styles.subCardTitle}>Check Before You Pay</Text>
                {questions.map((q: string, i: number) => (
                  <View key={i} style={styles.stepRow}>
                    <View style={styles.stepNumber}>
                      <Text style={styles.stepNumberText}>{i + 1}</Text>
                    </View>
                    <Text style={styles.stepText}>{q}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Potential Concerns */}
            {concerns.length > 0 && (
              <View style={styles.warningBox}>
                <Text style={styles.warningTitle}>Points to Verify</Text>
                {concerns.map((con: string, i: number) => (
                  <Text key={i} style={styles.warningItem}>⚠️ {con}</Text>
                ))}
              </View>
            )}
          </View>
        );
      }

      case 'TECHNICAL_ERROR':
        return (
          <View style={styles.section}>
            {/* Why it happened */}
            {data.whyThisHappened && (
              <View style={styles.subCard}>
                <Text style={styles.subCardTitle}>Why this happened</Text>
                <Text style={styles.bodyText}>{data.whyThisHappened}</Text>
              </View>
            )}

            {/* What to do */}
            {data.whatToDo && data.whatToDo.length > 0 && (
              <View style={styles.block}>
                <Text style={styles.blockTitle}>Action Steps</Text>
                {data.whatToDo.map((step: string, i: number) => (
                  <View key={i} style={styles.stepRow}>
                    <View style={styles.stepNumber}>
                      <Text style={styles.stepNumberText}>{i + 1}</Text>
                    </View>
                    <Text style={styles.stepText}>{step}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Copyable Terminal Commands */}
            {data.exactCommands && data.exactCommands.length > 0 && (
              <View style={styles.block}>
                <Text style={styles.blockTitle}>Commands to Run</Text>
                {data.exactCommands.map((cmd: string, i: number) => (
                  <View key={i} style={styles.codeBox}>
                    <View style={styles.codeHeader}>
                      <Terminal size={14} color="#94a3b8" />
                      <Text style={styles.codeLabel}>Terminal Command</Text>
                      <TouchableOpacity
                        style={styles.copyBtn}
                        onPress={() => copyCommand(cmd, i)}
                      >
                        {copiedIndex === i ? (
                          <Check size={14} color={colors.success} />
                        ) : (
                          <Copy size={14} color="#94a3b8" />
                        )}
                        <Text style={[styles.copyBtnText, copiedIndex === i && { color: colors.success }]}>
                          {copiedIndex === i ? 'Copied' : 'Copy'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.codeText}>{cmd}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* What NOT to do */}
            {data.whatNotToDo && data.whatNotToDo.length > 0 && (
              <View style={styles.warningBox}>
                <Text style={styles.warningTitle}>What NOT to do</Text>
                {data.whatNotToDo.map((rule: string, i: number) => (
                  <Text key={i} style={styles.warningItem}>✕ {rule}</Text>
                ))}
              </View>
            )}

            {/* Verification */}
            {data.howToVerify && (
              <View style={styles.successBox}>
                <Text style={styles.successTitle}>How to Verify Resolution</Text>
                <Text style={styles.successText}>{data.howToVerify}</Text>
              </View>
            )}
          </View>
        );

      case 'BILL_EXPLANATION':
        return (
          <View style={styles.section}>
            {/* Due date and total banner */}
            <View style={styles.highlightBanner}>
              <Text style={styles.highlightLabel}>Total Amount Due</Text>
              <Text style={styles.highlightValue}>
                {data.currency || '₹'} {data.totalAmount ? Number(data.totalAmount).toLocaleString('en-IN') : 'N/A'}
              </Text>
              {data.dueDate && (
                <Text style={styles.dueDateText}>Due Date: {data.dueDate}</Text>
              )}
            </View>

            {/* Why you're paying this */}
            {data.whyYouArePayingThis && (
              <View style={styles.subCard}>
                <Text style={styles.subCardTitle}>Summary</Text>
                <Text style={styles.bodyText}>{data.whyYouArePayingThis}</Text>
              </View>
            )}

            {/* Line items breakdown */}
            {data.plainEnglishBreakdown && data.plainEnglishBreakdown.length > 0 && (
              <View style={styles.subCard}>
                <Text style={styles.subCardTitle}>Cost Breakdown</Text>
                {data.plainEnglishBreakdown.map((item: any, i: number) => (
                  <View key={i} style={styles.breakdownRow}>
                    <Text style={styles.breakdownItem}>{item.item || item.description}</Text>
                    <Text style={styles.breakdownCost}>₹{item.cost || item.amount}</Text>
                  </View>
                ))}
              </View>
            )}

            {data.unusualCharges && data.unusualCharges.length > 0 && (
              <View style={styles.warningBox}>
                <Text style={styles.warningTitle}>Unusual charges flagged</Text>
                {data.unusualCharges.map((uc: string, i: number) => (
                  <Text key={i} style={styles.warningItem}>⚠️ {uc}</Text>
                ))}
              </View>
            )}
          </View>
        );

      case 'SCAM_ANALYSIS': {
        const isHigh = data.riskLevel === 'HIGH';
        const isMed = data.riskLevel === 'MEDIUM';
        const riskColor = isHigh ? colors.danger : isMed ? colors.warning : colors.success;
        const riskBg = isHigh ? colors.dangerLight : isMed ? colors.warningLight : colors.successLight;

        return (
          <View style={styles.section}>
            <View style={[styles.riskBanner, { backgroundColor: riskBg, borderColor: riskColor }]}>
              <View style={styles.riskHeaderRow}>
                <ShieldAlert size={20} color={riskColor} />
                <Text style={[styles.riskBannerTitle, { color: riskColor }]}>
                  {data.riskLevel || 'LOW'} RISK DETECTED
                </Text>
                {data.riskScore !== undefined && (
                  <View style={[styles.scoreBadge, { backgroundColor: riskColor }]}>
                    <Text style={styles.scoreBadgeText}>{data.riskScore}/100</Text>
                  </View>
                )}
              </View>
              <Text style={styles.bodyText}>{data.whyThisIsSuspicious}</Text>
            </View>

            {data.whatNotToDo && data.whatNotToDo.length > 0 && (
              <View style={[styles.box, { backgroundColor: colors.dangerLight, borderColor: '#fca5a5' }]}>
                <Text style={[styles.blockTitle, { color: colors.danger }]}>✕ What NOT to do</Text>
                {data.whatNotToDo.map((rule: string, i: number) => (
                  <Text key={i} style={styles.dangerItem}>• {rule}</Text>
                ))}
              </View>
            )}

            {data.whatYouShouldDo && data.whatYouShouldDo.length > 0 && (
              <View style={[styles.box, { backgroundColor: colors.successLight, borderColor: '#86efac' }]}>
                <Text style={[styles.blockTitle, { color: colors.success }]}>✓ What you SHOULD do</Text>
                {data.whatYouShouldDo.map((rule: string, i: number) => (
                  <Text key={i} style={styles.successItem}>• {rule}</Text>
                ))}
              </View>
            )}

            {Array.isArray(data.suspiciousElements) && data.suspiciousElements.length > 0 && (
              <View style={styles.subCard}>
                <Text style={styles.subCardTitle}>Flagged Suspicious Elements</Text>
                {data.suspiciousElements.map((elem: any, i: number) => (
                  <View key={i} style={styles.flaggedItemRow}>
                    <View style={styles.flagTypeBadge}>
                      <Text style={styles.flagTypeBadgeText}>{elem.type?.toUpperCase() || 'FLAG'}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.flaggedText}>{elem.text}</Text>
                      <Text style={styles.flaggedNote}>{elem.note}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        );
      }

      case 'VOICE_TASK_EXTRACTION':
        return (
          <View style={styles.section}>
            <View style={{ backgroundColor: '#eef2ff', padding: 14, borderRadius: 12, marginBottom: 14, borderWidth: 1, borderColor: '#c7d2fe' }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: colors.primary }}>
                {tasksSaved ? '✓ Added to Checklist' : 'Review Extracted Action Items'}
              </Text>
              <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 4 }}>
                {tasksSaved
                  ? 'All tasks have been recorded in your local SQLite checklist.'
                  : 'Confirm to save these tasks to your local checklist.'}
              </Text>

              {!tasksSaved && (
                <TouchableOpacity
                  onPress={handleSaveAllVoiceTasks}
                  disabled={savingTasks || tasks.length === 0}
                  style={{
                    backgroundColor: colors.primary,
                    borderRadius: 8,
                    paddingVertical: 12,
                    alignItems: 'center',
                    marginTop: 10,
                    minHeight: 44,
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 13 }}>
                    {savingTasks ? 'Adding to checklist...' : 'Add All to Checklist'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            <Text style={styles.blockTitle}>Action Checklist</Text>
            {tasks.map((task: any, idx: number) => (
              <TouchableOpacity
                key={idx}
                style={[styles.taskItem, task.completed && styles.taskCompleted]}
                onPress={() => toggleTask(idx)}
              >
                {task.completed ? (
                  <CheckSquare size={20} color={colors.success} />
                ) : (
                  <Square size={20} color={colors.textSecondary} />
                )}
                <View style={styles.taskTextContainer}>
                  <Text style={[styles.taskTitle, task.completed && styles.taskTitleDone]}>
                    {task.title}
                  </Text>
                  {task.dueDate && (
                    <Text style={styles.taskMeta}>📅 {task.dueDate}</Text>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        );

      case 'SUBSCRIPTION_ANALYSIS':
        return (
          <View style={styles.section}>
            <View style={styles.highlightBanner}>
              <Text style={styles.highlightLabel}>Monthly Burn</Text>
              <Text style={styles.highlightValue}>
                ₹{Number(data.totalMonthlySpend || 0).toLocaleString('en-IN')}
              </Text>
              <Text style={styles.dueDateText}>
                Yearly: ₹{Number(data.totalYearlySpend || 0).toLocaleString('en-IN')}
              </Text>
            </View>

            {data.detectedSubscriptions?.map((sub: any, i: number) => (
              <View key={i} style={styles.subCard}>
                <View style={styles.subCardHeaderRow}>
                  <Text style={styles.subCardTitle}>{sub.merchant}</Text>
                  <Text style={styles.subCardCost}>₹{sub.amount}/{sub.frequency || 'mo'}</Text>
                </View>
                <Text style={styles.bodyText}>
                  Est. yearly cost: ₹{sub.estimatedYearlyCost || sub.amount * 12}
                </Text>
                {sub.actionRecommendation && (
                  <Text style={styles.subActionRec}>💡 {sub.actionRecommendation}</Text>
                )}
              </View>
            ))}
          </View>
        );

      case 'GENERAL_QUESTION':
      default: {
        const keyTakeaways = Array.isArray(data?.keyTakeaways) ? data.keyTakeaways : [];
        const actions = Array.isArray(data?.recommendedActions) ? data.recommendedActions : [];

        return (
          <View style={styles.section}>
            {data?.explanation && (
              <View style={styles.subCard}>
                <Text style={styles.subCardTitle}>Explanation</Text>
                <Text style={styles.bodyText}>{data.explanation}</Text>
              </View>
            )}

            {keyTakeaways.length > 0 && (
              <View style={styles.subCard}>
                <Text style={styles.subCardTitle}>Key Takeaways</Text>
                {keyTakeaways.map((point: string, i: number) => (
                  <View key={i} style={styles.bulletRow}>
                    <CheckCircle2 size={15} color={colors.primary} style={styles.bulletIcon} />
                    <Text style={styles.bulletText}>{point}</Text>
                  </View>
                ))}
              </View>
            )}

            {actions.length > 0 && (
              <View style={styles.block}>
                <Text style={styles.blockTitle}>Recommended Actions</Text>
                {actions.map((act: string, i: number) => (
                  <View key={i} style={styles.stepRow}>
                    <View style={styles.stepNumber}>
                      <Text style={styles.stepNumberText}>{i + 1}</Text>
                    </View>
                    <Text style={styles.stepText}>{act}</Text>
                  </View>
                ))}
              </View>
            )}

            {data?.suggestedNextStep && (
              <View style={styles.successBox}>
                <Text style={styles.successTitle}>Next Step</Text>
                <Text style={styles.successText}>{data.suggestedNextStep}</Text>
              </View>
            )}

            {!data?.explanation && (
              <Text style={styles.bodyText}>{result.summary}</Text>
            )}
          </View>
        );
      }
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Top Header Card */}
      <View style={styles.cardHeader}>
        <View style={styles.topBarRow}>
          <View style={styles.tag}>
            <Text style={styles.tagText}>{result.intent.replace(/_/g, ' ')}</Text>
          </View>

          <View style={styles.topRightControls}>
            <View style={styles.langPill}>
              <Text style={styles.langPillText}>🌐 {selectedLanguage.toUpperCase()}</Text>
            </View>
            <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
              <Share2 size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.title}>{result.title}</Text>
        <Text style={styles.summary}>{result.summary}</Text>

        <View style={styles.modelMetaRow}>
          <Text style={styles.modelMetaText}>
            ⚡ {result.fallbackUsed ? 'Offline Heuristic Engine' : `Ollama (${result.aiModelUsed})`}
          </Text>
        </View>
      </View>

      {/* Main Specialized Content */}
      {renderContent()}

      {/* Bottom CTA Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.solveAnotherBtn}
          onPress={onReset}
          activeOpacity={0.8}
        >
          <RotateCcw size={18} color="#ffffff" style={{ marginRight: 8 }} />
          <Text style={styles.solveAnotherBtnText}>Solve Another Problem</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 48,
  },
  cardHeader: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  topBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  topRightControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tag: {
    backgroundColor: '#eef2ff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  tagText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.5,
  },
  langPill: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  langPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  shareBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    lineHeight: 26,
    marginBottom: 6,
  },
  summary: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  modelMetaRow: {
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  modelMetaText: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '500',
  },
  section: {
    marginBottom: 16,
  },
  productHeroCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  productBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  shoppingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#eef2ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  shoppingPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
  },
  priceBadge: {
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  priceBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#059669',
  },
  productHeroTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  valueAssessmentText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  verdictCard: {
    backgroundColor: '#f5f3ff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#ddd6fe',
  },
  cardHeaderIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  verdictCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4f46e5',
  },
  verdictBodyText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#312e81',
    lineHeight: 20,
  },
  box: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  bulletIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  bulletText: {
    fontSize: 13,
    lineHeight: 19,
    flex: 1,
    color: colors.textPrimary,
  },
  fitGrid: {
    gap: 12,
    marginBottom: 14,
  },
  fitCard: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
  },
  fitTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
  },
  fitItem: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 4,
  },
  specTable: {
    borderRadius: 8,
    overflow: 'hidden',
    marginTop: 6,
  },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  specLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    flex: 1,
  },
  specValue: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textPrimary,
    flex: 1,
    textAlign: 'right',
  },
  subCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  subCardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  subCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  subCardCost: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary,
  },
  subActionRec: {
    fontSize: 12,
    color: colors.primary,
    marginTop: 6,
    fontWeight: '500',
  },
  bodyText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  block: {
    marginBottom: 14,
  },
  blockTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    marginTop: 1,
  },
  stepNumberText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  stepText: {
    fontSize: 13,
    color: colors.textPrimary,
    lineHeight: 19,
    flex: 1,
  },
  codeBox: {
    backgroundColor: '#0f172a',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  codeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    paddingBottom: 6,
    marginBottom: 8,
  },
  codeLabel: {
    color: '#94a3b8',
    fontSize: 11,
    flex: 1,
    marginLeft: 6,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#1e293b',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  copyBtnText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
  },
  codeText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: '#38bdf8',
    fontSize: 12,
    lineHeight: 18,
  },
  warningBox: {
    backgroundColor: '#fffbeb',
    borderColor: '#fde68a',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#b45309',
    marginBottom: 6,
  },
  warningItem: {
    fontSize: 13,
    color: '#92400e',
    lineHeight: 19,
    marginBottom: 4,
  },
  successBox: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
  },
  successTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#15803d',
    marginBottom: 4,
  },
  successText: {
    fontSize: 13,
    color: '#166534',
    lineHeight: 19,
  },
  highlightBanner: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  highlightLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  highlightValue: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.primary,
    marginVertical: 4,
  },
  dueDateText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  breakdownItem: {
    fontSize: 13,
    color: colors.textPrimary,
    flex: 1,
  },
  breakdownCost: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  riskBanner: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
  },
  riskHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  riskBannerTitle: {
    fontSize: 15,
    fontWeight: '800',
    flex: 1,
  },
  scoreBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  scoreBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  dangerItem: {
    fontSize: 13,
    color: colors.danger,
    lineHeight: 19,
    marginBottom: 4,
  },
  successItem: {
    fontSize: 13,
    color: colors.success,
    lineHeight: 19,
    marginBottom: 4,
  },
  flaggedItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  flagTypeBadge: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  flagTypeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#b91c1c',
  },
  flaggedText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  flaggedNote: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  taskCompleted: {
    backgroundColor: '#f8fafc',
    opacity: 0.7,
  },
  taskTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  taskTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  taskTitleDone: {
    textDecorationLine: 'line-through',
    color: colors.textMuted,
  },
  taskMeta: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  footer: {
    marginTop: 8,
    paddingBottom: 20,
  },
  solveAnotherBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    minHeight: 50,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  solveAnotherBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});
