import React, { createContext, useContext, useState, useEffect } from 'react';
import { DEFAULT_SERVER_URL, setApiServerUrl, ApiService } from '../services/api';

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

interface SettingsContextType {
  serverUrl: string;
  updateServerUrl: (url: string) => void;
  selectedLanguage: string;
  updateLanguage: (lang: string) => void;
  isBackendConnected: boolean;
  isChecking: boolean;
  systemStatus: any | null;
  checkConnection: () => Promise<boolean>;
}

const SettingsContext = createContext<SettingsContextType>({
  serverUrl: DEFAULT_SERVER_URL,
  updateServerUrl: () => {},
  selectedLanguage: 'English',
  updateLanguage: () => {},
  isBackendConnected: false,
  isChecking: false,
  systemStatus: null,
  checkConnection: async () => false,
});

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [serverUrl, setServerUrl] = useState(DEFAULT_SERVER_URL);
  const [selectedLanguage, setSelectedLanguage] = useState('English');
  const [isBackendConnected, setIsBackendConnected] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [systemStatus, setSystemStatus] = useState<any | null>(null);

  const checkConnection = async (): Promise<boolean> => {
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

  const updateServerUrl = (url: string) => {
    setServerUrl(url);
    setApiServerUrl(url);
    checkConnection();
  };

  const updateLanguage = (lang: string) => {
    setSelectedLanguage(lang);
  };

  useEffect(() => {
    checkConnection();
  }, []);

  return (
    <SettingsContext.Provider
      value={{
        serverUrl,
        updateServerUrl,
        selectedLanguage,
        updateLanguage,
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

export const useSettings = () => useContext(SettingsContext);

