import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

/**
 * Password hashing with scrypt (Node stdlib — no native dependency).
 * Stored format: scrypt$N$r$p$<salt base64url>$<hash base64url>
 */
const N = 16384;
const R = 8;
const P = 1;
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;
const MAX_PASSWORD_LENGTH = 200;

const scryptAsync = (password: string, salt: Buffer, n: number, r: number, p: number): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    scrypt(
      password,
      salt,
      KEY_LENGTH,
      { N: n, r, p, maxmem: 256 * 1024 * 1024 },
      (error, derivedKey) => (error ? reject(error) : resolve(derivedKey)),
    );
  });

export class PasswordPolicyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PasswordPolicyError';
  }
}

/** Server-side password policy. Returns nothing, throws when invalid. */
export const assertPasswordPolicy = (password: string): void => {
  if (typeof password !== 'string' || password.length < 8) {
    throw new PasswordPolicyError('Password must be at least 8 characters.');
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    throw new PasswordPolicyError('Password is too long.');
  }
};

export const hashPassword = async (password: string): Promise<string> => {
  assertPasswordPolicy(password);
  const salt = randomBytes(SALT_LENGTH);
  const derived = await scryptAsync(password, salt, N, R, P);
  return `scrypt$${N}$${R}$${P}$${salt.toString('base64url')}$${derived.toString('base64url')}`;
};

/** Constant-time password verification. Never throws on malformed input. */
export const verifyPassword = async (password: string, stored: string): Promise<boolean> => {
  if (typeof password !== 'string' || typeof stored !== 'string') return false;
  if (password.length === 0 || password.length > MAX_PASSWORD_LENGTH) return false;

  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;

  const n = Number.parseInt(parts[1], 10);
  const r = Number.parseInt(parts[2], 10);
  const p = Number.parseInt(parts[3], 10);
  if (!Number.isFinite(n) || !Number.isFinite(r) || !Number.isFinite(p)) return false;

  let salt: Buffer;
  let expected: Buffer;
  try {
    salt = Buffer.from(parts[4], 'base64url');
    expected = Buffer.from(parts[5], 'base64url');
  } catch {
    return false;
  }
  if (salt.length === 0 || expected.length === 0) return false;

  try {
    const derived = await scryptAsync(password, salt, n, r, p);
    return derived.length === expected.length && timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
};
