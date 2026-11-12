import { Platform, NativeModules } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const STORAGE_KEYS = {
  SERVER_URL: '@fixmate_server_url',
  CACHED_TASKS: '@fixmate_cached_tasks',
  CACHED_SUBSCRIPTIONS: '@fixmate_cached_subscriptions',
  CACHED_HISTORY: '@fixmate_cached_history',
};

/**
 * Extract an IPv4 host address from various URI formats used by Expo Go and React Native
 */
function extractHostFromUri(uri?: string | null): string | null {
  if (!uri || typeof uri !== 'string') return null;
  const match = uri.match(/(?:https?|exp):\/\/([0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3})/);
  if (match && match[1]) {
    const ip = match[1];
    if (ip !== '127.0.0.1' && ip !== '10.0.2.2') {
      return ip;
    }
  }
  const bareMatch = uri.match(/^([0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3})/);
  if (bareMatch && bareMatch[1]) {
    const ip = bareMatch[1];
    if (ip !== '127.0.0.1' && ip !== '10.0.2.2') {
      return ip;
    }
  }
  return null;
}

/**
 * Return list of candidate server URLs to probe in order of likelihood
 */
export function getCandidateServerUrls(): string[] {
  const candidates: string[] = [];

  // 1. Explicit env var
  if (process.env.EXPO_PUBLIC_API_URL) {
    candidates.push(process.env.EXPO_PUBLIC_API_URL.replace(/\/$/, ''));
  }

  // 2. Constants sources in Expo SDK 52 (experienceUrl, linkingUri, hostUri, manifest)
  const sources = [
    (Constants as any).experienceUrl,
    Constants.linkingUri,
    Constants.expoConfig?.hostUri,
    (Constants as any).manifest2?.extra?.expoGo?.debuggerHost,
    (Constants as any).manifest?.debuggerHost,
    NativeModules?.SourceCode?.scriptURL,
  ];

  for (const src of sources) {
    const ip = extractHostFromUri(src);
    if (ip) {
      const url = `http://${ip}:3000`;
      if (!candidates.includes(url)) {
        candidates.push(url);
      }
    }
  }

  // 3. Known local subnet IPs for seamless fallback across network switches
  const knownIps = ['192.168.1.2', '10.210.244.81', '10.0.2.2', 'localhost'];
  for (const ip of knownIps) {
    const url = `http://${ip}:3000`;
    if (!candidates.includes(url)) {
      candidates.push(url);
    }
  }

  return candidates;
}

/**
 * Automatically determine best server URL based on the runtime environment.
 * Dynamically resolves from the Expo Go / Metro host IP so it adapts to any network change.
 */
export function getAutoDetectedServerUrl(): string {
  const candidates = getCandidateServerUrls();
  return candidates[0] || (Platform.OS === 'android' ? 'http://192.168.1.2:3000' : 'http://localhost:3000');
}

export const DEFAULT_SERVER_URL = getAutoDetectedServerUrl();

let currentServerUrl = DEFAULT_SERVER_URL;

export async function initApiServerUrl(): Promise<string> {
  try {
    const saved = await AsyncStorage.getItem(STORAGE_KEYS.SERVER_URL);
    if (saved && saved.trim()) {
      currentServerUrl = saved.trim().replace(/\/$/, '');
      return currentServerUrl;
    }
  } catch {
    // ignore
  }
  return currentServerUrl;
}

export async function setApiServerUrl(url: string): Promise<void> {
  const clean = url.trim().replace(/\/$/, '');
  currentServerUrl = clean;
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.SERVER_URL, clean);
  } catch {
    // ignore
  }
}

export function getApiServerUrl(): string {
  return currentServerUrl;
}

export interface MobileAnalysisResult {
  analysisId?: string;
  intent: string;
  inputType: string;
  title: string;
  summary: string;
  confidence: number;
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH';
  extractedText: string;
  result: {
    type: string;
    data: any;
  };
  aiModelUsed: string;
  fallbackUsed: boolean;
}

export interface MobileTaskItem {
  id: string;
  title: string;
  dueDate?: string | null;
  time?: string | null;
  priority: string;
  person?: string | null;
  notes?: string | null;
  completed: boolean;
  createdAt: string;
}

export interface MobileSubscriptionItem {
  id: string;
  merchant: string;
  amount: number;
  currency: string;
  frequency: string;
  estimatedYearlyCost: number;
  status: string;
  createdAt: string;
}

export interface FollowUpChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  suggestedFollowUps?: string[];
  createdAt?: string;
}

export const ApiService = {
  async getStatus(targetUrl?: string): Promise<{
    isAvailable: boolean;
    localAI: any;
    database: any;
    ocr: any;
    speech: any;
    privacy: any;
  }> {
    const baseUrl = (targetUrl && targetUrl.trim()) ? targetUrl.trim().replace(/\/$/, '') : currentServerUrl;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    try {
      const res = await fetch(`${baseUrl}/api/system/status`, {
        method: 'GET',
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!res.ok) throw new Error(`Status check returned HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      clearTimeout(timeout);
      throw e;
    }
  },

  async analyze(formData: FormData): Promise<MobileAnalysisResult> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);

    try {
      const res = await fetch(`${currentServerUrl}/api/analyze`, {
        method: 'POST',
        body: formData,
        headers: {
          Accept: 'application/json',
        },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Server returned error ${res.status}`);
      }

      const result = await res.json();

      // Update cached history
      try {
        const cachedRaw = await AsyncStorage.getItem(STORAGE_KEYS.CACHED_HISTORY);
        const cached = cachedRaw ? JSON.parse(cachedRaw) : [];
        const newHistoryItem = {
          id: result.analysisId || `offline_${Date.now()}`,
          title: result.title,
          intent: result.intent,
          summary: result.summary,
          createdAt: new Date().toISOString(),
          resultJson: JSON.stringify(result.result),
        };
        const updated = [newHistoryItem, ...cached.slice(0, 49)];
        await AsyncStorage.setItem(STORAGE_KEYS.CACHED_HISTORY, JSON.stringify(updated));
      } catch {
        // ignore
      }

      return result;
    } catch (e) {
      clearTimeout(timeout);
      throw e;
    }
  },

  async analyzeText(text: string, intent?: string, language?: string): Promise<MobileAnalysisResult> {
    const res = await fetch(`${currentServerUrl}/api/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ text, intent, language }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Server returned error ${res.status}`);
    }

    return await res.json();
  },

  async sendFollowUp(params: {
    analysisId?: string;
    message: string;
    language?: string;
    history?: Array<{ role: 'user' | 'assistant'; content: string }>;
  }): Promise<FollowUpChatMessage> {
    try {
      const res = await fetch(`${currentServerUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(params),
      });

      if (!res.ok) {
        throw new Error(`Server returned status ${res.status}`);
      }

      const data = await res.json();
      return {
        id: data.messageId || `msg_${Date.now()}`,
        role: 'assistant',
        content: data.content,
        suggestedFollowUps: data.suggestedFollowUps || [],
        createdAt: data.createdAt,
      };
    } catch {
      // Offline fallback reply when server is disconnected
      return {
        id: `offline_msg_${Date.now()}`,
        role: 'assistant',
        content: `FixMate Offline Guidance for: "${params.message}"\n\n• For scams: Never share OTPs, PINs, or install remote access software.\n• For bills: Verify recorded units directly on your physical meter before paying.\n• For subscriptions: Check Play Store or bank autopay mandates to cancel anytime.\n\nConnect to local PC server to unlock complete conversational reasoning.`,
        suggestedFollowUps: ['What is the very next action I should take?'],
        createdAt: new Date().toISOString(),
      };
    }
  },

  async getChatHistory(analysisId: string): Promise<FollowUpChatMessage[]> {
    try {
      const res = await fetch(`${currentServerUrl}/api/chat?analysisId=${encodeURIComponent(analysisId)}`, {
        headers: { Accept: 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        return (data.messages || []).map((m: any) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          createdAt: m.createdAt,
        }));
      }
    } catch {
      // ignore
    }
    return [];
  },

  // History with AsyncStorage Offline Persistence
  async getHistory(): Promise<{ items: any[]; isOffline?: boolean }> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(`${currentServerUrl}/api/history`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (res.ok) {
        const data = await res.json();
        const items = data.items || [];
        await AsyncStorage.setItem(STORAGE_KEYS.CACHED_HISTORY, JSON.stringify(items)).catch(() => {});
        return { items, isOffline: false };
      }
    } catch {
      // Fallback to local cache
    }

    try {
      const cached = await AsyncStorage.getItem(STORAGE_KEYS.CACHED_HISTORY);
      if (cached) {
        return { items: JSON.parse(cached), isOffline: true };
      }
    } catch {
      // ignore
    }

    return { items: [], isOffline: true };
  },

  async deleteHistoryItem(id: string): Promise<void> {
    try {
      await fetch(`${currentServerUrl}/api/history/${id}`, { method: 'DELETE' }).catch(() => {});
    } catch {
      // ignore
    }

    // Update local cache
    try {
      const cached = await AsyncStorage.getItem(STORAGE_KEYS.CACHED_HISTORY);
      if (cached) {
        const items = JSON.parse(cached).filter((i: any) => i.id !== id);
        await AsyncStorage.setItem(STORAGE_KEYS.CACHED_HISTORY, JSON.stringify(items));
      }
    } catch {
      // ignore
    }
  },

  async wipeAllHistory(): Promise<void> {
    try {
      await fetch(`${currentServerUrl}/api/history`, { method: 'DELETE' }).catch(() => {});
    } catch {
      // ignore
    }
    await AsyncStorage.removeItem(STORAGE_KEYS.CACHED_HISTORY).catch(() => {});
  },

  // Tasks with Offline Local Fallback
  async getTasks(): Promise<MobileTaskItem[]> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(`${currentServerUrl}/api/tasks`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (res.ok) {
        const tasks: MobileTaskItem[] = await res.json();
        await AsyncStorage.setItem(STORAGE_KEYS.CACHED_TASKS, JSON.stringify(tasks)).catch(() => {});
        return tasks;
      }
    } catch {
      // Offline fallback
    }

    try {
      const cached = await AsyncStorage.getItem(STORAGE_KEYS.CACHED_TASKS);
      if (cached) return JSON.parse(cached);
    } catch {
      // ignore
    }
    return [];
  },

  async createTask(task: Partial<MobileTaskItem>): Promise<MobileTaskItem> {
    const localNewTask: MobileTaskItem = {
      id: `task_${Date.now()}`,
      title: task.title || 'Untitled Task',
      dueDate: task.dueDate || null,
      time: task.time || null,
      priority: task.priority || 'MEDIUM',
      person: task.person || null,
      notes: task.notes || null,
      completed: false,
      createdAt: new Date().toISOString(),
    };

    try {
      const res = await fetch(`${currentServerUrl}/api/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(task),
      });
      if (res.ok) {
        const saved = await res.json();
        // Update cache
        const tasks = await this.getTasks();
        await AsyncStorage.setItem(
          STORAGE_KEYS.CACHED_TASKS,
          JSON.stringify([saved, ...tasks.filter((t) => t.id !== saved.id)])
        );
        return saved;
      }
    } catch {
      // Offline: save to local cache
    }

    const tasks = await this.getTasks();
    const updated = [localNewTask, ...tasks];
    await AsyncStorage.setItem(STORAGE_KEYS.CACHED_TASKS, JSON.stringify(updated)).catch(() => {});
    return localNewTask;
  },

  async toggleTask(id: string, completed: boolean): Promise<void> {
    // Always update local cache immediately
    try {
      const tasks = await this.getTasks();
      const updated = tasks.map((t) => (t.id === id ? { ...t, completed } : t));
      await AsyncStorage.setItem(STORAGE_KEYS.CACHED_TASKS, JSON.stringify(updated));
    } catch {
      // ignore
    }

    try {
      await fetch(`${currentServerUrl}/api/tasks`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, completed }),
      });
    } catch {
      // ignore if offline
    }
  },

  async deleteTask(id: string): Promise<void> {
    try {
      const tasks = await this.getTasks();
      const updated = tasks.filter((t) => t.id !== id);
      await AsyncStorage.setItem(STORAGE_KEYS.CACHED_TASKS, JSON.stringify(updated));
    } catch {
      // ignore
    }

    try {
      await fetch(`${currentServerUrl}/api/tasks?id=${id}`, { method: 'DELETE' });
    } catch {
      // ignore
    }
  },

  async clearCompletedTasks(): Promise<void> {
    try {
      const tasks = await this.getTasks();
      const updated = tasks.filter((t) => !t.completed);
      await AsyncStorage.setItem(STORAGE_KEYS.CACHED_TASKS, JSON.stringify(updated));
    } catch {
      // ignore
    }

    try {
      await fetch(`${currentServerUrl}/api/tasks?clearCompleted=true`, { method: 'DELETE' });
    } catch {
      // ignore
    }
  },

  // Subscriptions with Offline Persistence
  async getSubscriptions(): Promise<MobileSubscriptionItem[]> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(`${currentServerUrl}/api/subscriptions`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (res.ok) {
        const subs: MobileSubscriptionItem[] = await res.json();
        await AsyncStorage.setItem(STORAGE_KEYS.CACHED_SUBSCRIPTIONS, JSON.stringify(subs)).catch(() => {});
        return subs;
      }
    } catch {
      // Offline fallback
    }

    try {
      const cached = await AsyncStorage.getItem(STORAGE_KEYS.CACHED_SUBSCRIPTIONS);
      if (cached) return JSON.parse(cached);
    } catch {
      // ignore
    }
    return [];
  },

  async createSubscription(sub: {
    merchant: string;
    amount: number;
    currency?: string;
    frequency?: string;
  }): Promise<MobileSubscriptionItem> {
    const numAmt = Number(sub.amount) || 0;
    const freq = sub.frequency || 'monthly';
    let yearly = numAmt * 12;
    if (freq === 'yearly') yearly = numAmt;
    else if (freq === 'quarterly') yearly = numAmt * 4;
    else if (freq === 'weekly') yearly = numAmt * 52;

    const localSub: MobileSubscriptionItem = {
      id: `sub_${Date.now()}`,
      merchant: sub.merchant,
      amount: numAmt,
      currency: sub.currency || '₹',
      frequency: freq,
      estimatedYearlyCost: yearly,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
    };

    try {
      const res = await fetch(`${currentServerUrl}/api/subscriptions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub),
      });
      if (res.ok) {
        const saved = await res.json();
        const subs = await this.getSubscriptions();
        await AsyncStorage.setItem(
          STORAGE_KEYS.CACHED_SUBSCRIPTIONS,
          JSON.stringify([saved, ...subs.filter((s) => s.id !== saved.id)])
        );
        return saved;
      }
    } catch {
      // Offline fallback
    }

    const subs = await this.getSubscriptions();
    const updated = [localSub, ...subs];
    await AsyncStorage.setItem(STORAGE_KEYS.CACHED_SUBSCRIPTIONS, JSON.stringify(updated)).catch(() => {});
    return localSub;
  },

  async toggleSubscription(id: string, currentStatus: string): Promise<void> {
    const newStatus = currentStatus === 'ACTIVE' ? 'CANCELLED' : 'ACTIVE';
    try {
      const subs = await this.getSubscriptions();
      const updated = subs.map((s) => (s.id === id ? { ...s, status: newStatus } : s));
      await AsyncStorage.setItem(STORAGE_KEYS.CACHED_SUBSCRIPTIONS, JSON.stringify(updated));
    } catch {
      // ignore
    }

    try {
      await fetch(`${currentServerUrl}/api/subscriptions`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus }),
      });
    } catch {
      // ignore
    }
  },

  async deleteSubscription(id: string): Promise<void> {
    try {
      const subs = await this.getSubscriptions();
      const updated = subs.filter((s) => s.id !== id);
      await AsyncStorage.setItem(STORAGE_KEYS.CACHED_SUBSCRIPTIONS, JSON.stringify(updated));
    } catch {
      // ignore
    }

    try {
      await fetch(`${currentServerUrl}/api/subscriptions?id=${id}`, { method: 'DELETE' });
    } catch {
      // ignore
    }
  },
};
