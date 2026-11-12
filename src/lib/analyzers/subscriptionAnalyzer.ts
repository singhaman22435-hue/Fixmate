/**
 * FixMate Feature 3: Forgotten Subscription Finder Analyzer
 * Identifies recurring charges, calculates annual burn, and highlights cancellation candidates.
 */

import { SubscriptionAnalysisResult } from './types';
import { localOllamaProvider } from '../ai/ollamaProvider';
import { PROMPTS, getLanguageInstruction } from '../ai/promptEngine';
import { safeJsonParse } from '../ai/jsonRepair';
import { DeterministicFallbackEngine } from '../ai/deterministicFallback';
import { AnalyzerExecutionOutput } from './screenshotAnalyzer';

export class SubscriptionAnalyzer {
  static async analyze(
    extractedText: string,
    imageBase64?: string,
    language?: string
  ): Promise<AnalyzerExecutionOutput<SubscriptionAnalysisResult>> {
    const fallback = DeterministicFallbackEngine.analyzeSubscriptions(extractedText);

    try {
      const health = await localOllamaProvider.checkHealth();
      if (!health.isAvailable) {
        return {
          data: fallback,
          aiModelUsed: 'deterministic_fallback',
          fallbackUsed: true,
        };
      }

      const options: Parameters<typeof localOllamaProvider.generateCompletion>[1] = {
        systemPrompt: PROMPTS.SUBSCRIPTION_FINDER + getLanguageInstruction(language),
        format: 'json',
        temperature: 0.1,
      };

      if (imageBase64 && health.hasVisionModel) {
        options.images = [imageBase64];
      }

      const prompt = `Financial transactions / Statement text:\n"""\n${extractedText || 'Analyze the attached statement image.'}\n"""`;
      const aiRes = await localOllamaProvider.generateCompletion(prompt, options);

      const parsed = safeJsonParse<SubscriptionAnalysisResult>(aiRes.text, fallback);

      if (parsed.success && Array.isArray(parsed.data.detectedSubscriptions)) {
        return {
          data: {
            ...parsed.data,
            detectedSubscriptions: parsed.data.detectedSubscriptions,
            detectedCount: parsed.data.detectedSubscriptions.length,
          },
          aiModelUsed: aiRes.model,
          fallbackUsed: false,
        };
      }
    } catch (err: unknown) {
      console.warn('Subscription AI analyzer failed, using deterministic fallback:', err);
    }

    return {
      data: fallback,
      aiModelUsed: 'deterministic_fallback',
      fallbackUsed: true,
    };
  }
}

