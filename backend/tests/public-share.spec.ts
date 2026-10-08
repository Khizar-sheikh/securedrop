import { HttpStatus, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app/app.module';
import { apiUrl, configureApp } from '../src/app/bootstrap';
import { ERROR_CODES } from '../src/common/error-codes';
import { PrismaService } from '../src/database/prisma.service';

describe('public share access', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  interface Account {
    token: string;
    userId: string;
  }

  interface ShareRecord {
    id: string;
    token: string;
    [key: string]: unknown;
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = configureApp(moduleRef.createNestApplication());
    await app.init();
    prisma = moduleRef.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  const createAccount = async (): Promise<Account> => {
    const email = `test-open-${Date.now()}-${Math.floor(Math.random() * 100000)}@example.com`;
    await request(app.getHttpServer())
      .post(apiUrl('auth/register'))
      .send({ email, password: 'strong-password-123' })
      .expect(201);
    const login = await request(app.getHttpServer())
      .post(apiUrl('auth/login'))
      .send({ email, password: 'strong-password-123' })
      .expect(200);
    return { token: login.body.data.accessToken, userId: login.body.data.user.id };
  };

  const uploadFile = async (account: Account, name = 'report.txt'): Promise<{ id: string; sizeBytes: number; checksum: string }> => {
    const res = await request(app.getHttpServer())
      .post(apiUrl('files'))
      .set('Authorization', `Bearer ${account.token}`)
      .attach('file', Buffer.from('file content'), { filename: name, contentType: 'text/plain' })
      .expect(201);
    return res.body.data;
  };

  const createShare = async (account: Account, fileId: string, overrides: Record<string, unknown> = {}): Promise<ShareRecord> => {
    const res = await request(app.getHttpServer())
      .post(apiUrl('shares'))
      .set('Authorization', `Bearer ${account.token}`)
      .send({ fileId, ...overrides })
      .expect(201);
    return res.body.data as ShareRecord;
  };

  const open = (
    body: Record<string, unknown>,
    headers: Record<string, string> = {},
  ): Promise<request.Response> =>
    request(app.getHttpServer()).post(apiUrl('public/shares/open')).set(headers).send(body);

  it('opens a valid share with only authorized file information', async () => {
    const account = await createAccount();
    const file = await uploadFile(account);
    const share = await createShare(account, file.id);

    const res = await open({ token: share.token });

    expect(res.status).toBe(HttpStatus.OK);
    expect(res.body.success).toBe(true);
    expect(res.body.data.file).toEqual({
      filename: 'report.txt',
      mimeType: 'text/plain',
      sizeBytes: file.sizeBytes,
      checksum: file.checksum,
    });
    expect(res.body.data.share).toMatchObject({
      accessCount: 1,
      allowDownload: true,
      hasPassword: false,
      maxAccesses: null,
      oneTime: false,
      strict: false,
    });
    expect(res.body.data.session.secret).toEqual(expect.any(String));
    expect(res.body.data.session.expiresAt).toBeTruthy();

    const serialized = JSON.stringify(res.body.data);
    expect(serialized).not.toContain(account.userId);
    expect(serialized).not.toContain(file.id);
    expect(serialized).not.toContain(share.token);
    expect(serialized).not.toContain('storageKey');
  });

  it('rejects malformed tokens', async () => {
    const res = await open({ token: 'nope' });
    expect(res.status).toBe(HttpStatus.NOT_FOUND);
    expect(res.body.error.code).toBe(ERROR_CODES.SHARE_INVALID);
  });

  it('returns the same error for unknown tokens', async () => {
    const res = await open({ token: 'a'.repeat(32) });
    expect(res.status).toBe(HttpStatus.NOT_FOUND);
    expect(res.body.error.code).toBe(ERROR_CODES.SHARE_INVALID);
    expect(res.body.error.message).toBe('This secure link is not valid.');
  });

  it('rejects revoked shares', async () => {
    const account = await createAccount();
    const file = await uploadFile(account);
    const share = await createShare(account, file.id);
    await prisma.share.update({ where: { id: share.id }, data: { revokedAt: new Date() } });

    const res = await open({ token: share.token });
    expect(res.status).toBe(HttpStatus.GONE);
    expect(res.body.error.code).toBe(ERROR_CODES.SHARE_REVOKED);
  });

  it('rejects expired shares', async () => {
    const account = await createAccount();
    const file = await uploadFile(account);
    const share = await createShare(account, file.id, { expiresInSeconds: 3600 });
    await prisma.share.update({
      where: { id: share.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    const res = await open({ token: share.token });
    expect(res.status).toBe(HttpStatus.GONE);
    expect(res.body.error.code).toBe(ERROR_CODES.SHARE_EXPIRED);
  });

  it('rejects shares whose file was deleted', async () => {
    const account = await createAccount();
    const file = await uploadFile(account);
    const share = await createShare(account, file.id);
    await request(app.getHttpServer())
      .delete(apiUrl(`files/${file.id}`))
      .set('Authorization', `Bearer ${account.token}`)
      .expect(200);

    const res = await open({ token: share.token });
    expect(res.status).toBe(HttpStatus.NOT_FOUND);
    expect(res.body.error.code).toBe(ERROR_CODES.SHARE_INVALID);
  });

  it('enforces the access limit', async () => {
    const account = await createAccount();
    const file = await uploadFile(account);
    const share = await createShare(account, file.id, { maxAccesses: 2 });

    expect((await open({ token: share.token })).status).toBe(HttpStatus.OK);
    expect((await open({ token: share.token })).status).toBe(HttpStatus.OK);

    const third = await open({ token: share.token });
    expect(third.status).toBe(HttpStatus.GONE);
    expect(third.body.error.code).toBe(ERROR_CODES.SHARE_ACCESS_LIMIT_REACHED);
  });

  it('never lets parallel opens exceed the access limit', async () => {
    const account = await createAccount();
    const file = await uploadFile(account);
    const share = await createShare(account, file.id, { maxAccesses: 3 });

    const results = await Promise.all(
      Array.from({ length: 8 }, () => open({ token: share.token })),
    );

    const allowed = results.filter((res) => res.status === HttpStatus.OK);
    const limited = results.filter(
      (res) =>
        res.status === HttpStatus.GONE &&
        res.body.error.code === ERROR_CODES.SHARE_ACCESS_LIMIT_REACHED,
    );

    expect(allowed).toHaveLength(3);
    expect(allowed.length + limited.length).toBe(results.length);

    const stored = await prisma.share.findUnique({ where: { id: share.id } });
    expect(stored!.accessCount).toBe(3);
  });

  it('inspects a share without consuming an access', async () => {
    const account = await createAccount();
    const file = await uploadFile(account);
    const share = await createShare(account, file.id, {
      oneTime: true,
      maxAccesses: 1,
      password: 'super-secret-1',
    });

    const res = await open({ token: share.token, inspect: true });

    expect(res.status).toBe(HttpStatus.OK);
    expect(res.body.data.requiresPassword).toBe(true);
    expect(res.body.data.session).toBeUndefined();
    expect(res.body.data.file.filename).toBe('report.txt');
    expect(res.body.data.share.accessCount).toBe(0);
    expect(res.body.data.share.oneTime).toBe(true);

    const stored = await prisma.share.findUnique({ where: { id: share.id } });
    expect(stored!.accessCount).toBe(0);
    expect(stored!.consumedAt).toBeNull();
    expect(
      await prisma.recipientSession.count({ where: { shareId: share.id } }),
    ).toBe(0);
  });

  it('rejects inspection of consumed, revoked or expired shares', async () => {
    const account = await createAccount();
    const file = await uploadFile(account);

    const consumed = await createShare(account, file.id, { oneTime: true, maxAccesses: 1 });
    await open({ token: consumed.token });
    const consumedRes = await open({ token: consumed.token, inspect: true });
    expect(consumedRes.status).toBe(HttpStatus.GONE);
    expect(consumedRes.body.error.code).toBe(ERROR_CODES.SHARE_CONSUMED);

    const revoked = await createShare(account, file.id);
    await prisma.share.update({ where: { id: revoked.id }, data: { revokedAt: new Date() } });
    const revokedRes = await open({ token: revoked.token, inspect: true });
    expect(revokedRes.status).toBe(HttpStatus.GONE);
    expect(revokedRes.body.error.code).toBe(ERROR_CODES.SHARE_REVOKED);
  });

  it('requires then verifies the share password', async () => {
    const account = await createAccount();
    const file = await uploadFile(account);
    const share = await createShare(account, file.id, { password: 'correct horse' });

    const missing = await open({ token: share.token });
    expect(missing.status).toBe(HttpStatus.FORBIDDEN);
    expect(missing.body.error.code).toBe(ERROR_CODES.SHARE_PASSWORD_REQUIRED);

    const wrong = await open({ token: share.token, password: 'wrong battery' });
    expect(wrong.status).toBe(HttpStatus.FORBIDDEN);
    expect(wrong.body.error.code).toBe(ERROR_CODES.SHARE_PASSWORD_INVALID);

    const correct = await open({ token: share.token, password: 'correct horse' });
    expect(correct.status).toBe(HttpStatus.OK);
    expect(correct.body.data.share.hasPassword).toBe(true);
  });

  it('stores only a hash of the session secret and records access metadata', async () => {
    const account = await createAccount();
    const file = await uploadFile(account);
    const share = await createShare(account, file.id);

    const res = await open({ token: share.token }, { 'user-agent': 'jest-agent' });
    const secret: string = res.body.data.session.secret;

    const session = await prisma.recipientSession.findFirst({ where: { shareId: share.id } });
    expect(session).not.toBeNull();
    expect(session!.tokenHash).toHaveLength(64);
    expect(session!.tokenHash).not.toBe(secret);
    expect(session!.shareId).toBe(share.id);
    expect(session!.userAgent).toBe('jest-agent');
    expect(session!.lastAccessAt).not.toBeNull();

    expect(JSON.stringify(session)).not.toContain(secret);
  });

  it('consumes a one-time share after the first open', async () => {
    const account = await createAccount();
    const file = await uploadFile(account);
    const share = await createShare(account, file.id, { oneTime: true, maxAccesses: 1 });

    const first = await open({ token: share.token });
    expect(first.status).toBe(HttpStatus.OK);

    const second = await open({ token: share.token });
    expect(second.status).toBe(HttpStatus.GONE);
    expect(second.body.error.code).toBe(ERROR_CODES.SHARE_CONSUMED);
  });

  it('restores an existing recipient session without consuming another access', async () => {
    const account = await createAccount();
    const file = await uploadFile(account);
    const share = await createShare(account, file.id, { maxAccesses: 2 });

    const first = await open({ token: share.token });
    const secret: string = first.body.data.session.secret;

    const restored = await open({ token: share.token, sessionSecret: secret });
    expect(restored.status).toBe(HttpStatus.OK);
    expect(restored.body.data.session.secret).toBe(secret);
    expect(restored.body.data.share.accessCount).toBe(1);

    const stored = await prisma.share.findUnique({ where: { id: share.id } });
    expect(stored!.accessCount).toBe(1);

    const other = await open({ token: share.token, sessionSecret: 'b'.repeat(40) });
    expect(other.status).toBe(HttpStatus.UNAUTHORIZED);
    expect(other.body.error.code).toBe(ERROR_CODES.RECIPIENT_SESSION_INVALID);
  });

  it('rejects restored sessions after revocation', async () => {
    const account = await createAccount();
    const file = await uploadFile(account);
    const share = await createShare(account, file.id);

    const first = await open({ token: share.token });
    const secret: string = first.body.data.session.secret;
    await prisma.share.update({ where: { id: share.id }, data: { revokedAt: new Date() } });

    const restored = await open({ token: share.token, sessionSecret: secret });
    expect(restored.status).toBe(HttpStatus.GONE);
    expect(restored.body.error.code).toBe(ERROR_CODES.SHARE_REVOKED);
  });

  it('rejects restored sessions after session expiry', async () => {
    const account = await createAccount();
    const file = await uploadFile(account);
    const share = await createShare(account, file.id);

    const first = await open({ token: share.token });
    const secret: string = first.body.data.session.secret;
    await prisma.recipientSession.updateMany({
      where: { shareId: share.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    const restored = await open({ token: share.token, sessionSecret: secret });
    expect(restored.status).toBe(HttpStatus.UNAUTHORIZED);
    expect(restored.body.error.code).toBe(ERROR_CODES.RECIPIENT_SESSION_EXPIRED);
  });

  it('audits recipient session creation and share opens', async () => {
    const account = await createAccount();
    const file = await uploadFile(account);
    const share = await createShare(account, file.id);

    const first = await open({ token: share.token });
    await open({ token: share.token, sessionSecret: first.body.data.session.secret });

    const created = await prisma.auditEvent.count({
      where: { shareId: share.id, type: 'RECIPIENT_SESSION_CREATED' },
    });
    const opened = await prisma.auditEvent.count({
      where: { shareId: share.id, type: 'SHARE_OPENED' },
    });
    expect(created).toBe(1);
    expect(opened).toBe(2);
  });
});
