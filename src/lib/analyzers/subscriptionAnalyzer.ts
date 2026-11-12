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
import { SubscriptionAnalysisResultSchema } from '../ai/validationSchemas';

export class SubscriptionAnalyzer {
  static async analyze(
    extractedText: string,
    imageBase64?: string,
    language?: string
  ): Promise<AnalyzerExecutionOutput<SubscriptionAnalysisResult>> {
    const fallback = DeterministicFallbackEngine.analyzeSubscriptions(extractedText);

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

      if (parsed.success) {
        const validated = SubscriptionAnalysisResultSchema.safeParse(parsed.data);
        if (validated.success) {
          // If fallback found more deterministic transactions, merge them
          const finalSubscriptions =
            validated.data.detectedSubscriptions.length > 0
              ? validated.data.detectedSubscriptions
              : fallback.detectedSubscriptions;

          const totalMonthly = finalSubscriptions.reduce((acc, s) => {
            if (s.frequency === 'monthly') return acc + s.amount;
            if (s.frequency === 'yearly') return acc + s.amount / 12;
            if (s.frequency === 'quarterly') return acc + (s.amount * 4) / 12;
            if (s.frequency === 'weekly') return acc + (s.amount * 52) / 12;
            return acc + s.amount;
          }, 0);

          const totalYearly = finalSubscriptions.reduce((acc, s) => acc + s.estimatedYearlyCost, 0);

          return {
            data: {
              detectedSubscriptions: finalSubscriptions,
              totalMonthlySpend: Math.round(totalMonthly * 100) / 100,
              totalYearlySpend: Math.round(totalYearly * 100) / 100,
              potentialSavings: finalSubscriptions.length > 0 ? Math.round(totalYearly * 0.25 * 100) / 100 : 0,
              summary:
                validated.data.summary ||
                `Identified ${finalSubscriptions.length} subscriptions totaling ₹${Math.round(totalMonthly)}/month.`,
              detectedCount: finalSubscriptions.length,
            },
            aiModelUsed: aiRes.model,
            fallbackUsed: false,
          };
        }
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

