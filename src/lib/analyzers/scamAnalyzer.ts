/**
 * FixMate Feature 5: Scam Check Analyzer
 * Evaluates phishing messages, urgent SMS, fake prize notices, and unverified payment links.
 * Never asks for secrets, never makes absolute claims of fraud ("shows several scam indicators").
 */

import { ScamCheckResult } from './types';
import { localOllamaProvider } from '../ai/ollamaProvider';
import { PROMPTS, getLanguageInstruction } from '../ai/promptEngine';
import { safeJsonParse } from '../ai/jsonRepair';
import { DeterministicFallbackEngine } from '../ai/deterministicFallback';
import { AnalyzerExecutionOutput } from './screenshotAnalyzer';

export class ScamAnalyzer {
  static async analyze(
    extractedText: string,
    imageBase64?: string,
    language?: string
  ): Promise<AnalyzerExecutionOutput<ScamCheckResult>> {
    const fallback = DeterministicFallbackEngine.analyzeScam(extractedText);

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
        systemPrompt: PROMPTS.SCAM_CHECK + getLanguageInstruction(language),
        format: 'json',
        temperature: 0.1,
      };

      if (imageBase64 && health.hasVisionModel) {
        options.images = [imageBase64];
      }

      const prompt = `Suspicious message / Email / SMS / screenshot text:\n"""\n${extractedText || 'Analyze the attached message image.'}\n"""`;
      const aiRes = await localOllamaProvider.generateCompletion(prompt, options);
      console.log('Scam AI Raw output length:', aiRes.text.length, 'sample:', aiRes.text.substring(0, 150));

      const parsed = safeJsonParse<ScamCheckResult>(aiRes.text, fallback);

      if (parsed.success && parsed.data.riskLevel) {
        return {
          data: {
            ...parsed.data,
            riskIndicators: Array.isArray(parsed.data.riskIndicators) ? parsed.data.riskIndicators : [],
            whatNotToDo: Array.isArray(parsed.data.whatNotToDo) ? parsed.data.whatNotToDo : [],
            whatYouShouldDo: Array.isArray(parsed.data.whatYouShouldDo) ? parsed.data.whatYouShouldDo : [],
            safeNextSteps: Array.isArray(parsed.data.safeNextSteps) ? parsed.data.safeNextSteps : [],
            suspiciousElements: Array.isArray(parsed.data.suspiciousElements) ? parsed.data.suspiciousElements : [],
          },
          aiModelUsed: aiRes.model,
          fallbackUsed: false,
        };
      }
    } catch (err: unknown) {
      console.warn('Scam AI analyzer failed, using deterministic fallback:', err);
    }

    return {
      data: fallback,
      aiModelUsed: 'deterministic_fallback',
      fallbackUsed: true,
    };
  }
}

