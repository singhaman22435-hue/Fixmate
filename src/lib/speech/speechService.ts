/**
 * FixMate Replaceable Speech-to-Text Service
 * 100% Local & Privacy-first:
 * 1. Direct browser Web Speech API / client dictation
 * 2. Local Whisper CLI / whisper.cpp subprocess transcription if installed
 * 3. Graceful, honest offline status (never invents fake transcripts)
 */

import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import os from 'os';

const execFileAsync = promisify(execFile);

export interface SpeechTranscriptionResult {
  transcript: string;
  durationSeconds?: number;
  confidence: number;
  method: 'client_dictation' | 'local_whisper' | 'unprocessed';
  error?: string;
}

export interface SpeechHealthStatus {
  isAvailable: boolean;
  mode: string;
  whisperBinary: string | null;
  whisperConfigured: boolean;
  notes: string;
}

export class SpeechService {
  /**
   * Check if local Whisper / whisper.cpp is available on the system
   */
  static checkStatus(): SpeechHealthStatus {
    const customWhisperPath = process.env.WHISPER_PATH;
    if (customWhisperPath && fs.existsSync(customWhisperPath)) {
      return {
        isAvailable: true,
        mode: 'Local Whisper Executable',
        whisperBinary: customWhisperPath,
        whisperConfigured: true,
        notes: `Using custom Whisper binary at ${customWhisperPath}`,
      };
    }

    return {
      isAvailable: false,
      mode: 'Client-Side Dictation Only',
      whisperBinary: null,
      whisperConfigured: false,
      notes: 'No local whisper.cpp binary in PATH. Browser speech recognition is used, or transcripts can be typed directly.',
    };
  }

  /**
   * Transcribe an uploaded audio buffer using local Whisper if installed,
   * or use client-provided dictation.
   */
  static async transcribeAudioBuffer(
    audioBuffer: Buffer,
    mimeType: string,
    providedTranscript?: string
  ): Promise<SpeechTranscriptionResult> {
    // 1. If client already supplied a transcript (from Web Speech API or user review)
    if (providedTranscript && providedTranscript.trim().length > 0) {
      return {
        transcript: providedTranscript.trim(),
        confidence: 0.95,
        method: 'client_dictation',
      };
    }

    // 2. Try executing local whisper binary if available
    const status = this.checkStatus();
    if (status.whisperBinary && audioBuffer.length > 0) {
      const tempDir = os.tmpdir();
      const ext = mimeType.includes('wav') ? '.wav' : mimeType.includes('mp3') ? '.mp3' : '.webm';
      const tempAudioPath = path.join(tempDir, `fixmate_audio_${Date.now()}${ext}`);

      try {
        await fs.promises.writeFile(tempAudioPath, audioBuffer);
        const { stdout } = await execFileAsync(status.whisperBinary, [
          tempAudioPath,
          '--output_format',
          'txt',
        ]);
        await fs.promises.unlink(tempAudioPath).catch(() => {});

        const text = stdout.trim();
        if (text) {
          return {
            transcript: text,
            confidence: 0.9,
            method: 'local_whisper',
          };
        }
      } catch (err: unknown) {
        console.warn('Subprocess whisper execution failed:', err);
        await fs.promises.unlink(tempAudioPath).catch(() => {});
      }
    }

    // 3. Honest fallback: do not invent speech
    return {
      transcript:
        providedTranscript?.trim() ||
        'Spoken audio received. Please review your task or add details in the input box.',
      confidence: 0.5,
      method: 'unprocessed',
      error: 'Audio uploaded without transcription. Enable local Whisper or use the mic dictation button.',
    };
  }
}

