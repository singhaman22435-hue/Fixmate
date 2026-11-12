import { AICompletionOptions, AICompletionResult, AIHealthStatus, AIModelInfo, AIProvider } from './types';

export class OllamaProvider implements AIProvider {
  name = 'Ollama (Local)';
  private baseUrl: string;
  private defaultModel: string;
  private defaultVisionModel: string;
  private defaultTimeoutMs: number;

  constructor() {
    this.baseUrl = (process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434').replace(/\/$/, '');
    this.defaultModel = process.env.OLLAMA_MODEL || 'llama3.2';
    this.defaultVisionModel = process.env.OLLAMA_VISION_MODEL || 'llama3.2-vision';
    this.defaultTimeoutMs = parseInt(process.env.OLLAMA_TIMEOUT_MS || '60000', 10);
  }

  private cachedHealth: AIHealthStatus | null = null;
  private lastHealthCheck = 0;

  async checkHealth(): Promise<AIHealthStatus> {
    const now = Date.now();
    if (this.cachedHealth && now - this.lastHealthCheck < 30000) {
      return this.cachedHealth;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const res = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        return {
          isAvailable: false,
          provider: 'offline_deterministic',
          baseUrl: this.baseUrl,
          models: [],
          selectedModel: this.defaultModel,
          selectedVisionModel: this.defaultVisionModel,
          hasRequiredModel: false,
          hasVisionModel: false,
          error: `Ollama returned HTTP ${res.status}: ${res.statusText}`,
        };
      }

      const data = await res.json();
      const rawModels = data.models || [];
      const models: AIModelInfo[] = rawModels.map((m: { name: string; size?: number; digest?: string; modified_at?: string; capabilities?: string }) => {
        const nameLower = (m.name || '').toLowerCase();
        const capabilitiesStr = typeof m.capabilities === 'string' ? m.capabilities.toLowerCase() : '';
        const isVision =
          nameLower.includes('vision') ||
          nameLower.includes('llava') ||
          nameLower.includes('qwen3.5') ||
          capabilitiesStr.includes('vision');
        return {
          name: m.name,
          size: m.size,
          digest: m.digest,
          modifiedAt: m.modified_at,
          isVisionCapable: isVision,
        };
      });

      const modelNames = models.map((m) => m.name.toLowerCase());
      const hasRequiredModel = modelNames.some(
        (name) => name.includes(this.defaultModel.toLowerCase()) || name.includes('llama') || name.includes('mistral') || name.includes('qwen')
      );
      const hasVisionModel = models.some((m) => m.isVisionCapable);

      const detectedVisionModel = models.find((m) => m.isVisionCapable)?.name || this.defaultVisionModel;
      const detectedDefaultModel = models.length > 0 ? models[0].name : this.defaultModel;

      const healthResult: AIHealthStatus = {
        isAvailable: true,
        provider: 'ollama',
        baseUrl: this.baseUrl,
        models,
        selectedModel: detectedDefaultModel,
        selectedVisionModel: detectedVisionModel,
        hasRequiredModel,
        hasVisionModel,
      };

      this.cachedHealth = healthResult;
      this.lastHealthCheck = now;
      return healthResult;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        isAvailable: false,
        provider: 'offline_deterministic',
        baseUrl: this.baseUrl,
        models: [],
        selectedModel: this.defaultModel,
        selectedVisionModel: this.defaultVisionModel,
        hasRequiredModel: false,
        hasVisionModel: false,
        error: message.includes('abort') ? 'Connection timed out connecting to Ollama' : 'Ollama is not running locally',
      };
    }
  }

  async generateCompletion(prompt: string, options: AICompletionOptions = {}): Promise<AICompletionResult> {
    const startTime = Date.now();
    let model = options.model;

    // Use cached model detection (avoids redundant 200-500ms network requests)
    if (!model) {
      if (this.cachedHealth?.isAvailable) {
        model = (options.images && options.images.length > 0)
          ? this.cachedHealth.selectedVisionModel
          : this.cachedHealth.selectedModel;
      } else {
        model = (options.images && options.images.length > 0)
          ? this.defaultVisionModel
          : this.defaultModel;
      }
    }

    if (!model) {
      model = options.images && options.images.length > 0 ? this.defaultVisionModel : this.defaultModel;
    }

    const timeout = options.timeoutMs || this.defaultTimeoutMs;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const payload: Record<string, unknown> = {
        model,
        prompt,
        stream: false,
        think: false, // Disables thinking tokens for sub-second direct generation
        keep_alive: '60m', // Keeps model hot in GPU memory so there is 0ms reload latency
        options: {
          temperature: options.temperature ?? 0.1,
          num_predict: options.maxTokens ?? 350,
          num_ctx: 4096, // Fixed 4096 context prevents Ollama from re-initializing KV-cache runner (saves 8-10s)
          top_p: 0.9,
          top_k: 40,
        },
      };

      if (options.systemPrompt) {
        payload.system = options.systemPrompt;
      }

      if (options.format === 'json') {
        payload.format = 'json';
      }

      if (options.images && options.images.length > 0) {
        // Strip data:image/...;base64, prefixes if included
        payload.images = options.images.map((img) => img.replace(/^data:image\/[a-z]+;base64,/, ''));
      }

      const res = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const errorText = await res.text().catch(() => '');
        throw new Error(`Ollama generation failed [${res.status}]: ${errorText || res.statusText}`);
      }

      const data = await res.json();
      const outputText = (data.response && data.response.trim().length > 0)
        ? data.response
        : (data.thinking || '');

      return {
        text: outputText,
        model,
        durationMs: Date.now() - startTime,
        rawResponse: data,
      };
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`Ollama Error: ${message}`);
    }
  }
}

export const localOllamaProvider = new OllamaProvider();

