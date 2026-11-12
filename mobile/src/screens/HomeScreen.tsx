import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Audio } from 'expo-av';
import { colors, spacing, typography, touchTarget } from '../theme/colors';
import {
  Camera,
  Image as ImageIcon,
  Mic,
  FileText,
  Send,
  Wrench,
  Receipt,
  ShieldAlert,
  ShoppingCart,
  Repeat,
  ShieldCheck,
  AlertCircle,
  Square,
  Globe,
  ChevronDown,
  Sparkles,
  X,
  Paperclip,
} from 'lucide-react-native';
import { ApiService, MobileAnalysisResult } from '../services/api';
import { useSettings, INDIAN_LANGUAGES } from '../context/SettingsContext';
import { ResultCard } from '../components/ResultCard';
import { LanguageSelectorModal } from '../components/LanguageSelectorModal';

interface PendingAttachment {
  uri: string;
  fileName: string;
  mimeType: string;
  type: 'image' | 'audio' | 'document';
  previewUri?: string;
  intentHint?: string;
}

export function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { isBackendConnected, serverUrl, updateServerUrl, selectedLanguage } = useSettings();

  const [inputText, setInputText] = useState('');
  const [selectedIntent, setSelectedIntent] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [activeResult, setActiveResult] = useState<MobileAnalysisResult | null>(null);
  const [isLangModalOpen, setIsLangModalOpen] = useState(false);
  const [pendingAttachment, setPendingAttachment] = useState<PendingAttachment | null>(null);

  // Audio recording state
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  const currentLangObj = INDIAN_LANGUAGES.find((l) => l.id === selectedLanguage) || INDIAN_LANGUAGES[0];

  /**
   * 1. Camera Capture (Stage Attachment)
   */
  const handleCameraScan = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Camera Permission Required',
        'FixMate needs camera access to scan documents, error screenshots, and products.'
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.4,
    });

    if (!result.canceled && result.assets[0]) {
      setPendingAttachment({
        uri: result.assets[0].uri,
        fileName: result.assets[0].fileName || 'camera_scan.jpg',
        mimeType: result.assets[0].mimeType || 'image/jpeg',
        type: 'image',
        previewUri: result.assets[0].uri,
      });
    }
  };

  /**
   * 2. Gallery Pick (Stage Attachment)
   */
  const handleGalleryPick = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Photo Library Permission Required',
        'FixMate needs access to your gallery to select screenshots and bills.'
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.4,
    });

    if (!result.canceled && result.assets[0]) {
      setPendingAttachment({
        uri: result.assets[0].uri,
        fileName: result.assets[0].fileName || 'gallery_image.jpg',
        mimeType: result.assets[0].mimeType || 'image/jpeg',
        type: 'image',
        previewUri: result.assets[0].uri,
      });
    }
  };

  /**
   * 3. Document Upload (Stage Attachment)
   */
  const handleDocumentPick = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'text/csv', 'text/comma-separated-values', 'text/plain'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const file = result.assets[0];
        setPendingAttachment({
          uri: file.uri,
          fileName: file.name,
          mimeType: file.mimeType || 'application/pdf',
          type: 'document',
        });
      }
    } catch (e: any) {
      Alert.alert('Document Selection Error', e.message);
    }
  };

  /**
   * 4. Voice Note Recording (Stage Attachment)
   */
  const startRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Microphone Permission Required',
          'FixMate needs microphone access to convert your spoken voice notes into tasks.'
        );
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(newRecording);
      setIsRecording(true);
    } catch (err: any) {
      Alert.alert('Recording Failed', err.message);
    }
  };

  const stopRecording = async () => {
    if (!recording) return;
    setIsRecording(false);
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);

      if (uri) {
        setPendingAttachment({
          uri,
          fileName: 'voice_note.m4a',
          mimeType: 'audio/m4a',
          type: 'audio',
          intentHint: 'VOICE_TASK_EXTRACTION',
        });
      }
    } catch (err: any) {
      Alert.alert('Failed to save audio', err.message);
    }
  };

  /**
   * Unified Problem Solving (Supports Attachment + Optional Question Query Together)
   */
  const handleSolve = async () => {
    if (!inputText.trim() && !pendingAttachment) return;

    setLoading(true);
    try {
      let res: MobileAnalysisResult;

      if (pendingAttachment) {
        const formData = new FormData();
        formData.append('file', {
          uri: Platform.OS === 'android' ? pendingAttachment.uri : pendingAttachment.uri.replace('file://', ''),
          name: pendingAttachment.fileName,
          type: pendingAttachment.mimeType,
        } as any);

        if (inputText.trim()) {
          formData.append('text', inputText.trim());
        }
        const effectiveIntent = selectedIntent || pendingAttachment.intentHint;
        if (effectiveIntent) {
          formData.append('intent', effectiveIntent);
        }
        if (selectedLanguage) {
          formData.append('language', selectedLanguage);
        }

        res = await ApiService.analyze(formData);
      } else {
        res = await ApiService.analyzeText(inputText.trim(), selectedIntent, selectedLanguage);
      }

      setActiveResult(res);
      setInputText('');
      setPendingAttachment(null);
      setSelectedIntent(undefined);
    } catch (err: any) {
      Alert.alert(
        'Connection Notice',
        __DEV__
          ? `${err.message}\n\n[Dev Mode] Verify that FixMate server is reachable at: ${serverUrl}`
          : 'Unable to reach the server. Please check your network connection and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  if (activeResult) {
    return <ResultCard result={activeResult} onReset={() => setActiveResult(null)} />;
  }

  const topInset = Math.max(insets.top, 14);
  const canSubmit = (inputText.trim().length > 0 || pendingAttachment !== null) && !loading;

  return (
    <View style={[styles.screenWrapper, { paddingTop: topInset }]}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Header Bar */}
        <View style={styles.topHeaderBar}>
          <View style={styles.brandRow}>
            <View style={styles.logoBadge}>
              <Sparkles size={18} color="#ffffff" />
            </View>
            <View>
              <Text style={styles.brandTitle}>FixMate</Text>
              <Text style={styles.brandSubtitle}>Offline Problem Solver</Text>
            </View>
          </View>

          {/* Language Selector Pill */}
          <TouchableOpacity
            style={styles.langSelectorBtn}
            onPress={() => setIsLangModalOpen(true)}
            activeOpacity={0.7}
          >
            <Globe size={15} color={colors.primary} />
            <Text style={styles.langSelectorText}>
              {currentLangObj.id === 'English' ? 'EN' : currentLangObj.nativeLabel.split(' ')[0]}
            </Text>
            <ChevronDown size={14} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Privacy & Health Status Pill */}
        <View style={styles.statusBar}>
          <ShieldCheck size={13} color={colors.success} />
          <Text style={styles.statusText}>100% Local Privacy</Text>
          <Text style={styles.dot}>•</Text>
          <Text
            style={[
              styles.statusText,
              { color: isBackendConnected ? colors.success : colors.warning },
            ]}
          >
            {isBackendConnected ? 'Backend Connected' : 'Connecting to Server...'}
          </Text>
        </View>

        {/* Developer Network Notice */}
        {!isBackendConnected && __DEV__ && (
          <View style={styles.offlineBox}>
            <AlertCircle size={18} color={colors.warning} />
            <View style={{ flex: 1 }}>
              <Text style={styles.offlineText}>
                Dev Server unreachable at {serverUrl}
              </Text>
              <TouchableOpacity
                style={styles.reconnectBtn}
                onPress={() => updateServerUrl('http://192.168.1.2:3000')}
              >
                <Text style={styles.reconnectBtnText}>
                  Tap to Connect to PC Wi-Fi (192.168.1.2:3000)
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* 4 Primary Action Tiles (Scan, Gallery, Speak, Upload) */}
        <View style={styles.actionGrid}>
          {/* Camera */}
          <TouchableOpacity
            style={styles.primaryActionButton}
            onPress={handleCameraScan}
            disabled={loading}
            activeOpacity={0.75}
          >
            <View style={[styles.iconCircle, { backgroundColor: '#e0e7ff' }]}>
              <Camera size={22} color={colors.primary} />
            </View>
            <Text style={styles.actionButtonText}>Scan</Text>
            <Text style={styles.actionButtonSubtext}>Camera</Text>
          </TouchableOpacity>

          {/* Gallery */}
          <TouchableOpacity
            style={styles.primaryActionButton}
            onPress={handleGalleryPick}
            disabled={loading}
            activeOpacity={0.75}
          >
            <View style={[styles.iconCircle, { backgroundColor: '#e0f2fe' }]}>
              <ImageIcon size={22} color="#0284c7" />
            </View>
            <Text style={styles.actionButtonText}>Gallery</Text>
            <Text style={styles.actionButtonSubtext}>Screenshots</Text>
          </TouchableOpacity>

          {/* Speak */}
          <TouchableOpacity
            style={[
              styles.primaryActionButton,
              isRecording && { backgroundColor: colors.dangerLight, borderColor: colors.danger },
            ]}
            onPress={isRecording ? stopRecording : startRecording}
            disabled={loading}
            activeOpacity={0.75}
          >
            <View
              style={[
                styles.iconCircle,
                { backgroundColor: isRecording ? '#fecaca' : '#fce7f3' },
              ]}
            >
              {isRecording ? (
                <Square size={20} color={colors.danger} />
              ) : (
                <Mic size={22} color="#db2777" />
              )}
            </View>
            <Text style={[styles.actionButtonText, isRecording && { color: colors.danger }]}>
              {isRecording ? 'Stop' : 'Speak'}
            </Text>
            <Text style={styles.actionButtonSubtext}>Voice Note</Text>
          </TouchableOpacity>

          {/* Documents */}
          <TouchableOpacity
            style={styles.primaryActionButton}
            onPress={handleDocumentPick}
            disabled={loading}
            activeOpacity={0.75}
          >
            <View style={[styles.iconCircle, { backgroundColor: '#fef3c7' }]}>
              <FileText size={22} color="#d97706" />
            </View>
            <Text style={styles.actionButtonText}>Upload</Text>
            <Text style={styles.actionButtonSubtext}>PDF / CSV</Text>
          </TouchableOpacity>
        </View>

        {/* Text Problem Description Input & Staged Attachment Card */}
        <View style={styles.inputCard}>
          {/* Selected Intent Pill */}
          {selectedIntent && (
            <View style={styles.intentPill}>
              <Text style={styles.intentPillText}>Target: {selectedIntent.replace(/_/g, ' ')}</Text>
              <TouchableOpacity onPress={() => setSelectedIntent(undefined)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <X size={14} color={colors.primary} />
              </TouchableOpacity>
            </View>
          )}

          {/* Staged Attachment Preview (Shown before submitting) */}
          {pendingAttachment && (
            <View style={styles.attachmentBox}>
              <View style={styles.attachmentLeft}>
                {pendingAttachment.type === 'image' && pendingAttachment.previewUri ? (
                  <Image source={{ uri: pendingAttachment.previewUri }} style={styles.attachmentThumb} />
                ) : pendingAttachment.type === 'audio' ? (
                  <View style={[styles.attachmentIconBadge, { backgroundColor: '#fce7f3' }]}>
                    <Mic size={20} color="#db2777" />
                  </View>
                ) : (
                  <View style={[styles.attachmentIconBadge, { backgroundColor: '#fef3c7' }]}>
                    <FileText size={20} color="#d97706" />
                  </View>
                )}

                <View style={styles.attachmentTextCol}>
                  <View style={styles.attachmentTypeTag}>
                    <Text style={styles.attachmentTypeTagText}>
                      {pendingAttachment.type === 'image'
                        ? '📸 PHOTO ATTACHED'
                        : pendingAttachment.type === 'audio'
                        ? '🎙️ VOICE RECORDING'
                        : '📄 DOCUMENT ATTACHED'}
                    </Text>
                  </View>
                  <Text style={styles.attachmentFileName} numberOfLines={1}>
                    {pendingAttachment.fileName}
                  </Text>
                  <Text style={styles.attachmentHintText}>
                    Add your question below, or tap Solve now
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.attachmentRemoveBtn}
                onPress={() => setPendingAttachment(null)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          )}

          <TextInput
            style={styles.textInput}
            placeholder={
              pendingAttachment
                ? "Ask a specific question about this (optional), e.g. 'Should I buy this?', 'What does this error mean?'..."
                : "Type your problem, error, scam check or product question..."
            }
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={3}
            value={inputText}
            onChangeText={setInputText}
          />

          <View style={styles.inputFooter}>
            <Text style={styles.inputHelp}>
              {pendingAttachment
                ? 'File attached — ready to solve'
                : selectedIntent
                ? 'Specialized analysis mode active'
                : 'Auto-detects problem type'}
            </Text>
            <TouchableOpacity
              style={[
                styles.sendButton,
                !canSubmit && styles.sendButtonDisabled,
              ]}
              onPress={handleSolve}
              disabled={!canSubmit}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Text style={styles.sendButtonText}>Solve</Text>
                  <Send size={13} color="#ffffff" />
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick Actions Shortcuts */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>QUICK ACTIONS</Text>

          <View style={styles.quickActionsList}>
            <TouchableOpacity
              style={[
                styles.quickActionCard,
                selectedIntent === 'TECHNICAL_ERROR' && styles.quickActionSelected,
              ]}
              onPress={() => setSelectedIntent('TECHNICAL_ERROR')}
              activeOpacity={0.7}
            >
              <View style={[styles.qaIcon, { backgroundColor: '#eff6ff' }]}>
                <Wrench size={18} color="#2563eb" />
              </View>
              <View style={styles.qaContent}>
                <Text style={styles.qaTitle}>Fix Screenshot</Text>
                <Text style={styles.qaDesc}>Solve crash logs, errors &amp; stack traces</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.quickActionCard,
                selectedIntent === 'BILL_EXPLANATION' && styles.quickActionSelected,
              ]}
              onPress={() => setSelectedIntent('BILL_EXPLANATION')}
              activeOpacity={0.7}
            >
              <View style={[styles.qaIcon, { backgroundColor: '#ecfdf5' }]}>
                <Receipt size={18} color="#059669" />
              </View>
              <View style={styles.qaContent}>
                <Text style={styles.qaTitle}>Explain Bill</Text>
                <Text style={styles.qaDesc}>Understand fees, breakdowns &amp; surcharges</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.quickActionCard,
                selectedIntent === 'SCAM_ANALYSIS' && styles.quickActionSelected,
              ]}
              onPress={() => setSelectedIntent('SCAM_ANALYSIS')}
              activeOpacity={0.7}
            >
              <View style={[styles.qaIcon, { backgroundColor: '#fef2f2' }]}>
                <ShieldAlert size={18} color="#dc2626" />
              </View>
              <View style={styles.qaContent}>
                <Text style={styles.qaTitle}>Scam Check</Text>
                <Text style={styles.qaDesc}>Check phishing messages &amp; suspicious links</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.quickActionCard,
                selectedIntent === 'PRODUCT_ANALYSIS' && styles.quickActionSelected,
              ]}
              onPress={() => setSelectedIntent('PRODUCT_ANALYSIS')}
              activeOpacity={0.7}
            >
              <View style={[styles.qaIcon, { backgroundColor: '#f5f3ff' }]}>
                <ShoppingCart size={18} color="#7c3aed" />
              </View>
              <View style={styles.qaContent}>
                <Text style={styles.qaTitle}>Buy Advisor</Text>
                <Text style={styles.qaDesc}>Honest pros, cons &amp; specification checks</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.quickActionCard,
                selectedIntent === 'SUBSCRIPTION_ANALYSIS' && styles.quickActionSelected,
              ]}
              onPress={() => setSelectedIntent('SUBSCRIPTION_ANALYSIS')}
              activeOpacity={0.7}
            >
              <View style={[styles.qaIcon, { backgroundColor: '#fffbeb' }]}>
                <Repeat size={18} color="#d97706" />
              </View>
              <View style={styles.qaContent}>
                <Text style={styles.qaTitle}>Subscriptions</Text>
                <Text style={styles.qaDesc}>Audit statements for recurring silent charges</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Language Selector Modal */}
      <LanguageSelectorModal
        visible={isLangModalOpen}
        onClose={() => setIsLangModalOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screenWrapper: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  topHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    marginBottom: 6,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  brandSubtitle: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  langSelectorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#ffffff',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  langSelectorText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ffffff',
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 20,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  dot: {
    color: colors.textMuted,
  },
  offlineBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.warningLight,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fde68a',
    marginBottom: 16,
  },
  offlineText: {
    fontSize: 12,
    color: '#92400e',
    fontWeight: '500',
  },
  reconnectBtn: {
    marginTop: 6,
    backgroundColor: colors.primary,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  reconnectBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  actionGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 16,
  },
  primaryActionButton: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    minHeight: 90,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  actionButtonSubtext: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
  },
  inputCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  intentPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#eef2ff',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    marginBottom: 10,
  },
  intentPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  attachmentBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  attachmentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  attachmentThumb: {
    width: 52,
    height: 52,
    borderRadius: 8,
    backgroundColor: '#cbd5e1',
  },
  attachmentIconBadge: {
    width: 48,
    height: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachmentTextCol: {
    flex: 1,
  },
  attachmentTypeTag: {
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 3,
  },
  attachmentTypeTagText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 0.4,
  },
  attachmentFileName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  attachmentHintText: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  attachmentRemoveBtn: {
    padding: 8,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  textInput: {
    fontSize: 14,
    color: colors.textPrimary,
    minHeight: 64,
    textAlignVertical: 'top',
    padding: 0,
    marginBottom: 8,
    lineHeight: 20,
  },
  inputFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 8,
  },
  inputHelp: {
    fontSize: 11,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    minHeight: 38,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  sendButtonDisabled: {
    backgroundColor: '#cbd5e1',
    shadowOpacity: 0,
    elevation: 0,
  },
  sendButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  quickActionsList: {
    gap: 8,
  },
  quickActionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  quickActionSelected: {
    borderColor: colors.primary,
    backgroundColor: '#f5f3ff',
  },
  qaIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  qaContent: {
    flex: 1,
  },
  qaTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  qaDesc: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
