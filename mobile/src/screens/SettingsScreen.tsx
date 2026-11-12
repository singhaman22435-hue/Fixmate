import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, typography, touchTarget } from '../theme/colors';
import {
  Server,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Cpu,
  Database,
  Lock,
  Globe,
  ChevronRight,
  Wifi,
  WifiOff,
  Trash2,
  ScanLine,
} from 'lucide-react-native';
import { useSettings, INDIAN_LANGUAGES, AppOperationMode } from '../context/SettingsContext';
import { LanguageSelectorModal } from '../components/LanguageSelectorModal';
import { ApiService, getAutoDetectedServerUrl } from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export function SettingsScreen() {
  const {
    serverUrl,
    updateServerUrl,
    selectedLanguage,
    updateLanguage,
    operationMode,
    setOperationMode,
    isBackendConnected,
    isChecking,
    systemStatus,
    checkConnection,
  } = useSettings();

  const [inputUrl, setInputUrl] = useState(serverUrl);
  const [isLangModalOpen, setIsLangModalOpen] = useState(false);
  const [clearingCache, setClearingCache] = useState(false);

  const currentLangObj = INDIAN_LANGUAGES.find((l) => l.id === selectedLanguage) || INDIAN_LANGUAGES[0];

  const handleSaveUrl = async () => {
    if (!inputUrl.trim()) {
      Alert.alert('Invalid URL', 'Please enter a valid HTTP address (e.g. http://192.168.1.X:3000)');
      return;
    }
    await updateServerUrl(inputUrl.trim());
    Alert.alert('Server Configured', `Connecting to: ${inputUrl.trim()}`);
  };

  const handleAutoDetect = async () => {
    const detected = getAutoDetectedServerUrl();
    setInputUrl(detected);
    await updateServerUrl(detected);
  };

  const handleClearCache = async () => {
    Alert.alert(
      'Clear Local Cache',
      'Remove cached offline tasks, subscriptions, and history records from this phone?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            setClearingCache(true);
            try {
              await AsyncStorage.removeItem('@fixmate_cached_tasks');
              await AsyncStorage.removeItem('@fixmate_cached_subscriptions');
              await AsyncStorage.removeItem('@fixmate_cached_history');
              Alert.alert('Cache Cleared', 'Local offline cache has been reset.');
            } catch {
              Alert.alert('Error', 'Failed to clear local storage.');
            } finally {
              setClearingCache(false);
            }
          },
        },
      ]
    );
  };

  const handleWipeServerData = () => {
    Alert.alert(
      'Wipe Server History',
      'Permanently delete all analysis logs and history from your local SQLite database?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Wipe All',
          style: 'destructive',
          onPress: async () => {
            try {
              await ApiService.wipeAllHistory();
              Alert.alert('History Wiped', 'All analysis history records have been permanently erased.');
            } catch {
              Alert.alert('Notice', 'Could not reach server to purge history.');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Settings</Text>
          <Text style={styles.subtitle}>Language, server connectivity &amp; diagnostics</Text>
        </View>

        {/* Operation Mode Selector */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Operation Mode</Text>
          <Text style={styles.cardDesc}>
            Choose how FixMate operates on this device:
          </Text>

          <View style={styles.modeRow}>
            <TouchableOpacity
              style={[
                styles.modeOption,
                operationMode === 'server' && styles.modeOptionActive,
              ]}
              onPress={() => setOperationMode('server')}
              activeOpacity={0.7}
            >
              <Wifi size={18} color={operationMode === 'server' ? colors.primary : colors.textSecondary} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.modeTitle, operationMode === 'server' && styles.modeTitleActive]}>
                  Local PC Server (LAN)
                </Text>
                <Text style={styles.modeDesc}>
                  Full neural reasoning via Ollama &amp; local OCR running on your computer.
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.modeOption,
                operationMode === 'standalone_offline' && styles.modeOptionActive,
              ]}
              onPress={() => setOperationMode('standalone_offline')}
              activeOpacity={0.7}
            >
              <WifiOff size={18} color={operationMode === 'standalone_offline' ? colors.primary : colors.textSecondary} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.modeTitle, operationMode === 'standalone_offline' && styles.modeTitleActive]}>
                  Standalone Offline
                </Text>
                <Text style={styles.modeDesc}>
                  Browse saved solutions, tasks, and subscriptions stored on this phone without network.
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Server Endpoint Configuration */}
        {operationMode === 'server' && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Server size={18} color={colors.primary} />
              <Text style={styles.cardTitle}>Local Server Address</Text>
            </View>
            <Text style={styles.cardDesc}>
              Enter your computer's local Wi-Fi IP and port (e.g. http://192.168.1.X:3000). Both your phone and PC must be on the same Wi-Fi.
            </Text>

            <TextInput
              style={styles.input}
              value={inputUrl}
              onChangeText={setInputUrl}
              placeholder="http://192.168.1.X:3000"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveUrl}>
                <Text style={styles.saveBtnText}>Save Address</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.testBtn}
                onPress={checkConnection}
                disabled={isChecking}
              >
                {isChecking ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <>
                    <RefreshCw size={14} color={colors.primary} />
                    <Text style={styles.testBtnText}>Test Connection</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Quick Auto-Detect button */}
            <TouchableOpacity style={styles.autoDetectBtn} onPress={handleAutoDetect}>
              <Text style={styles.autoDetectText}>Auto-detect Metro Bundler Host</Text>
            </TouchableOpacity>

            {/* Connection Status Banner */}
            <View style={styles.connectionStatus}>
              {isBackendConnected ? (
                <View style={styles.badgeRow}>
                  <CheckCircle2 size={16} color={colors.success} />
                  <Text style={[styles.statusText, { color: colors.success }]}>
                    Connected to FixMate server
                  </Text>
                </View>
              ) : (
                <View style={styles.badgeRow}>
                  <AlertCircle size={16} color={colors.warning} />
                  <Text style={[styles.statusText, { color: colors.warning }]}>
                    Server not reachable at {serverUrl}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Language Selection Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Globe size={18} color={colors.primary} />
            <Text style={styles.cardTitle}>Response Language</Text>
          </View>
          <Text style={styles.cardDesc}>
            Select your preferred language for explanations, advice, and task checklists.
          </Text>

          <TouchableOpacity
            style={styles.langSelectorRow}
            onPress={() => setIsLangModalOpen(true)}
            activeOpacity={0.7}
          >
            <View>
              <Text style={styles.selectedLangName}>{currentLangObj.label}</Text>
              <Text style={styles.selectedLangNative}>{currentLangObj.nativeLabel}</Text>
            </View>
            <View style={styles.changePill}>
              <Text style={styles.changePillText}>Change</Text>
              <ChevronRight size={14} color={colors.primary} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Live Diagnostics Card */}
        {systemStatus && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Live System Status</Text>

            <View style={styles.diagRow}>
              <View style={styles.diagLabelRow}>
                <Database size={15} color={colors.textSecondary} />
                <Text style={styles.diagLabel}>SQLite Database</Text>
              </View>
              <Text style={styles.diagValue}>
                {systemStatus.database?.isAvailable ? 'Connected' : 'Offline'}
              </Text>
            </View>

            <View style={styles.diagRow}>
              <View style={styles.diagLabelRow}>
                <ScanLine size={15} color={colors.textSecondary} />
                <Text style={styles.diagLabel}>Offline OCR</Text>
              </View>
              <Text style={styles.diagValue}>
                {systemStatus.ocr?.isAvailable ? 'Tesseract Local' : 'Unavailable'}
              </Text>
            </View>

            <View style={styles.diagRow}>
              <View style={styles.diagLabelRow}>
                <Cpu size={15} color={colors.textSecondary} />
                <Text style={styles.diagLabel}>Ollama Model</Text>
              </View>
              <Text style={styles.diagValue}>
                {systemStatus.localAI?.hasRequiredModel
                  ? systemStatus.localAI.selectedModel
                  : 'Deterministic Fallback'}
              </Text>
            </View>

            <View style={styles.diagRow}>
              <View style={styles.diagLabelRow}>
                <Lock size={15} color={colors.textSecondary} />
                <Text style={styles.diagLabel}>Privacy Mode</Text>
              </View>
              <Text style={[styles.diagValue, { color: colors.success }]}>
                100% Local Processing
              </Text>
            </View>
          </View>
        )}

        {/* Data Management & Privacy */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Privacy &amp; Data Hygiene</Text>
          <Text style={styles.cardDesc}>
            All OCR, bills, tasks, and queries remain on your local hardware. You can wipe data at any time.
          </Text>

          <View style={{ gap: 10, marginTop: 12 }}>
            <TouchableOpacity style={styles.dangerBtn} onPress={handleClearCache}>
              <Trash2 size={15} color="#dc2626" />
              <Text style={styles.dangerBtnText}>Clear Phone Offline Cache</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.dangerBtn} onPress={handleWipeServerData}>
              <Trash2 size={15} color="#dc2626" />
              <Text style={styles.dangerBtnText}>Wipe Analysis Records from Server</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Language Selector Modal */}
      <LanguageSelectorModal
        visible={isLangModalOpen}
        onClose={() => setIsLangModalOpen(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
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
  header: {
    marginVertical: 14,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0f172a',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
    marginBottom: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  cardDesc: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 17,
    marginTop: 2,
    marginBottom: 10,
  },
  modeRow: {
    gap: 8,
    marginTop: 4,
  },
  modeOption: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  modeOptionActive: {
    borderColor: colors.primary,
    backgroundColor: '#f5f3ff',
  },
  modeTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  modeTitleActive: {
    color: colors.primary,
  },
  modeDesc: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: '#0f172a',
    backgroundColor: '#ffffff',
    marginBottom: 10,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  saveBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  testBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingVertical: 9,
    backgroundColor: '#ffffff',
  },
  testBtnText: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '600',
  },
  autoDetectBtn: {
    paddingVertical: 7,
    alignItems: 'center',
    marginBottom: 10,
  },
  autoDetectText: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  connectionStatus: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  langSelectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  selectedLangName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  selectedLangNative: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  changePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  changePillText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  diagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  diagLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  diagLabel: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '500',
  },
  diagValue: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  dangerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
  },
  dangerBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#dc2626',
  },
});
