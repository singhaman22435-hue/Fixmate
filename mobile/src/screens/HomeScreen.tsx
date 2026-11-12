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
import { colors } from '../theme/colors';
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
  CheckSquare,
  Square,
  Globe,
  X,
  Wifi,
  WifiOff,
  AlertCircle,
} from 'lucide-react-native';
import { ApiService, MobileAnalysisResult, getAutoDetectedServerUrl } from '../services/api';
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

export function HomeScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const {
    isBackendConnected,
    serverUrl,
    updateServerUrl,
    operationMode,
    selectedLanguage,
  } = useSettings();

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
      quality: 0.5,
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
      quality: 0.5,
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
   * Unified Problem Solving
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
        'Processing Failed',
        err.message || 'Could not connect to the local FixMate server. Check your Settings.'
      );
    } finally {
      setLoading(false);
    }
  };

  const clearAttachment = () => {
    setPendingAttachment(null);
  };

  // If viewing active result
  if (activeResult) {
    return (
      <View style={[styles.screenWrapper, { paddingTop: insets.top }]}>
        <ResultCard result={activeResult} onReset={() => setActiveResult(null)} />
      </View>
    );
  }

  const hasContentToSubmit = Boolean(inputText.trim() || pendingAttachment);

  return (
    <View style={[styles.screenWrapper, { paddingTop: insets.top }]}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Top Header Bar */}
        <View style={styles.topHeaderBar}>
          <View>
            <Text style={styles.brandTitle}>FixMate</Text>
            <View style={styles.statusIndicatorRow}>
              {isBackendConnected ? (
                <>
                  <View style={[styles.statusDot, { backgroundColor: '#10b981' }]} />
                  <Text style={styles.statusText}>Server Connected</Text>
                </>
              ) : (
                <>
                  <View style={[styles.statusDot, { backgroundColor: '#94a3b8' }]} />
                  <Text style={styles.statusText}>Offline Mode</Text>
                </>
              )}
            </View>
          </View>

          {/* Language Selector Pill */}
          <TouchableOpacity
            style={styles.langPill}
            onPress={() => setIsLangModalOpen(true)}
            activeOpacity={0.7}
          >
            <Globe size={13} color="#475569" />
            <Text style={styles.langPillText}>{currentLangObj.label}</Text>
          </TouchableOpacity>
        </View>

        {/* Offline / Reconnect Notice Banner */}
        {!isBackendConnected && operationMode === 'server' && (
          <View style={styles.serverAlertBanner}>
            <View style={styles.serverAlertRow}>
              <AlertCircle size={15} color="#d97706" />
              <Text style={styles.serverAlertText} numberOfLines={2}>
                Dev Server unreachable at <Text style={styles.serverAlertBold}>{serverUrl}</Text>
              </Text>
            </View>
            <View style={styles.serverAlertActions}>
              <TouchableOpacity
                style={styles.serverAlertBtnPrimary}
                onPress={() => updateServerUrl(getAutoDetectedServerUrl())}
                activeOpacity={0.7}
              >
                <Wifi size={13} color="#ffffff" />
                <Text style={styles.serverAlertBtnPrimaryText}>
                  Connect to PC ({getAutoDetectedServerUrl().replace('http://', '')})
                </Text>
              </TouchableOpacity>
              {navigation && (
                <TouchableOpacity
                  style={styles.serverAlertBtnSecondary}
                  onPress={() => navigation.navigate('Settings')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.serverAlertBtnSecondaryText}>Settings</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Question Header */}
        <View style={styles.headerSection}>
          <Text style={styles.questionHeading}>What do you need help with?</Text>
          <Text style={styles.questionSubheading}>
            Type a query, snap an error, scan a bill, or record a voice note.
          </Text>
        </View>

        {/* Primary Input Box */}
        <View style={styles.inputCard}>
          {/* Active Category Tag (if user tapped a quick action) */}
          {selectedIntent && (
            <View style={styles.activeIntentBanner}>
              <Text style={styles.activeIntentText}>
                Target: {selectedIntent.replace('_', ' ')}
              </Text>
              <TouchableOpacity onPress={() => setSelectedIntent(undefined)}>
                <X size={14} color="#64748b" />
              </TouchableOpacity>
            </View>
          )}

          {/* Staged Attachment Preview */}
          {pendingAttachment && (
            <View style={styles.attachmentChip}>
              {pendingAttachment.previewUri ? (
                <Image source={{ uri: pendingAttachment.previewUri }} style={styles.chipThumbnail} />
              ) : (
                <View style={styles.chipIconBox}>
                  {pendingAttachment.type === 'audio' ? (
                    <Mic size={14} color={colors.primary} />
                  ) : (
                    <FileText size={14} color={colors.primary} />
                  )}
                </View>
              )}
              <View style={styles.chipInfo}>
                <Text style={styles.chipFileName} numberOfLines={1}>
                  {pendingAttachment.fileName}
                </Text>
                <Text style={styles.chipFileType}>
                  {pendingAttachment.type === 'image'
                    ? 'Image attached'
                    : pendingAttachment.type === 'audio'
                    ? 'Audio note recorded'
                    : 'Document attached'}
                </Text>
              </View>
              <TouchableOpacity onPress={clearAttachment} style={styles.chipRemoveBtn}>
                <X size={14} color="#64748b" />
              </TouchableOpacity>
            </View>
          )}

          {/* Text Input */}
          <TextInput
            style={styles.textInput}
            value={inputText}
            onChangeText={setInputText}
            placeholder={
              pendingAttachment
                ? 'Ask a specific question about this (optional)...'
                : 'Describe the problem, error, bill question, or scam check...'
            }
            placeholderTextColor="#94a3b8"
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />

          {/* Modality Actions Toolbar */}
          <View style={styles.toolbarRow}>
            <View style={styles.toolIcons}>
              {/* Camera */}
              <TouchableOpacity
                style={styles.toolBtn}
                onPress={handleCameraScan}
                accessibilityLabel="Scan with Camera"
              >
                <Camera size={18} color="#475569" />
              </TouchableOpacity>

              {/* Gallery */}
              <TouchableOpacity
                style={styles.toolBtn}
                onPress={handleGalleryPick}
                accessibilityLabel="Upload Screenshot or Photo"
              >
                <ImageIcon size={18} color="#475569" />
              </TouchableOpacity>

              {/* Document / PDF / CSV */}
              <TouchableOpacity
                style={styles.toolBtn}
                onPress={handleDocumentPick}
                accessibilityLabel="Upload PDF or CSV"
              >
                <FileText size={18} color="#475569" />
              </TouchableOpacity>

              {/* Voice Record */}
              <TouchableOpacity
                style={[styles.toolBtn, isRecording && styles.toolBtnRecording]}
                onPress={isRecording ? stopRecording : startRecording}
                accessibilityLabel="Record Voice Note"
              >
                {isRecording ? (
                  <Square size={16} color="#dc2626" fill="#dc2626" />
                ) : (
                  <Mic size={18} color="#475569" />
                )}
              </TouchableOpacity>
            </View>

            {/* Solve Button */}
            <TouchableOpacity
              style={[
                styles.solveBtn,
                !hasContentToSubmit && styles.solveBtnDisabled,
              ]}
              onPress={handleSolve}
              disabled={!hasContentToSubmit || loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Text style={styles.solveBtnText}>Solve</Text>
                  <Send size={13} color="#ffffff" />
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* 6 Useful Quick Actions */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>QUICK ACTIONS</Text>
        </View>

        <View style={styles.quickActionsList}>
          {/* 1. Fix Error */}
          <TouchableOpacity
            style={[
              styles.quickActionItem,
              selectedIntent === 'TECHNICAL_ERROR' && styles.quickActionSelected,
            ]}
            onPress={() => setSelectedIntent('TECHNICAL_ERROR')}
            activeOpacity={0.7}
          >
            <View style={[styles.qaIconWrapper, { backgroundColor: '#eff6ff' }]}>
              <Wrench size={16} color="#2563eb" />
            </View>
            <View style={styles.qaContent}>
              <Text style={styles.qaTitle}>Fix Error</Text>
              <Text style={styles.qaSubtitle}>Crash logs, terminal bugs &amp; stack traces</Text>
            </View>
          </TouchableOpacity>

          {/* 2. Check Message */}
          <TouchableOpacity
            style={[
              styles.quickActionItem,
              selectedIntent === 'SCAM_ANALYSIS' && styles.quickActionSelected,
            ]}
            onPress={() => setSelectedIntent('SCAM_ANALYSIS')}
            activeOpacity={0.7}
          >
            <View style={[styles.qaIconWrapper, { backgroundColor: '#fef2f2' }]}>
              <ShieldAlert size={16} color="#dc2626" />
            </View>
            <View style={styles.qaContent}>
              <Text style={styles.qaTitle}>Check Message</Text>
              <Text style={styles.qaSubtitle}>Phishing links, OTP requests &amp; fake prizes</Text>
            </View>
          </TouchableOpacity>

          {/* 3. Explain Bill */}
          <TouchableOpacity
            style={[
              styles.quickActionItem,
              selectedIntent === 'BILL_EXPLANATION' && styles.quickActionSelected,
            ]}
            onPress={() => setSelectedIntent('BILL_EXPLANATION')}
            activeOpacity={0.7}
          >
            <View style={[styles.qaIconWrapper, { backgroundColor: '#ecfdf5' }]}>
              <Receipt size={16} color="#059669" />
            </View>
            <View style={styles.qaContent}>
              <Text style={styles.qaTitle}>Explain Bill</Text>
              <Text style={styles.qaSubtitle}>Utility breakdowns, surcharges &amp; due dates</Text>
            </View>
          </TouchableOpacity>

          {/* 4. Analyze Product */}
          <TouchableOpacity
            style={[
              styles.quickActionItem,
              selectedIntent === 'PRODUCT_ANALYSIS' && styles.quickActionSelected,
            ]}
            onPress={() => setSelectedIntent('PRODUCT_ANALYSIS')}
            activeOpacity={0.7}
          >
            <View style={[styles.qaIconWrapper, { backgroundColor: '#f5f3ff' }]}>
              <ShoppingCart size={16} color="#7c3aed" />
            </View>
            <View style={styles.qaContent}>
              <Text style={styles.qaTitle}>Analyze Product</Text>
              <Text style={styles.qaSubtitle}>Specs, pros, cons &amp; buyer checklist</Text>
            </View>
          </TouchableOpacity>

          {/* 5. Find Subscription */}
          <TouchableOpacity
            style={[
              styles.quickActionItem,
              selectedIntent === 'SUBSCRIPTION_ANALYSIS' && styles.quickActionSelected,
            ]}
            onPress={() => setSelectedIntent('SUBSCRIPTION_ANALYSIS')}
            activeOpacity={0.7}
          >
            <View style={[styles.qaIconWrapper, { backgroundColor: '#fffbeb' }]}>
              <Repeat size={16} color="#d97706" />
            </View>
            <View style={styles.qaContent}>
              <Text style={styles.qaTitle}>Find Subscription</Text>
              <Text style={styles.qaSubtitle}>Audit recurring charges &amp; yearly cost</Text>
            </View>
          </TouchableOpacity>

          {/* 6. Create Task */}
          <TouchableOpacity
            style={[
              styles.quickActionItem,
              selectedIntent === 'VOICE_TASK_EXTRACTION' && styles.quickActionSelected,
            ]}
            onPress={() => setSelectedIntent('VOICE_TASK_EXTRACTION')}
            activeOpacity={0.7}
          >
            <View style={[styles.qaIconWrapper, { backgroundColor: '#f0fdf4' }]}>
              <CheckSquare size={16} color="#16a34a" />
            </View>
            <View style={styles.qaContent}>
              <Text style={styles.qaTitle}>Create Task</Text>
              <Text style={styles.qaSubtitle}>Convert spoken dictation into actionable items</Text>
            </View>
          </TouchableOpacity>
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
    paddingBottom: 30,
  },
  topHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    marginBottom: 8,
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
    letterSpacing: -0.4,
  },
  statusIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },
  langPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#ffffff',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  langPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  headerSection: {
    marginBottom: 12,
  },
  questionHeading: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a',
  },
  questionSubheading: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  inputCard: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    marginBottom: 20,
  },
  activeIntentBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 8,
  },
  activeIntentText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
  },
  attachmentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f8fafc',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 8,
  },
  chipThumbnail: {
    width: 36,
    height: 36,
    borderRadius: 4,
    backgroundColor: '#e2e8f0',
  },
  chipIconBox: {
    width: 36,
    height: 36,
    borderRadius: 4,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipInfo: {
    flex: 1,
  },
  chipFileName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0f172a',
  },
  chipFileType: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 1,
  },
  chipRemoveBtn: {
    padding: 6,
  },
  textInput: {
    fontSize: 13,
    color: '#0f172a',
    lineHeight: 18,
    minHeight: 60,
    maxHeight: 120,
    padding: 0,
    marginBottom: 10,
  },
  toolbarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  toolIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  toolBtn: {
    width: 34,
    height: 34,
    borderRadius: 6,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  toolBtnRecording: {
    borderColor: '#dc2626',
    backgroundColor: '#fef2f2',
  },
  solveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.primary,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 6,
  },
  solveBtnDisabled: {
    backgroundColor: '#cbd5e1',
  },
  solveBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  sectionHeader: {
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    letterSpacing: 0.5,
  },
  quickActionsList: {
    gap: 8,
  },
  quickActionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
  },
  quickActionSelected: {
    borderColor: colors.primary,
    backgroundColor: '#f5f3ff',
  },
  qaIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qaContent: {
    flex: 1,
  },
  qaTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
  },
  qaSubtitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  serverAlertBanner: {
    backgroundColor: '#fffbeb',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fde68a',
    padding: 10,
    marginBottom: 12,
  },
  serverAlertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  serverAlertText: {
    fontSize: 12,
    color: '#92400e',
    flex: 1,
    lineHeight: 16,
  },
  serverAlertBold: {
    fontWeight: '700',
  },
  serverAlertActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  serverAlertBtnPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  serverAlertBtnPrimaryText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
  },
  serverAlertBtnSecondary: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fcd34d',
  },
  serverAlertBtnSecondaryText: {
    color: '#92400e',
    fontSize: 11,
    fontWeight: '600',
  },
});
