/**
 * Upload policy: what may enter private storage, and how a client-supplied
 * filename is normalized before it is ever stored or displayed.
 */
import { open } from 'node:fs/promises';

export const DEFAULT_ALLOWED_MIME = [
  // documents
  'application/pdf',
  'text/plain',
  'text/csv',
  'text/markdown',
  'application/json',
  'application/msword',
  'application/vnd.ms-excel',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  // images (no SVG: it can carry scripts)
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/bmp',
  'image/tiff',
  // audio / video
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
  'audio/mp4',
  'video/mp4',
  'video/webm',
  'video/quicktime',
  // archives
  'application/zip',
  'application/gzip',
  'application/x-tar',
  'application/x-7z-compressed',
];

const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/g;
const MAX_FILENAME_LENGTH = 255;

export interface FilenameResult {
  ok: boolean;
  /** Sanitized display name (only meaningful when ok). */
  value: string;
  reason?: string;
}

/**
 * Reduces a client-supplied name to a safe display filename: no directories,
 * no control characters, bounded length. Never used as a storage key.
 */
export const sanitizeFilename = (raw: unknown): FilenameResult => {
  if (typeof raw !== 'string') {
    return { ok: false, value: '', reason: 'Filename must be text.' };
  }

  // Take only the last path segment, whichever separator was used.
  const base = raw.split(/[\\/]/).pop() ?? '';
  const cleaned = base.replace(CONTROL_CHARACTERS, '').trim();

  if (!cleaned || cleaned === '.' || cleaned === '..') {
    return { ok: false, value: '', reason: 'Filename is missing or invalid.' };
  }

  if (Buffer.byteLength(cleaned, 'utf8') > MAX_FILENAME_LENGTH) {
    // Keep the extension when truncating.
    const dot = cleaned.lastIndexOf('.');
    const ext = dot > 0 && cleaned.length - dot <= 16 ? cleaned.slice(dot) : '';
    const stem = dot > 0 ? cleaned.slice(0, dot) : cleaned;
    const room = MAX_FILENAME_LENGTH - Buffer.byteLength(ext, 'utf8');
    const truncated = Buffer.from(stem, 'utf8').subarray(0, Math.max(room, 1)).toString('utf8').replace(CONTROL_CHARACTERS, '');
    const value = `${truncated}${ext}`.trim();
    if (!value) return { ok: false, value: '', reason: 'Filename is missing or invalid.' };
    return { ok: true, value };
  }

  return { ok: true, value: cleaned };
};

/** Exact match against the configured allowlist (client-declared type). */
export const isAllowedMime = (mimeType: string, allowed: readonly string[]): boolean => {
  if (typeof mimeType !== 'string') return false;
  const normalized = mimeType.toLowerCase().split(';')[0].trim();
  return allowed.includes(normalized);
};

export const normalizeMime = (mimeType: string): string => mimeType.toLowerCase().split(';')[0].trim();

/**
 * Content sniffing: the client-declared MIME type is only trusted after the
 * file's first bytes agree with it. This is a cheap sanity check, not a full
 * parser — downloads are additionally forced to application/octet-stream
 * attachment, so browsers never render stored content inline.
 */
const IMAGE_SIGNATURES: Record<string, (bytes: Buffer) => boolean> = {
  'image/png': (b) =>
    b.length >= 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  'image/jpeg': (b) => b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  'image/gif': (b) => {
    const magic = b.subarray(0, 6).toString('ascii');
    return magic === 'GIF87a' || magic === 'GIF89a';
  },
  'image/webp': (b) =>
    b.length >= 12 && b.subarray(0, 4).toString('ascii') === 'RIFF' && b.subarray(8, 12).toString('ascii') === 'WEBP',
};

const TEXT_LIKE_MIME = new Set(['text/plain', 'text/csv', 'text/markdown', 'application/json']);

const MARKUP_MARKERS = [
  /<\s*!doctype\s+html/i,
  /<\s*html[\s>]/i,
  /<\s*head[\s>]/i,
  /<\s*body[\s>]/i,
  /<\s*svg[\s>]/i,
  /<\s*iframe[\s>]/i,
  /<\s*script[\s>]/i,
];

export interface SniffResult {
  ok: boolean;
  reason?: string;
}

const readFileHead = async (filePath: string, bytes: number): Promise<Buffer> => {
  const handle = await open(filePath, 'r');
  try {
    const buffer = Buffer.alloc(bytes);
    const { bytesRead } = await handle.read(buffer, 0, bytes, 0);
    return buffer.subarray(0, bytesRead);
  } finally {
    await handle.close();
  }
};

/** Rejects spoofed image types and markup/script payloads under text types. */
export const sniffUpload = async (filePath: string, declaredMime: string): Promise<SniffResult> => {
  const head = await readFileHead(filePath, 4096);
  const signature = IMAGE_SIGNATURES[declaredMime];
  if (signature && !signature(head)) {
    return { ok: false, reason: 'File content does not match the declared image type.' };
  }
  if (TEXT_LIKE_MIME.has(declaredMime) && head.length > 0) {
    const text = head.toString('utf8');
    if (MARKUP_MARKERS.some((marker) => marker.test(text))) {
      return {
        ok: false,
        reason: 'File contains HTML/SVG markup, which is not allowed in text uploads.',
      };
    }
  }
  return { ok: true };
};
