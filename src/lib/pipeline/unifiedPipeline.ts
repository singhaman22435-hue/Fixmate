/**
 * FixMate Unified AI Pipeline
 * Orchestrates: User Input -> Extraction -> Intent Detection -> Specialized Analyzer
 * -> AI / Fallback Reasoning -> Validation -> Action Layer -> Local Persistence
 */

import {
  FixMateInputType,
  FixMateIntent,
  PipelineExecutionResult,
  UnifiedAnalysisResultPayload,
} from '../analyzers/types';
import { IntentDetector } from '../analyzers/intentDetector';
import { OCRService } from '../ocr/ocrService';
import { PDFExtractor } from '../files/pdfExtractor';
import { CSVExtractor } from '../files/csvExtractor';
import { SpeechService } from '../speech/speechService';
import { ScreenshotAnalyzer } from '../analyzers/screenshotAnalyzer';
import { BillAnalyzer } from '../analyzers/billAnalyzer';
import { SubscriptionAnalyzer } from '../analyzers/subscriptionAnalyzer';
import { ProductAnalyzer } from '../analyzers/productAnalyzer';
import { ScamAnalyzer } from '../analyzers/scamAnalyzer';
import { VoiceTaskAnalyzer } from '../analyzers/voiceTaskAnalyzer';
import { GeneralAnalyzer } from '../analyzers/generalAnalyzer';
import { prisma } from '../db/prisma';

export interface PipelineExecutionInput {
  text?: string;
  fileBuffer?: Buffer;
  fileName?: string;
  mimeType?: string;
  explicitIntent?: FixMateIntent;
  language?: string;
  saveToHistory?: boolean;
}

export class UnifiedPipeline {
  static async execute(input: PipelineExecutionInput): Promise<PipelineExecutionResult> {
    const saveToHistory = input.saveToHistory ?? true;

    // 1. Determine Input Type
    let inputType: FixMateInputType = 'text';
    if (input.mimeType) {
      const mime = input.mimeType.toLowerCase();
      if (mime.startsWith('image/')) inputType = 'image';
      else if (mime === 'application/pdf') inputType = 'pdf';
      else if (mime.startsWith('audio/')) inputType = 'audio';
      else if (mime === 'text/csv' || input.fileName?.endsWith('.csv')) inputType = 'csv';
    }

    // 2. Extraction Layer
    let extractedText = '';
    let imageBase64: string | undefined;

    if (inputType === 'image' && input.fileBuffer) {
      imageBase64 = `data:${input.mimeType || 'image/png'};base64,${input.fileBuffer.toString('base64')}`;
      const ocr = await OCRService.extractText(input.fileBuffer);
      extractedText = ocr.text;
    } else if (inputType === 'pdf' && input.fileBuffer) {
      const pdfRes = await PDFExtractor.extractText(input.fileBuffer);
      extractedText = pdfRes.text;
    } else if (inputType === 'csv' && input.fileBuffer) {
      const csvStr = input.fileBuffer.toString('utf-8');
      const csvRes = CSVExtractor.extract(csvStr);
      extractedText = csvRes.textRepresentation;
    } else if (inputType === 'audio' && input.fileBuffer) {
      const speechRes = await SpeechService.transcribeAudioBuffer(
        input.fileBuffer,
        input.mimeType || 'audio/webm',
        input.text
      );
      extractedText = speechRes.transcript;
    }

    // Combine extracted text with explicit user query
    const combinedContent = [
      input.text ? `User Question/Note: ${input.text.trim()}` : '',
      extractedText ? `Document / Extracted Text:\n${extractedText.trim()}` : '',
    ]
      .filter(Boolean)
      .join('\n\n')
      .trim();

    // 3. Intent Detection
    const intentResult = await IntentDetector.detect(
      combinedContent,
      inputType,
      input.explicitIntent
    );
    const intent = intentResult.intent;

    // 4. Specialized Analyzer Execution
    let resultPayload: UnifiedAnalysisResultPayload;
    let aiModelUsed = 'deterministic_fallback';
    let fallbackUsed = true;
    let title = 'FixMate Analysis';
    let summary = 'Problem analyzed successfully.';
    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | undefined;

    // Smart vision routing: if OCR already cleanly extracted rich text, skip sending heavy vision tokens (cuts latency by ~70%)
    const hasRichOcr = Boolean(extractedText && extractedText.trim().length > 40);
    const visionImage = hasRichOcr ? undefined : imageBase64;

    switch (intent) {
      case 'TECHNICAL_ERROR': {
        const out = await ScreenshotAnalyzer.analyze(combinedContent, visionImage, input.language);
        resultPayload = { type: 'TECHNICAL_ERROR', data: out.data };
        aiModelUsed = out.aiModelUsed;
        fallbackUsed = out.fallbackUsed;
        title = out.data.problemDetected || 'Technical Error Solution';
        summary = out.data.shortExplanation;
        break;
      }
      case 'BILL_EXPLANATION': {
        const out = await BillAnalyzer.analyze(combinedContent, visionImage, input.language);
        resultPayload = { type: 'BILL_EXPLANATION', data: out.data };
        aiModelUsed = out.aiModelUsed;
        fallbackUsed = out.fallbackUsed;
        title = out.data.billerName
          ? `${out.data.billerName} Bill Explanation`
          : 'Bill & Invoice Analysis';
        summary = out.data.whyYouArePayingThis;
        break;
      }
      case 'SUBSCRIPTION_ANALYSIS': {
        const out = await SubscriptionAnalyzer.analyze(combinedContent, visionImage, input.language);
        resultPayload = { type: 'SUBSCRIPTION_ANALYSIS', data: out.data };
        aiModelUsed = out.aiModelUsed;
        fallbackUsed = out.fallbackUsed;
        title = `Subscription Audit (${out.data.detectedCount} detected)`;
        summary = out.data.summary;
        break;
      }
      case 'PRODUCT_ANALYSIS': {
        const out = await ProductAnalyzer.analyze(combinedContent, visionImage, input.language);
        resultPayload = { type: 'PRODUCT_ANALYSIS', data: out.data };
        aiModelUsed = out.aiModelUsed;
        fallbackUsed = out.fallbackUsed;
        const cleanName = (out.data.productName || '')
          .replace(/^(document\s*\/\s*extracted\s*text[:\s]*|verdict[:\s]*)/i, '')
          .trim();
        title = cleanName ? cleanName : 'Product Purchase Scanner';
        summary = out.data.quickVerdict;
        break;
      }
      case 'SCAM_ANALYSIS': {
        const out = await ScamAnalyzer.analyze(combinedContent, visionImage, input.language);
        resultPayload = { type: 'SCAM_ANALYSIS', data: out.data };
        aiModelUsed = out.aiModelUsed;
        fallbackUsed = out.fallbackUsed;
        riskLevel = out.data.riskLevel;
        title = `Scam Risk Assessment: ${out.data.riskLevel} Risk`;
        summary = out.data.whyThisIsSuspicious;
        break;
      }
      case 'VOICE_TASK_EXTRACTION': {
        const out = await VoiceTaskAnalyzer.analyze(combinedContent || input.text || 'Spoken task input', input.language);
        resultPayload = { type: 'VOICE_TASK_EXTRACTION', data: out.data };
        aiModelUsed = out.aiModelUsed;
        fallbackUsed = out.fallbackUsed;
        title = `Extracted To-Do List (${out.data.tasks.length} items)`;
        summary = out.data.summary;
        break;
      }
      case 'GENERAL_QUESTION':
      case 'DOCUMENT_EXPLANATION':
      default: {
        const out = await GeneralAnalyzer.analyze(combinedContent || input.text || 'Everyday Problem Solver', visionImage, input.language);
        resultPayload = { type: 'GENERAL_QUESTION', data: out.data };
        aiModelUsed = out.aiModelUsed;
        fallbackUsed = out.fallbackUsed;
        title = 'FixMate Problem Solver';
        summary = out.data.summary;
        break;
      }
    }

    // 5. Local Persistence (SQLite via Prisma)
    let analysisId: string | undefined;

    if (saveToHistory) {
      try {
        const record = await prisma.analysis.create({
          data: {
            title,
            intent,
            inputType,
            summary,
            confidence: intentResult.confidence,
            riskLevel: riskLevel || null,
            rawInput: input.text?.substring(0, 1000) || null,
            processedText: extractedText ? extractedText.substring(0, 5000) : null,
            resultJson: JSON.stringify(resultPayload),
            aiModelUsed,
            status: 'completed',
            inputs: input.fileName
              ? {
                  create: [
                    {
                      type: inputType,
                      fileName: input.fileName,
                      fileSize: input.fileBuffer?.length || 0,
                      mimeType: input.mimeType || 'text/plain',
                    },
                  ],
                }
              : undefined,
          },
        });

        analysisId = record.id;

        // Note: Tasks from voice are NOT automatically persisted into the user's active
        // task list until the user reviews and confirms them on the result screen.
        // This prevents ambiguous or unconfirmed voice notes from polluting the task database.

        // Persist detected subscriptions if subscription analysis
        if (
          resultPayload.type === 'SUBSCRIPTION_ANALYSIS' &&
          resultPayload.data.detectedSubscriptions.length > 0
        ) {
          await prisma.subscriptionItem.createMany({
            data: resultPayload.data.detectedSubscriptions.map((s) => ({
              analysisId: record.id,
              merchant: s.merchant,
              amount: s.amount,
              currency: s.currency,
              frequency: s.frequency,
              estimatedYearlyCost: s.estimatedYearlyCost,
              confidence: s.confidence,
              lastDetectedDate: s.lastDetectedDate || null,
              status: 'ACTIVE',
            })),
          });
        }
      } catch (err: unknown) {
        console.error('Failed to persist analysis to local SQLite:', err);
      }
    }

    return {
      analysisId,
      intent,
      inputType,
      title,
      summary,
      confidence: intentResult.confidence,
      riskLevel,
      extractedText,
      result: resultPayload,
      aiModelUsed,
      fallbackUsed,
    };
  }
}

