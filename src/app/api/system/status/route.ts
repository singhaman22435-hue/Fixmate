import { NextResponse } from 'next/server';
import { localOllamaProvider } from '@/lib/ai/ollamaProvider';
import { prisma } from '@/lib/db/prisma';

export async function GET() {
  const startTime = Date.now();

  // 1. Check Database (SQLite via Prisma)
  let dbStatus = false;
  let dbLatencyMs = 0;
  let dbError: string | undefined;

  try {
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = true;
    dbLatencyMs = Date.now() - dbStart;
  } catch (err: unknown) {
    dbStatus = false;
    dbError = err instanceof Error ? err.message : String(err);
  }

  // 2. Check Local AI (Ollama)
  const aiHealth = await localOllamaProvider.checkHealth();

  // 3. OCR Engine status
  const ocrStatus = {
    isAvailable: true,
    engine: 'Tesseract.js (Offline Local Engine)',
  };

  const totalDurationMs = Date.now() - startTime;

  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    durationMs: totalDurationMs,
    database: {
      isAvailable: dbStatus,
      type: 'SQLite (Local File)',
      latencyMs: dbLatencyMs,
      error: dbError,
    },
    localAI: aiHealth,
    ocr: ocrStatus,
    privacy: {
      mode: '100% Local Processing',
      cloudApisUsed: 'None (No OpenAI, No Gemini, No Cloud LLM)',
      apiKeyRequired: false,
    },
  });
}

