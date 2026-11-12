/**
 * FixMate Replaceable OCR Service
 * Uses Tesseract.js for offline, local text extraction from images.
 */

export interface OCRResult {
  text: string;
  confidence: number;
  durationMs: number;
}

let cachedWorker: any = null;

async function getWorker() {
  if (!cachedWorker) {
    try {
      const Tesseract = await import('tesseract.js');
      const createWorkerFn = Tesseract.default?.createWorker || Tesseract.createWorker;
      cachedWorker = await createWorkerFn('eng');
    } catch {
      cachedWorker = null;
    }
  }
  return cachedWorker;
}

export class OCRService {
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
        const Tesseract = await import('tesseract.js');
        const recognizeFn = Tesseract.default?.recognize || Tesseract.recognize;
        const res = await recognizeFn(buffer, 'eng');
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

