import { describe, it, expect } from 'vitest';
import { validateIncomingFile } from '../lib/files/fileValidator';

describe('FileValidator', () => {
  it('validates a correct PNG image buffer', () => {
    // PNG magic bytes: 89 50 4E 47
    const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const validated = validateIncomingFile({
      buffer: pngBuffer,
      name: 'screenshot.png',
      type: 'image/png',
      size: pngBuffer.length,
    });

    expect(validated.detectedType).toBe('image');
    expect(validated.mimeType).toBe('image/png');
  });

  it('validates a correct PDF buffer', () => {
    // PDF magic bytes: %PDF-
    const pdfBuffer = Buffer.from('%PDF-1.7 sample data', 'utf-8');
    const validated = validateIncomingFile({
      buffer: pdfBuffer,
      name: 'bill.pdf',
      type: 'application/pdf',
      size: pdfBuffer.length,
    });

    expect(validated.detectedType).toBe('pdf');
  });

  it('rejects spoofed extension with invalid magic bytes', () => {
    const fakeBuffer = Buffer.from('NOT_A_REAL_PNG_DATA', 'utf-8');
    expect(() => {
      validateIncomingFile({
        buffer: fakeBuffer,
        name: 'malicious.png',
        type: 'image/png',
        size: fakeBuffer.length,
      });
    }).toThrow(/signature does not match/i);
  });

  it('rejects oversized files', () => {
    const hugeBuffer = Buffer.alloc(26 * 1024 * 1024); // 26MB
    expect(() => {
      validateIncomingFile({
        buffer: hugeBuffer,
        name: 'huge.pdf',
        type: 'application/pdf',
        size: hugeBuffer.length,
      });
    }).toThrow(/exceeds limit/i);
  });
});

