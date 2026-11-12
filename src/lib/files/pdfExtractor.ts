/**
 * FixMate PDF Text Extractor
 * Extracts readable text from text-based PDFs and runs offline OCR on scanned/image-based PDFs.
 */

import { OCRService } from '../ocr/ocrService';

export interface PDFExtractionResult {
  text: string;
  pageCount: number;
  isScannedDoc: boolean;
  scannedOcrApplied?: boolean;
  durationMs: number;
}

/**
 * Extracts embedded JPEG images from a raw PDF buffer
 */
function extractEmbeddedImagesFromPdf(pdfBuffer: Buffer): Buffer[] {
  const images: Buffer[] = [];
  let pos = 0;
  const maxImages = 10; // Process up to 10 pages for speed

  while (pos < pdfBuffer.length && images.length < maxImages) {
    // Search for JPEG Start of Image (SOI) marker: 0xFF, 0xD8, 0xFF
    const start = pdfBuffer.indexOf(Buffer.from([0xff, 0xd8, 0xff]), pos);
    if (start === -1) break;

    // Search for JPEG End of Image (EOI) marker: 0xFF, 0xD9
    const end = pdfBuffer.indexOf(Buffer.from([0xff, 0xd9]), start + 2);
    if (end === -1) break;

    const jpegBuf = pdfBuffer.subarray(start, end + 2);
    // Ignore tiny embedded icons/decorations under 4KB
    if (jpegBuf.length > 4096) {
      images.push(jpegBuf);
    }
    pos = end + 2;
  }

  return images;
}

export class PDFExtractor {
  static async extractText(pdfBuffer: Buffer): Promise<PDFExtractionResult> {
    const startTime = Date.now();
    try {
      // Dynamic import of pdf-parse
      const pdfParseModule = await import('pdf-parse');
      const pdfParse =
        (pdfParseModule as unknown as { default?: (buf: Buffer) => Promise<{ text: string; numpages: number }> }).default ||
        (pdfParseModule as unknown as (buf: Buffer) => Promise<{ text: string; numpages: number }>);

      const parsed = await pdfParse(pdfBuffer);
      let cleaned = (parsed.text || '')
        .replace(/\r\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

      const numPages = parsed.numpages || 1;
      const isScannedDoc = cleaned.length < 40 && numPages > 0;
      let scannedOcrApplied = false;

      // If document contains little to no text glyphs, it is likely a scanned image PDF
      if (isScannedDoc) {
        const embeddedImages = extractEmbeddedImagesFromPdf(pdfBuffer);

        if (embeddedImages.length > 0) {
          const ocrPageResults: string[] = [];

          for (let i = 0; i < embeddedImages.length; i++) {
            const ocr = await OCRService.extractText(embeddedImages[i]);
            if (ocr.text && ocr.text.trim().length > 10) {
              ocrPageResults.push(`[Scanned Page ${i + 1} OCR]:\n${ocr.text.trim()}`);
            }
          }

          if (ocrPageResults.length > 0) {
            cleaned = ocrPageResults.join('\n\n');
            scannedOcrApplied = true;
          }
        }
      }

      return {
        text: cleaned,
        pageCount: numPages,
        isScannedDoc,
        scannedOcrApplied,
        durationMs: Date.now() - startTime,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('PDF parsing error:', msg);

      // Even if pdf-parse fails on malformed headers, try image-based OCR extraction directly
      const images = extractEmbeddedImagesFromPdf(pdfBuffer);
      if (images.length > 0) {
        try {
          const ocrPageResults: string[] = [];
          for (let i = 0; i < images.length; i++) {
            const ocr = await OCRService.extractText(images[i]);
            if (ocr.text && ocr.text.trim().length > 10) {
              ocrPageResults.push(`[Scanned Page ${i + 1} OCR]:\n${ocr.text.trim()}`);
            }
          }
          if (ocrPageResults.length > 0) {
            return {
              text: ocrPageResults.join('\n\n'),
              pageCount: images.length,
              isScannedDoc: true,
              scannedOcrApplied: true,
              durationMs: Date.now() - startTime,
            };
          }
        } catch {
          // ignore
        }
      }

      return {
        text: '',
        pageCount: 0,
        isScannedDoc: false,
        durationMs: Date.now() - startTime,
      };
    }
  }
}

