import { NextResponse } from 'next/server';
import { localOllamaProvider } from '@/lib/ai/ollamaProvider';
import { OCRService } from '@/lib/ocr/ocrService';
import { SpeechService } from '@/lib/speech/speechService';
import { prisma } from '@/lib/db/prisma';
import fs from 'fs';
import path from 'path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const startTime = Date.now();

  // 1. Check Server (Next.js & Node runtime)
  const serverStatus = {
    isAvailable: true,
    runtime: 'Node.js',
    nodeVersion: process.version,
    platform: process.platform,
    uptimeSeconds: Math.floor(process.uptime()),
  };

  // 2. Check Database (SQLite via Prisma)
  let dbStatus = false;
  let dbLatencyMs = 0;
  let dbError: string | undefined;
  const dbPath = path.resolve(process.cwd(), 'prisma', 'dev.db');
  const dbFileExists = fs.existsSync(dbPath);

  try {
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = true;
    dbLatencyMs = Date.now() - dbStart;
  } catch (err: unknown) {
    dbStatus = false;
    dbError = err instanceof Error ? err.message : String(err);
  }

  // 3. Check Local AI (Ollama + exact model verification)
  const aiHealth = await localOllamaProvider.checkHealth();

  // 4. Check OCR Engine status (real disk check for eng.traineddata)
  const ocrHealth = OCRService.checkStatus();

  // 5. Check Speech Transcription status (Whisper detection)
  const speechHealth = SpeechService.checkStatus();

  const totalDurationMs = Date.now() - startTime;

  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    durationMs: totalDurationMs,
    server: serverStatus,
    database: {
      isAvailable: dbStatus,
      type: 'SQLite (Prisma)',
      filePath: dbPath,
      fileExists: dbFileExists,
      latencyMs: dbLatencyMs,
      error: dbError,
    },
    localAI: aiHealth,
    ocr: ocrHealth,
    speech: speechHealth,
    privacy: {
      mode: '100% Local / Self-Hosted',
      cloudApisUsed: 'None (No OpenAI, Anthropic, or Gemini paid keys)',
      apiKeyRequired: false,
    },
  });
}
