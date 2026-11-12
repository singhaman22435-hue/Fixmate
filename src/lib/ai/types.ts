export interface AIModelInfo {
  name: string;
  size?: number;
  digest?: string;
  modifiedAt?: string;
  isVisionCapable?: boolean;
}

export interface AIHealthStatus {
  isAvailable: boolean;
  provider: 'ollama' | 'offline_deterministic';
  baseUrl: string;
  models: AIModelInfo[];
  selectedModel: string;
  selectedVisionModel: string;
  hasRequiredModel: boolean;
  hasVisionModel: boolean;
  error?: string;
}

export interface AICompletionOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  format?: 'json';
  systemPrompt?: string;
  images?: string[]; // base64 strings for multimodal/vision
  timeoutMs?: number;
}

export interface AICompletionResult {
  text: string;
  model: string;
  durationMs: number;
  rawResponse?: unknown;
}

export interface AIProvider {
  name: string;
  checkHealth(): Promise<AIHealthStatus>;
  generateCompletion(prompt: string, options?: AICompletionOptions): Promise<AICompletionResult>;
}

