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
import { BillAnalysisResultSchema } from '../ai/validationSchemas';

export class BillAnalyzer {
  static async analyze(
    extractedText: string,
    imageBase64?: string,
    language?: string
  ): Promise<AnalyzerExecutionOutput<BillAnalysisResult>> {
    const fallback = DeterministicFallbackEngine.analyzeBill(extractedText);

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

      if (parsed.success) {
        const validated = BillAnalysisResultSchema.safeParse(parsed.data);
        if (validated.success) {
          const isVagueChange =
            !validated.data.changesFromPreviousBill ||
            /not\s*specified|none|n\/a|unknown/i.test(validated.data.changesFromPreviousBill);
          const effectiveChanges =
            isVagueChange &&
            fallback.changesFromPreviousBill &&
            !fallback.changesFromPreviousBill.startsWith('Single billing cycle')
              ? fallback.changesFromPreviousBill
              : (validated.data.changesFromPreviousBill || fallback.changesFromPreviousBill);

          return {
            data: {
              ...validated.data,
              // Merge deterministic findings if LLM missed line items or total
              totalAmount: validated.data.totalAmount ?? fallback.totalAmount,
              dueDate: validated.data.dueDate ?? fallback.dueDate,
              billerName: validated.data.billerName ?? fallback.billerName,
              changesFromPreviousBill: effectiveChanges,
            },
            aiModelUsed: aiRes.model,
            fallbackUsed: false,
          };
        }
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

