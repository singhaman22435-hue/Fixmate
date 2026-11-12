/**
 * FixMate Replaceable OCR Service
 * Uses Tesseract.js for 100% offline, local text extraction from images
 * using the bundled local traineddata file.
 */

import path from 'path';
import fs from 'fs';

export interface OCRResult {
  text: string;
  confidence: number;
  durationMs: number;
}

export interface OCRHealthStatus {
  isAvailable: boolean;
  engine: string;
  trainedDataFound: boolean;
  trainedDataPath: string;
  trainedDataSizeBytes: number;
  mode: string;
  error?: string;
}

let cachedWorker: any = null;

async function getWorker() {
  if (!cachedWorker) {
    try {
      const Tesseract = await import('tesseract.js');
      const createWorkerFn = Tesseract.default?.createWorker || Tesseract.createWorker;
      const cwd = process.cwd();
      const localLangPath = path.resolve(cwd);

      // Explicitly instruct Tesseract to read the uncompressed local eng.traineddata from disk
      cachedWorker = await createWorkerFn('eng', 1, {
        langPath: localLangPath,
        gzip: false,
        cacheMethod: 'none',
      });
    } catch (err: unknown) {
      console.error('Failed to initialize local offline OCR worker:', err);
      cachedWorker = null;
    }
  }
  return cachedWorker;
}

export class OCRService {
  /**
   * Diagnostic check of offline OCR readiness
   */
  static checkStatus(): OCRHealthStatus {
    const cwd = process.cwd();
    const trainedDataPath = path.resolve(cwd, 'eng.traineddata');
    const exists = fs.existsSync(trainedDataPath);
    let size = 0;
    if (exists) {
      try {
        size = fs.statSync(trainedDataPath).size;
      } catch {
        // ignore
      }
    }

    return {
      isAvailable: exists,
      engine: 'Tesseract.js (Bundled Offline Model)',
      trainedDataFound: exists,
      trainedDataPath,
      trainedDataSizeBytes: size,
      mode: '100% Offline (Local traineddata)',
      error: exists ? undefined : 'eng.traineddata missing from project root',
    };
  }

  /**
   * Extract text from an image buffer or base64 string
   */
  static async extractText(imageInput: Buffer | string): Promise<OCRResult> {
    const startTime = Date.now();
    try {
      let buffer: Buffer;
      if (typeof imageInput === 'string') {
        const base64Data = imageInput.replace(/^data:image\/[a-z]+;base64,/, '');
        buffer = Buffer.from(base64Data, 'base64');
      } else {
        buffer = imageInput;
      }

      const worker = await getWorker();
      let text = '';
      let confidence = 0;

      if (worker) {
        const res = await worker.recognize(buffer);
        text = res.data.text || '';
        confidence = (res.data.confidence || 0) / 100;
      } else {
        // Fallback direct recognition using local langPath
        const Tesseract = await import('tesseract.js');
        const recognizeFn = Tesseract.default?.recognize || Tesseract.recognize;
        const res = await recognizeFn(buffer, 'eng', {
          langPath: path.resolve(process.cwd()),
          gzip: false,
        });
        text = res.data.text || '';
        confidence = (res.data.confidence || 0) / 100;
      }

      const cleanedText = text
        .replace(/\r\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

      return {
        text: cleanedText,
        confidence,
        durationMs: Date.now() - startTime,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('OCR processing error:', msg);
      return {
        text: '',
        confidence: 0,
        durationMs: Date.now() - startTime,
      };
    }
  }
}

