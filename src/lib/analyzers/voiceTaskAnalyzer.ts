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
import { VoiceTaskResultSchema } from '../ai/validationSchemas';

export class VoiceTaskAnalyzer {
  static async analyze(
    transcript: string,
    language?: string
  ): Promise<AnalyzerExecutionOutput<VoiceTaskResult>> {
    const fallback = DeterministicFallbackEngine.analyzeVoiceTasks(transcript);

    try {
      const health = await localOllamaProvider.checkHealth();
      if (!health.isAvailable || !health.hasRequiredModel) {
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

      if (parsed.success) {
        const validated = VoiceTaskResultSchema.safeParse(parsed.data);
        if (validated.success) {
          return {
            data: {
              ...validated.data,
              tasks: validated.data.tasks.map((t) => ({
                ...t,
                dueDate: t.dueDate ?? null,
                time: t.time ?? null,
                person: t.person ?? null,
                notes: t.notes ?? null,
                completed: false,
              })),
            },
            aiModelUsed: aiRes.model,
            fallbackUsed: false,
          };
        }
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

