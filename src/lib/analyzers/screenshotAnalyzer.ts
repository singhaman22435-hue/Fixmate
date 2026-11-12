/**
 * FixMate Feature 1: Screenshot → Action Analyzer
 * Analyzes software errors, logs, stack traces, compiler issues, and UI crashes.
 * Enforces safe, non-hallucinated commands and warnings.
 */

import { ScreenshotFixResult } from './types';
import { localOllamaProvider } from '../ai/ollamaProvider';
import { PROMPTS, getLanguageInstruction } from '../ai/promptEngine';
import { safeJsonParse } from '../ai/jsonRepair';
import { DeterministicFallbackEngine } from '../ai/deterministicFallback';
import { ScreenshotFixResultSchema } from '../ai/validationSchemas';

export interface AnalyzerExecutionOutput<T> {
  data: T;
  aiModelUsed: string;
  fallbackUsed: boolean;
}

export class ScreenshotAnalyzer {
  static async analyze(
    extractedText: string,
    imageBase64?: string,
    language?: string
  ): Promise<AnalyzerExecutionOutput<ScreenshotFixResult>> {
    const fallback = DeterministicFallbackEngine.analyzeError(extractedText);

    try {
      const health = await localOllamaProvider.checkHealth();
      if (!health.isAvailable || !health.hasRequiredModel) {
        return {
          data: fallback,
          aiModelUsed: 'deterministic_fallback',
          fallbackUsed: true,
        };
      }

      const options: Parameters<typeof localOllamaProvider.generateCompletion>[1] = {
        systemPrompt: PROMPTS.SCREENSHOT_FIX + getLanguageInstruction(language),
        format: 'json',
        temperature: 0.1,
      };

      if (imageBase64 && health.hasVisionModel) {
        options.images = [imageBase64];
      }

      const prompt = `Error / Stack trace / Screen text:\n"""\n${extractedText || 'No OCR text extracted. Analyze the attached screenshot.'}\n"""`;
      const aiRes = await localOllamaProvider.generateCompletion(prompt, options);

      const parsed = safeJsonParse<ScreenshotFixResult>(aiRes.text, fallback);

      if (parsed.success) {
        const validated = ScreenshotFixResultSchema.safeParse(parsed.data);
        if (validated.success) {
          return {
            data: validated.data,
            aiModelUsed: aiRes.model,
            fallbackUsed: false,
          };
        }
      }
    } catch (err: unknown) {
      console.warn('Screenshot AI analyzer failed, using deterministic fallback:', err);
    }

    return {
      data: fallback,
      aiModelUsed: 'deterministic_fallback',
      fallbackUsed: true,
    };
  }
}

