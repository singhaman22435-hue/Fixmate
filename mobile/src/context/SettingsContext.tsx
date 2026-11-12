import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DEFAULT_SERVER_URL,
  initApiServerUrl,
  setApiServerUrl,
  ApiService,
} from '../services/api';

const STORAGE_KEYS = {
  SERVER_URL: '@fixmate_server_url',
  LANGUAGE: '@fixmate_language',
  OFFLINE_MODE: '@fixmate_offline_mode',
};

export interface SupportedLanguage {
  id: string;
  label: string;
  nativeLabel: string;
}

export const INDIAN_LANGUAGES: SupportedLanguage[] = [
  { id: 'English', label: 'English', nativeLabel: 'English' },
  { id: 'Hinglish', label: 'Hinglish', nativeLabel: 'Hinglish (Casual Hindi in English script)' },
  { id: 'Hindi', label: 'Hindi', nativeLabel: 'हिन्दी' },
  { id: 'Bengali', label: 'Bengali', nativeLabel: 'বাংলা' },
  { id: 'Marathi', label: 'Marathi', nativeLabel: 'मराठी' },
  { id: 'Telugu', label: 'Telugu', nativeLabel: 'తెలుగు' },
  { id: 'Tamil', label: 'Tamil', nativeLabel: 'தமிழ்' },
  { id: 'Gujarati', label: 'Gujarati', nativeLabel: 'ગુજરાતી' },
  { id: 'Kannada', label: 'Kannada', nativeLabel: 'ಕನ್ನಡ' },
  { id: 'Malayalam', label: 'Malayalam', nativeLabel: 'മലയാളം' },
  { id: 'Punjabi', label: 'Punjabi', nativeLabel: 'ਪੰਜਾਬੀ' },
];

export type AppOperationMode = 'server' | 'standalone_offline';

interface SettingsContextType {
  serverUrl: string;
  updateServerUrl: (url: string) => Promise<void>;
  selectedLanguage: string;
  updateLanguage: (lang: string) => Promise<void>;
  operationMode: AppOperationMode;
  setOperationMode: (mode: AppOperationMode) => Promise<void>;
  isBackendConnected: boolean;
  isChecking: boolean;
  systemStatus: any | null;
  checkConnection: () => Promise<boolean>;
}

const SettingsContext = createContext<SettingsContextType>({
  serverUrl: DEFAULT_SERVER_URL,
  updateServerUrl: async () => {},
  selectedLanguage: 'English',
  updateLanguage: async () => {},
  operationMode: 'server',
  setOperationMode: async () => {},
  isBackendConnected: false,
  isChecking: false,
  systemStatus: null,
  checkConnection: async () => false,
});

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [serverUrl, setServerUrlState] = useState(DEFAULT_SERVER_URL);
  const [selectedLanguage, setSelectedLanguage] = useState('English');
  const [operationMode, setOperationModeState] = useState<AppOperationMode>('server');
  const [isBackendConnected, setIsBackendConnected] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [systemStatus, setSystemStatus] = useState<any | null>(null);

  // Initialize stored settings on app mount
  useEffect(() => {
    (async () => {
      try {
        const storedUrl = await initApiServerUrl();
        setServerUrlState(storedUrl);

        const storedLang = await AsyncStorage.getItem(STORAGE_KEYS.LANGUAGE);
        if (storedLang) setSelectedLanguage(storedLang);

        const storedMode = await AsyncStorage.getItem(STORAGE_KEYS.OFFLINE_MODE);
        if (storedMode === 'standalone_offline') {
          setOperationModeState('standalone_offline');
        } else {
          // Attempt connecting to the local server
          checkConnectionWithUrl(storedUrl);
        }
      } catch {
        // ignore
      }
    })();
  }, []);

  const checkConnectionWithUrl = async (urlToCheck?: string): Promise<boolean> => {
    setIsChecking(true);
    try {
      const status = await ApiService.getStatus();
      setIsBackendConnected(true);
      setSystemStatus(status);
      setIsChecking(false);
      return true;
    } catch {
      setIsBackendConnected(false);
      setSystemStatus(null);
      setIsChecking(false);
      return false;
    }
  };

  const checkConnection = async (): Promise<boolean> => {
    return checkConnectionWithUrl(serverUrl);
  };

  const updateServerUrl = async (url: string) => {
    const clean = url.trim().replace(/\/$/, '');
    setServerUrlState(clean);
    await setApiServerUrl(clean);
    await checkConnectionWithUrl(clean);
  };

  const updateLanguage = async (lang: string) => {
    setSelectedLanguage(lang);
    await AsyncStorage.setItem(STORAGE_KEYS.LANGUAGE, lang).catch(() => {});
  };

  const setOperationMode = async (mode: AppOperationMode) => {
    setOperationModeState(mode);
    await AsyncStorage.setItem(STORAGE_KEYS.OFFLINE_MODE, mode).catch(() => {});
    if (mode === 'server') {
      checkConnection();
    }
  };

  return (
    <SettingsContext.Provider
      value={{
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
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
