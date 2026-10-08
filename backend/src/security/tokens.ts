import { createHash, randomBytes } from 'node:crypto';

/** Cryptographically secure opaque token (base64url, 256 bits). */
export const generateToken = (bytes = 32): string => randomBytes(bytes).toString('base64url');

/** SHA-256 hex — used so raw tokens/secrets are never stored. */
export const hashToken = (token: string): string =>
  createHash('sha256').update(token, 'utf8').digest('hex');

/** Timing-safe comparison of two hex digests of equal expected length. */
export const safeEquals = (a: string, b: string): boolean => {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
};
