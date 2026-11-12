/**
 * FixMate Feature 6: Voice Note → To-Do Analyzer
 * Transforms spoken dictations into actionable, prioritized task checklists.
 * Preserves ambiguity: never invents unstated dates or deadlines.
 */

import { VoiceTaskResult } from './types';
import { localOllamaProvider } from '../ai/ollamaProvider';
import { PROMPTS, getLanguageInstruction } from '../ai/promptEngine';
import { safeJsonParse } from '../ai/jsonRepair';
import { DeterministicFallbackEngine } from '../ai/deterministicFallback';
import { AnalyzerExecutionOutput } from './screenshotAnalyzer';

export class VoiceTaskAnalyzer {
  static async analyze(
    transcript: string,
    language?: string
  ): Promise<AnalyzerExecutionOutput<VoiceTaskResult>> {
    const fallback = DeterministicFallbackEngine.analyzeVoiceTasks(transcript);

    try {
      const health = await localOllamaProvider.checkHealth();
      if (!health.isAvailable) {
        return {
          data: fallback,
          aiModelUsed: 'deterministic_fallback',
          fallbackUsed: true,
        };
      }

      const prompt = `Spoken transcript / dictation notes:\n"""\n${transcript}\n"""`;
      const aiRes = await localOllamaProvider.generateCompletion(prompt, {
        systemPrompt: PROMPTS.VOICE_TODO + getLanguageInstruction(language),
        format: 'json',
        temperature: 0.1,
      });

      const parsed = safeJsonParse<VoiceTaskResult>(aiRes.text, fallback);

      if (parsed.success && Array.isArray(parsed.data.tasks)) {
        return {
          data: {
            ...parsed.data,
            tasks: parsed.data.tasks.map((t) => ({
              ...t,
              completed: false,
            })),
            detectedPeople: Array.isArray(parsed.data.detectedPeople) ? parsed.data.detectedPeople : [],
            detectedDates: Array.isArray(parsed.data.detectedDates) ? parsed.data.detectedDates : [],
          },
          aiModelUsed: aiRes.model,
          fallbackUsed: false,
        };
      }
    } catch (err: unknown) {
      console.warn('Voice Task AI analyzer failed, using deterministic fallback:', err);
    }

    return {
      data: fallback,
      aiModelUsed: 'deterministic_fallback',
      fallbackUsed: true,
    };
  }
}

