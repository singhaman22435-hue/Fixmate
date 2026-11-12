/**
 * FixMate Feature 2: Bill & Invoice Explainer Analyzer
 * Extracts breakdown, due date, unusual charges, and provides clear explanations.
 * Never guesses missing numbers.
 */

import { BillAnalysisResult } from './types';
import { localOllamaProvider } from '../ai/ollamaProvider';
import { PROMPTS, getLanguageInstruction } from '../ai/promptEngine';
import { safeJsonParse } from '../ai/jsonRepair';
import { DeterministicFallbackEngine } from '../ai/deterministicFallback';
import { AnalyzerExecutionOutput } from './screenshotAnalyzer';

export class BillAnalyzer {
  static async analyze(
    extractedText: string,
    imageBase64?: string,
    language?: string
  ): Promise<AnalyzerExecutionOutput<BillAnalysisResult>> {
    const fallback = DeterministicFallbackEngine.analyzeBill(extractedText);

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
        systemPrompt: PROMPTS.BILL_EXPLAINER + getLanguageInstruction(language),
        format: 'json',
        temperature: 0.1,
      };

      if (imageBase64 && health.hasVisionModel) {
        options.images = [imageBase64];
      }

      const prompt = `Bill / Invoice Document Content:\n"""\n${extractedText || 'Analyze the attached bill image.'}\n"""`;
      const aiRes = await localOllamaProvider.generateCompletion(prompt, options);

      const parsed = safeJsonParse<BillAnalysisResult>(aiRes.text, fallback);

      if (parsed.success && (parsed.data.totalAmount !== undefined || parsed.data.whyYouArePayingThis)) {
        return {
          data: {
            ...parsed.data,
            chargeBreakdown: Array.isArray(parsed.data.chargeBreakdown) ? parsed.data.chargeBreakdown : [],
            unusualCharges: Array.isArray(parsed.data.unusualCharges) ? parsed.data.unusualCharges : [],
            thingsToCheck: Array.isArray(parsed.data.thingsToCheck) ? parsed.data.thingsToCheck : [],
            importantDates: Array.isArray(parsed.data.importantDates) ? parsed.data.importantDates : [],
          },
          aiModelUsed: aiRes.model,
          fallbackUsed: false,
        };
      }
    } catch (err: unknown) {
      console.warn('Bill AI analyzer failed, using deterministic fallback:', err);
    }

    return {
      data: fallback,
      aiModelUsed: 'deterministic_fallback',
      fallbackUsed: true,
    };
  }
}

