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
} from 'lucide-react-native';
import { useSettings, INDIAN_LANGUAGES } from '../context/SettingsContext';
import { LanguageSelectorModal } from '../components/LanguageSelectorModal';

export function SettingsScreen() {
  const {
    serverUrl,
    updateServerUrl,
    selectedLanguage,
    updateLanguage,
    isBackendConnected,
    isChecking,
    systemStatus,
    checkConnection,
  } = useSettings();

  const [inputUrl, setInputUrl] = useState(serverUrl);
  const [isLangModalOpen, setIsLangModalOpen] = useState(false);

  const currentLangObj = INDIAN_LANGUAGES.find((l) => l.id === selectedLanguage) || INDIAN_LANGUAGES[0];

  const handleSaveUrl = () => {
    updateServerUrl(inputUrl.trim());
    Alert.alert('Settings Updated', 'Server endpoint updated. Testing connection...');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Settings &amp; Preferences</Text>
          <Text style={styles.subtitle}>Configure language, local server &amp; diagnostics</Text>
        </View>

        {/* Language Selection Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Globe size={18} color={colors.primary} />
            <Text style={styles.cardTitle}>AI Response Language</Text>
          </View>
          <Text style={styles.cardDesc}>
            FixMate generates solutions, advice, and checklists in your chosen Indian language.
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

          {/* Quick Language Chips */}
          <View style={styles.quickLangRow}>
            {['English', 'Hinglish', 'Hindi', 'Bengali', 'Marathi', 'Tamil', 'Telugu'].map((lId) => {
              const lang = INDIAN_LANGUAGES.find((l) => l.id === lId);
              if (!lang) return null;
              const isSelected = selectedLanguage === lang.id;
              return (
                <TouchableOpacity
                  key={lang.id}
                  style={[styles.langChip, isSelected && styles.langChipSelected]}
                  onPress={() => updateLanguage(lang.id)}
                >
                  <Text style={[styles.langChipText, isSelected && styles.langChipTextSelected]}>
                    {lang.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Backend Server Configuration */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Server size={18} color={colors.primary} />
            <Text style={styles.cardTitle}>
              {__DEV__ ? 'Developer Server Configuration' : 'Server Connection'}
            </Text>
          </View>
          <Text style={styles.cardDesc}>
            {__DEV__
              ? 'In local development, the app connects to your machine. For physical phones on the same Wi-Fi, use your PC IP.'
              : 'FixMate communicates securely with the production server. All data stays encrypted and private.'}
          </Text>

          <TextInput
            style={styles.input}
            value={inputUrl}
            onChangeText={setInputUrl}
            placeholder="http://192.168.1.2:3000"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
          />

          {/* Quick Presets */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
            <TouchableOpacity
              style={{
                paddingVertical: 6,
                paddingHorizontal: 10,
                backgroundColor: inputUrl.includes('192.168.1.2') ? '#e0e7ff' : '#f1f5f9',
                borderRadius: 6,
                borderWidth: 1,
                borderColor: inputUrl.includes('192.168.1.2') ? colors.primary : '#cbd5e1',
              }}
              onPress={() => {
                setInputUrl('http://192.168.1.2:3000');
                updateServerUrl('http://192.168.1.2:3000');
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textPrimary }}>
                📱 Phone (192.168.1.2:3000)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                paddingVertical: 6,
                paddingHorizontal: 10,
                backgroundColor: inputUrl.includes('10.0.2.2') ? '#e0e7ff' : '#f1f5f9',
                borderRadius: 6,
                borderWidth: 1,
                borderColor: inputUrl.includes('10.0.2.2') ? colors.primary : '#cbd5e1',
              }}
              onPress={() => {
                setInputUrl('http://10.0.2.2:3000');
                updateServerUrl('http://10.0.2.2:3000');
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textPrimary }}>
                💻 Emulator (10.0.2.2:3000)
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.saveBtn}
              onPress={handleSaveUrl}
            >
              <Text style={styles.saveBtnText}>Save URL</Text>
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

          {/* Status result */}
          <View style={styles.connectionStatus}>
            {isBackendConnected ? (
              <View style={styles.badgeRow}>
                <CheckCircle2 size={16} color={colors.success} />
                <Text style={[styles.statusText, { color: colors.success }]}>
                  Connected to local FixMate Core
                </Text>
              </View>
            ) : (
              <View style={styles.badgeRow}>
                <AlertCircle size={16} color={colors.warning} />
                <Text style={[styles.statusText, { color: colors.warning }]}>
                  Server not responding (offline mode active)
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Live Service Diagnostics */}
        {systemStatus && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Local System Diagnostics</Text>

            <View style={styles.diagRow}>
              <View style={styles.diagLabelRow}>
                <Database size={16} color={colors.textSecondary} />
                <Text style={styles.diagLabel}>SQLite Database</Text>
              </View>
              <Text style={styles.diagValue}>
                {systemStatus.database?.isAvailable ? 'Active' : 'Offline'}
              </Text>
            </View>

            <View style={styles.diagRow}>
              <View style={styles.diagLabelRow}>
                <Cpu size={16} color={colors.textSecondary} />
                <Text style={styles.diagLabel}>Ollama AI Runtime</Text>
              </View>
              <Text style={styles.diagValue}>
                {systemStatus.localAI?.isAvailable
                  ? `Online (${systemStatus.localAI?.models?.length || 0} models)`
                  : 'Deterministic Fallback'}
              </Text>
            </View>

            <View style={styles.diagRow}>
              <View style={styles.diagLabelRow}>
                <Lock size={16} color={colors.textSecondary} />
                <Text style={styles.diagLabel}>Privacy Mode</Text>
              </View>
              <Text style={[styles.diagValue, { color: colors.success }]}>
                100% Local Privacy
              </Text>
            </View>
          </View>
        )}

        {/* Privacy Manifesto */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <ShieldCheck size={20} color={colors.success} />
            <Text style={styles.cardTitle}>Mobile Privacy Guarantee</Text>
          </View>
          <Text style={styles.manifestoText}>
            FixMate does not upload your camera captures, voice notes, bills, or screenshots to any public cloud AI provider.
            {'\n\n'}
            • Zero OpenAI, Gemini, or Claude API calls
            {'\n'}
            • Zero bank login or password access
            {'\n'}
            • Full local ownership of your SQLite records
          </Text>
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
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  header: {
    marginBottom: spacing.xs,
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
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  cardTitle: {
    ...typography.h3,
    color: colors.text,
  },
  cardDesc: {
    ...typography.caption,
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  langSelectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
  },
  selectedLangName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  selectedLangNative: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  changePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#eef2ff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  changePillText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  quickLangRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  langChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  langChipSelected: {
    backgroundColor: '#eef2ff',
    borderColor: colors.primary,
  },
  langChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  langChipTextSelected: {
    color: colors.primary,
    fontWeight: '700',
  },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 14,
    color: colors.text,
    minHeight: touchTarget.minHeight,
    marginBottom: spacing.md,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  saveBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: touchTarget.minHeight,
  },
  saveBtnText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  testBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primaryLight,
    borderRadius: 8,
    paddingVertical: spacing.sm,
    minHeight: touchTarget.minHeight,
  },
  testBtnText: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 14,
  },
  connectionStatus: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '500',
  },
  diagRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  diagLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  diagLabel: {
    fontSize: 14,
    color: colors.text,
  },
  diagValue: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  manifestoText: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.textSecondary,
  },
});
