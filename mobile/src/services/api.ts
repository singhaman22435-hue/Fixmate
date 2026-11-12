import { Platform, NativeModules } from 'react-native';

export function getAutoDetectedServerUrl(): string {
  // 1. Production URL from environment (e.g., https://api.fixmate.app or cloud server)
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL.replace(/\/$/, '');
  }

  // 2. Development Auto-Detection from Metro bundler host IP
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
    // Fallback if NativeModules not available
  }

  // 3. Fallback for Android dev
  return Platform.OS === 'android' ? 'http://192.168.1.2:3000' : 'http://localhost:3000';
}

export const DEFAULT_SERVER_URL = getAutoDetectedServerUrl();

let currentServerUrl = DEFAULT_SERVER_URL;

export function setApiServerUrl(url: string) {
  currentServerUrl = url.replace(/\/$/, '');
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
    privacy: any;
  }> {
    const res = await fetch(`${currentServerUrl}/api/system/status`, {
      method: 'GET',
    });
    if (!res.ok) throw new Error(`Status check failed: HTTP ${res.status}`);
    return await res.json();
  },

  async analyze(formData: FormData): Promise<MobileAnalysisResult> {
    const res = await fetch(`${currentServerUrl}/api/analyze`, {
      method: 'POST',
      body: formData,
      headers: {
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Server returned error ${res.status}`);
    }

    return await res.json();
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

  async getHistory(): Promise<{ items: any[] }> {
    const res = await fetch(`${currentServerUrl}/api/history`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) throw new Error('Failed to retrieve history');
    return await res.json();
  },

  async deleteHistoryItem(id: string): Promise<void> {
    await fetch(`${currentServerUrl}/api/history/${id}`, { method: 'DELETE' });
  },

  async wipeAllHistory(): Promise<void> {
    await fetch(`${currentServerUrl}/api/history`, { method: 'DELETE' });
  },

  // Tasks API
  async getTasks(): Promise<MobileTaskItem[]> {
    try {
      const res = await fetch(`${currentServerUrl}/api/tasks`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) return [];
      return await res.json();
    } catch {
      return [];
    }
  },

  async createTask(task: Partial<MobileTaskItem>): Promise<MobileTaskItem> {
    const res = await fetch(`${currentServerUrl}/api/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(task),
    });
    if (!res.ok) throw new Error('Failed to create task');
    return await res.json();
  },

  async toggleTask(id: string, completed: boolean): Promise<void> {
    await fetch(`${currentServerUrl}/api/tasks`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, completed }),
    });
  },

  async deleteTask(id: string): Promise<void> {
    await fetch(`${currentServerUrl}/api/tasks?id=${id}`, { method: 'DELETE' });
  },

  async clearCompletedTasks(): Promise<void> {
    await fetch(`${currentServerUrl}/api/tasks?clearCompleted=true`, { method: 'DELETE' });
  },

  // Subscriptions API
  async getSubscriptions(): Promise<MobileSubscriptionItem[]> {
    try {
      const res = await fetch(`${currentServerUrl}/api/subscriptions`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) return [];
      return await res.json();
    } catch {
      return [];
    }
  },

  async createSubscription(sub: {
    merchant: string;
    amount: number;
    currency?: string;
    frequency?: string;
  }): Promise<MobileSubscriptionItem> {
    const res = await fetch(`${currentServerUrl}/api/subscriptions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sub),
    });
    if (!res.ok) throw new Error('Failed to create subscription');
    return await res.json();
  },

  async toggleSubscription(id: string, currentStatus: string): Promise<void> {
    const newStatus = currentStatus === 'ACTIVE' ? 'CANCELLED' : 'ACTIVE';
    await fetch(`${currentServerUrl}/api/subscriptions`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: newStatus }),
    });
  },

  async deleteSubscription(id: string): Promise<void> {
    await fetch(`${currentServerUrl}/api/subscriptions?id=${id}`, { method: 'DELETE' });
  },
};
