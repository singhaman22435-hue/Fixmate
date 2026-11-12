/**
 * FixMate Feature 4: What Should I Buy? Purchase Scanner Analyzer
 * Evaluates product screenshots, spec sheets, reviews, and shopping listings.
 * Zero-fabrication: unlisted specifications are explicitly marked not visible.
 */

import { ProductAnalysisResult } from './types';
import { localOllamaProvider } from '../ai/ollamaProvider';
import { PROMPTS, getLanguageInstruction } from '../ai/promptEngine';
import { safeJsonParse } from '../ai/jsonRepair';
import { DeterministicFallbackEngine } from '../ai/deterministicFallback';
import { AnalyzerExecutionOutput } from './screenshotAnalyzer';

export class ProductAnalyzer {
  static async analyze(
    extractedText: string,
    imageBase64?: string,
    language?: string
  ): Promise<AnalyzerExecutionOutput<ProductAnalysisResult>> {
    const tStart = Date.now();
    const fallback = DeterministicFallbackEngine.analyzeProduct(extractedText);

    try {
      const tHealth = Date.now();
      const health = await localOllamaProvider.checkHealth();
      console.log(`[Timer] checkHealth took ${Date.now() - tHealth}ms`);

      if (!health.isAvailable) {
        return {
          data: fallback,
          aiModelUsed: 'deterministic_fallback',
          fallbackUsed: true,
        };
      }

      const options: Parameters<typeof localOllamaProvider.generateCompletion>[1] = {
        systemPrompt: PROMPTS.BUY_ADVISOR + getLanguageInstruction(language),
        format: 'json',
        temperature: 0.1,
      };

      if (imageBase64 && health.hasVisionModel) {
        options.images = [imageBase64];
      }

      const prompt = `Product listing / specifications / screenshot text:\n"""\n${extractedText || 'Analyze the attached product image.'}\n"""`;
      const tGenerate = Date.now();
      const aiRes = await localOllamaProvider.generateCompletion(prompt, options);
      console.log(`[Timer] generateCompletion took ${Date.now() - tGenerate}ms (model: ${aiRes.model})`);

      const tParse = Date.now();
      const parsed = safeJsonParse<ProductAnalysisResult>(aiRes.text, fallback);
      console.log(`[Timer] safeJsonParse took ${Date.now() - tParse}ms (success: ${parsed.success})`);

      if (parsed.success && parsed.data.productName) {
        console.log(`[Timer] Total ProductAnalyzer took ${Date.now() - tStart}ms`);
        return {
          data: {
            ...parsed.data,
            goodFor: Array.isArray(parsed.data.goodFor) ? parsed.data.goodFor : [],
            notIdealFor: Array.isArray(parsed.data.notIdealFor) ? parsed.data.notIdealFor : [],
            pros: Array.isArray(parsed.data.pros) ? parsed.data.pros : [],
            cons: Array.isArray(parsed.data.cons) ? parsed.data.cons : [],
            importantSpecifications: Array.isArray(parsed.data.importantSpecifications)
              ? parsed.data.importantSpecifications
              : [],
            potentialConcerns: Array.isArray(parsed.data.potentialConcerns)
              ? parsed.data.potentialConcerns
              : [],
            questionsToAskBeforeBuying: Array.isArray(parsed.data.questionsToAskBeforeBuying)
              ? parsed.data.questionsToAskBeforeBuying
              : [],
          },
          aiModelUsed: aiRes.model,
          fallbackUsed: false,
        };
      }
    } catch (err: unknown) {
      console.warn('Product AI analyzer failed, using deterministic fallback:', err);
    }

    return {
      data: fallback,
      aiModelUsed: 'deterministic_fallback',
      fallbackUsed: true,
    };
  }
}

