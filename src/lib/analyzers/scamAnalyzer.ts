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
import { ScamCheckResultSchema } from '../ai/validationSchemas';

export class ScamAnalyzer {
  static async analyze(
    extractedText: string,
    imageBase64?: string,
    language?: string
  ): Promise<AnalyzerExecutionOutput<ScamCheckResult>> {
    const fallback = DeterministicFallbackEngine.analyzeScam(extractedText);

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
        systemPrompt: PROMPTS.SCAM_CHECK + getLanguageInstruction(language),
        format: 'json',
        temperature: 0.1,
      };

      if (imageBase64 && health.hasVisionModel) {
        options.images = [imageBase64];
      }

      const prompt = `Suspicious message / Email / SMS / screenshot text:\n"""\n${extractedText || 'Analyze the attached message image.'}\n"""`;
      const aiRes = await localOllamaProvider.generateCompletion(prompt, options);

      const parsed = safeJsonParse<ScamCheckResult>(aiRes.text, fallback);

      if (parsed.success) {
        const validated = ScamCheckResultSchema.safeParse(parsed.data);
        if (validated.success) {
          // If deterministic engine detected high-risk OTP or malicious links, ensure they are preserved
          const combinedIndicators = Array.from(
            new Set([...validated.data.riskIndicators, ...fallback.riskIndicators])
          );
          const combinedElements = [
            ...validated.data.suspiciousElements,
            ...fallback.suspiciousElements.filter(
              (fe) => !validated.data.suspiciousElements.some((ve) => ve.text === fe.text)
            ),
          ];

          // Calibrated risk level: take the higher of the two assessments
          const finalRisk =
            fallback.riskLevel === 'HIGH' || validated.data.riskLevel === 'HIGH'
              ? 'HIGH'
              : fallback.riskLevel === 'MEDIUM' || validated.data.riskLevel === 'MEDIUM'
              ? 'MEDIUM'
              : 'LOW';

          return {
            data: {
              ...validated.data,
              riskLevel: finalRisk,
              riskScore: Math.max(validated.data.riskScore, fallback.riskScore),
              riskIndicators: combinedIndicators,
              suspiciousElements: combinedElements,
            },
            aiModelUsed: aiRes.model,
            fallbackUsed: false,
          };
        }
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

