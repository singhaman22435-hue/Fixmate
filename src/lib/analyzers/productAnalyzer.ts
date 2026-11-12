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
import { ProductAnalysisResultSchema } from '../ai/validationSchemas';

export class ProductAnalyzer {
  static async analyze(
    extractedText: string,
    imageBase64?: string,
    language?: string
  ): Promise<AnalyzerExecutionOutput<ProductAnalysisResult>> {
    const fallback = DeterministicFallbackEngine.analyzeProduct(extractedText);

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
        systemPrompt: PROMPTS.BUY_ADVISOR + getLanguageInstruction(language),
        format: 'json',
        temperature: 0.1,
      };

      if (imageBase64 && health.hasVisionModel) {
        options.images = [imageBase64];
      }

      const prompt = `Product listing / specifications / screenshot text:\n"""\n${extractedText || 'Analyze the attached product image.'}\n"""`;
      const aiRes = await localOllamaProvider.generateCompletion(prompt, options);

      const parsed = safeJsonParse<ProductAnalysisResult>(aiRes.text, fallback);

      if (parsed.success) {
        const validated = ProductAnalysisResultSchema.safeParse(parsed.data);
        if (validated.success) {
          // Clean product name of prompt artifacts
          const cleanName = (validated.data.productName || fallback.productName)
            .replace(/^(document\s*\/\s*extracted\s*text[:\s]*|verdict[:\s]*)/i, '')
            .trim();

          // Merge deterministic specs if AI omitted them
          const finalSpecs =
            validated.data.importantSpecifications.length > 0 &&
            validated.data.importantSpecifications[0].label !== 'Status'
              ? validated.data.importantSpecifications
              : fallback.importantSpecifications;

          return {
            data: {
              ...validated.data,
              productName: cleanName || fallback.productName,
              price: validated.data.price || fallback.price,
              importantSpecifications: finalSpecs,
            },
            aiModelUsed: aiRes.model,
            fallbackUsed: false,
          };
        }
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

