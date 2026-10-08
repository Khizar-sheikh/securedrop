import { assertPasswordPolicy, hashPassword, PasswordPolicyError, verifyPassword } from '../src/security/password';

describe('password hashing', () => {
  it('hashes a password without storing plaintext', async () => {
    const hash = await hashPassword('correct horse battery staple');
    expect(hash).not.toContain('correct horse');
    expect(hash.startsWith('scrypt$')).toBe(true);
  });

  it('produces a different hash for the same password (random salt)', async () => {
    const a = await hashPassword('same-password-123');
    const b = await hashPassword('same-password-123');
    expect(a).not.toBe(b);
  });

  it('verifies the correct password and rejects the wrong one', async () => {
    const hash = await hashPassword('my-secret-password');
    await expect(verifyPassword('my-secret-password', hash)).resolves.toBe(true);
    await expect(verifyPassword('wrong-password', hash)).resolves.toBe(false);
  });

  it('rejects malformed stored hashes instead of throwing', async () => {
    await expect(verifyPassword('anything', 'not-a-hash')).resolves.toBe(false);
    await expect(verifyPassword('anything', '')).resolves.toBe(false);
    await expect(verifyPassword('anything', 'scrypt$abc')).resolves.toBe(false);
    await expect(verifyPassword('', 'scrypt$16384$8$1$AAAA$AAAA')).resolves.toBe(false);
  });

  it('enforces the password policy', async () => {
    await expect(hashPassword('short')).rejects.toBeInstanceOf(PasswordPolicyError);
    expect(() => assertPasswordPolicy('long-enough-password')).not.toThrow();
    expect(() => assertPasswordPolicy('x'.repeat(500))).toThrow(PasswordPolicyError);
  });
});
