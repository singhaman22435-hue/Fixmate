/**
 * FixMate Feature 7: General Help & Everyday Problem Solver Analyzer
 * Provides structured, jargon-free explanations and immediate next steps for everyday confusion.
 */

import { GeneralHelpResult } from './types';
import { localOllamaProvider } from '../ai/ollamaProvider';
import { PROMPTS, getLanguageInstruction } from '../ai/promptEngine';
import { safeJsonParse } from '../ai/jsonRepair';
import { DeterministicFallbackEngine } from '../ai/deterministicFallback';
import { AnalyzerExecutionOutput } from './screenshotAnalyzer';

export class GeneralAnalyzer {
  static async analyze(
    queryText: string,
    imageBase64?: string,
    language?: string
  ): Promise<AnalyzerExecutionOutput<GeneralHelpResult>> {
    const fallback = DeterministicFallbackEngine.analyzeGeneral(queryText);

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
        systemPrompt: PROMPTS.GENERAL_HELP + getLanguageInstruction(language),
        format: 'json',
        temperature: 0.2,
      };

      if (imageBase64 && health.hasVisionModel) {
        options.images = [imageBase64];
      }

      const prompt = `User request / Query / Document:\n"""\n${queryText}\n"""`;
      const aiRes = await localOllamaProvider.generateCompletion(prompt, options);

      const parsed = safeJsonParse<GeneralHelpResult>(aiRes.text, fallback);

      if (parsed.success && parsed.data.summary) {
        return {
          data: {
            ...parsed.data,
            keyTakeaways: Array.isArray(parsed.data.keyTakeaways) ? parsed.data.keyTakeaways : [],
            recommendedActions: Array.isArray(parsed.data.recommendedActions)
              ? parsed.data.recommendedActions
              : [],
          },
          aiModelUsed: aiRes.model,
          fallbackUsed: false,
        };
      }
    } catch (err: unknown) {
      console.warn('General AI analyzer failed, using deterministic fallback:', err);
    }

    return {
      data: fallback,
      aiModelUsed: 'deterministic_fallback',
      fallbackUsed: true,
    };
  }
}

