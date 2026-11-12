/**
 * FixMate PDF Text Extractor
 * Extracts readable text from PDF buffers.
 */

export interface PDFExtractionResult {
  text: string;
  pageCount: number;
  isScannedDoc: boolean;
  durationMs: number;
}

export class PDFExtractor {
  static async extractText(pdfBuffer: Buffer): Promise<PDFExtractionResult> {
    const startTime = Date.now();
    try {
      // Dynamic import of pdf-parse
      const pdfParseModule = await import('pdf-parse');
      // Handle both ES default export and CommonJS module export
      const pdfParse = (pdfParseModule as unknown as { default?: (buf: Buffer) => Promise<{ text: string; numpages: number }> }).default || (pdfParseModule as unknown as (buf: Buffer) => Promise<{ text: string; numpages: number }>);

      const parsed = await pdfParse(pdfBuffer);
      const cleaned = (parsed.text || '')
        .replace(/\r\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

      const isScannedDoc = cleaned.length < 30 && parsed.numpages > 0;

      return {
        text: cleaned,
        pageCount: parsed.numpages || 1,
        isScannedDoc,
        durationMs: Date.now() - startTime,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('PDF parsing error:', msg);
      return {
        text: '',
        pageCount: 0,
        isScannedDoc: false,
        durationMs: Date.now() - startTime,
      };
    }
  }
}

