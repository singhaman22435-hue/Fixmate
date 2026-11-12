import { Platform, NativeModules } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  SERVER_URL: '@fixmate_server_url',
  CACHED_TASKS: '@fixmate_cached_tasks',
  CACHED_SUBSCRIPTIONS: '@fixmate_cached_subscriptions',
  CACHED_HISTORY: '@fixmate_cached_history',
};

/**
 * Automatically determine best server URL based on the runtime environment
 * Never hardcodes a single user's home Wi-Fi IP.
 */
export function getAutoDetectedServerUrl(): string {
  // 1. Environment variable if bundled
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL.replace(/\/$/, '');
  }

  // 2. Metro Bundler scriptURL host dynamically (adapts to whatever Wi-Fi IP the PC is currently on!)
  try {
    const scriptURL: string | undefined = NativeModules?.SourceCode?.scriptURL;
    if (scriptURL) {
      const match = scriptURL.match(/^https?:\/\/([^:\/]+)/);
      if (match && match[1]) {
        const host = match[1];
        if (host !== 'localhost' && host !== '127.0.0.1' && host !== '10.0.2.2') {
          return `http://${host}:3000`;
        }
      }
    }
  } catch {
    // ignore
  }

  // 3. Android Emulator uses 10.0.2.2 for host machine; iOS uses localhost
  return Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';
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

export const ApiService = {
  async getStatus(): Promise<{
    isAvailable: boolean;
    localAI: any;
    database: any;
    ocr: any;
    speech: any;
    privacy: any;
  }> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    try {
      const res = await fetch(`${currentServerUrl}/api/system/status`, {
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
