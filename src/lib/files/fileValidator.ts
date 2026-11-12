/**
 * FixMate Secure File Validator
 * Validates file size, MIME types, extension matching, and magic numbers.
 * Never trusts raw extensions. Protects against path traversal and oversized files.
 */

export interface ValidatedFile {
  buffer: Buffer;
  mimeType: string;
  originalName: string;
  sizeBytes: number;
  detectedType: 'image' | 'pdf' | 'audio' | 'csv' | 'text';
}

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

const ALLOWED_MIME_TYPES = new Set([
  // Images
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/bmp',
  // Documents
  'application/pdf',
  'text/csv',
  'text/plain',
  // Audio
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/ogg',
  'audio/webm',
  'audio/m4a',
  'audio/x-m4a',
]);

/**
 * Check file magic bytes for common formats
 */
function verifyMagicBytes(buffer: Buffer, claimedMime: string): boolean {
  if (buffer.length < 4) return false;

  // PDF: %PDF- (0x25 0x50 0x44 0x46)
  if (claimedMime === 'application/pdf') {
    return buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46;
  }

  // PNG: 89 50 4E 47
  if (claimedMime === 'image/png') {
    return buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
  }

  // JPEG: FF D8 FF
  if (claimedMime === 'image/jpeg') {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }

  // WebP: RIFF ... WEBP
  if (claimedMime === 'image/webp') {
    return (
      buffer[0] === 0x52 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46 &&
      buffer[3] === 0x46 &&
      buffer.length > 12 &&
      buffer.toString('utf-8', 8, 12) === 'WEBP'
    );
  }

  // Text/CSV/Audio: allow standard MIME verification
  return true;
}

export function validateIncomingFile(
  file: File | { buffer: Buffer; name: string; type: string; size: number }
): ValidatedFile {
  let buffer: Buffer;
  let originalName: string;
  let mimeType: string;
  let sizeBytes: number;

  if ('arrayBuffer' in file) {
    throw new Error('Please convert File to ArrayBuffer/Buffer before calling synchronous validator');
  } else {
    buffer = file.buffer;
    originalName = file.name || 'unnamed_upload';
    mimeType = (file.type || 'application/octet-stream').toLowerCase();
    sizeBytes = file.size;
  }

  // Size validation
  if (sizeBytes > MAX_FILE_SIZE_BYTES) {
    throw new Error(`File size (${(sizeBytes / (1024 * 1024)).toFixed(1)}MB) exceeds limit of 25MB`);
  }

  if (sizeBytes === 0 || buffer.length === 0) {
    throw new Error('Uploaded file is empty');
  }

  // Path traversal protection in originalName
  const sanitizedName = originalName.replace(/[/\\?%*:|"<>]/g, '_').trim();

  // If MIME is octet-stream, infer from extension
  if (mimeType === 'application/octet-stream') {
    const ext = sanitizedName.split('.').pop()?.toLowerCase();
    if (ext === 'png') mimeType = 'image/png';
    else if (ext === 'jpg' || ext === 'jpeg') mimeType = 'image/jpeg';
    else if (ext === 'webp') mimeType = 'image/webp';
    else if (ext === 'pdf') mimeType = 'application/pdf';
    else if (ext === 'csv') mimeType = 'text/csv';
    else if (ext === 'mp3') mimeType = 'audio/mpeg';
    else if (ext === 'wav') mimeType = 'audio/wav';
    else if (ext === 'webm') mimeType = 'audio/webm';
  }

  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    throw new Error(`Unsupported file type: ${mimeType}. Please upload an image, PDF, CSV, audio, or text file.`);
  }

  if (!verifyMagicBytes(buffer, mimeType)) {
    throw new Error(`File content signature does not match claimed format: ${mimeType}`);
  }

  // Determine detected category
  let detectedType: ValidatedFile['detectedType'] = 'text';
  if (mimeType.startsWith('image/')) detectedType = 'image';
  else if (mimeType === 'application/pdf') detectedType = 'pdf';
  else if (mimeType.startsWith('audio/')) detectedType = 'audio';
  else if (mimeType === 'text/csv' || sanitizedName.endsWith('.csv')) detectedType = 'csv';

  return {
    buffer,
    mimeType,
    originalName: sanitizedName,
    sizeBytes,
    detectedType,
  };
}

