/**
 * Upload policy: what may enter private storage, and how a client-supplied
 * filename is normalized before it is ever stored or displayed.
 */

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
