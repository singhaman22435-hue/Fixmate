import { NextRequest, NextResponse } from 'next/server';
import { UnifiedPipeline } from '@/lib/pipeline/unifiedPipeline';
import { validateIncomingFile } from '@/lib/files/fileValidator';
import { FixMateIntent } from '@/lib/analyzers/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';

    // A. Form Data (File + optional text)
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      const text = (formData.get('text') as string | null) || undefined;
      const intent = (formData.get('intent') as FixMateIntent | null) || undefined;
      const language = (formData.get('language') as string | null) || undefined;
      const saveToHistoryStr = formData.get('saveToHistory') as string | null;
      const saveToHistory = saveToHistoryStr !== 'false';

      if (!file && (!text || text.trim().length === 0)) {
        return NextResponse.json(
          { error: 'Please provide either a file upload or text prompt.' },
          { status: 400 }
        );
      }

      let fileBuffer: Buffer | undefined;
      let fileName: string | undefined;
      let mimeType: string | undefined;

      if (file) {
        const arrayBuffer = await file.arrayBuffer();
        const rawBuffer = Buffer.from(arrayBuffer);

        // Run security and format validations
        const validated = validateIncomingFile({
          buffer: rawBuffer,
          name: file.name,
          type: file.type,
          size: file.size,
        });

        fileBuffer = validated.buffer;
        fileName = validated.originalName;
        mimeType = validated.mimeType;
      }

      const result = await UnifiedPipeline.execute({
        text,
        fileBuffer,
        fileName,
        mimeType,
        explicitIntent: intent,
        language,
        saveToHistory,
      });

      return NextResponse.json(result);
    }

    // B. JSON Body (Text-only prompt)
    if (contentType.includes('application/json')) {
      const body = await req.json();
      const text = (body.text as string | undefined)?.trim();
      const intent = body.intent as FixMateIntent | undefined;
      const language = body.language as string | undefined;
      const saveToHistory = body.saveToHistory !== false;

      if (!text || text.length === 0) {
        return NextResponse.json(
          { error: 'Text query cannot be empty.' },
          { status: 400 }
        );
      }

      const result = await UnifiedPipeline.execute({
        text,
        explicitIntent: intent,
        language,
        saveToHistory,
      });

      return NextResponse.json(result);
    }

    return NextResponse.json(
      { error: 'Unsupported Content-Type. Please use multipart/form-data or application/json.' },
      { status: 415 }
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'An unexpected error occurred during processing.';
    console.error('Error in /api/analyze:', err);

    return NextResponse.json(
      {
        error: errorMsg,
        timestamp: new Date().toISOString(),
      },
      { status: 400 }
    );
  }
}

