import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app/app.module';
import { configureApp, apiUrl } from '../src/app/bootstrap';
import { PrismaService } from '../src/database/prisma.service';
import { hashToken } from '../src/security/tokens';

describe('POST /shares (create share)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const createdEmails: string[] = [];

  interface Account {
    token: string;
    userId: string;
  }

  const uniqueEmail = () => {
    const email = `test-share-${Date.now()}-${Math.floor(Math.random() * 100000)}@example.com`;
    createdEmails.push(email);
    return email;
  };

  const createAccount = async (): Promise<Account> => {
    const email = uniqueEmail();
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

  const uploadFile = async (account: Account): Promise<string> => {
    const res = await request(app.getHttpServer())
      .post(apiUrl('files'))
      .set('Authorization', `Bearer ${account.token}`)
      .attach('file', Buffer.from('share me'), { filename: 'doc.txt', contentType: 'text/plain' })
      .expect(201);
    return res.body.data.id;
  };

  const createShare = (account: Account, body: Record<string, unknown>) =>
    request(app.getHttpServer())
      .post(apiUrl('shares'))
      .set('Authorization', `Bearer ${account.token}`)
      .send(body);

  let alice: Account;
  let bob: Account;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = configureApp(moduleRef.createNestApplication());
    await app.init();
    prisma = app.get(PrismaService);
    alice = await createAccount();
    bob = await createAccount();
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { in: createdEmails } } });
    await app.close();
  });

  it('creates a share and returns the raw token exactly once', async () => {
    const fileId = await uploadFile(alice);
    const res = await createShare(alice, { fileId }).expect(201);

    const share = res.body.data;
    expect(share.fileId).toBe(fileId);
    expect(share.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(share.revokedAt).toBeNull();
    expect(share.allowDownload).toBe(true);
    expect(share.hasPassword).toBe(false);
    expect(share.accessCount).toBe(0);

    const record = await prisma.share.findUnique({ where: { id: share.id } });
    expect(record?.tokenHash).toBe(hashToken(share.token));
    expect(record?.tokenHash).not.toBe(share.token);

    const secondShare = await createShare(alice, { fileId }).expect(201);
    expect(secondShare.body.data.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(secondShare.body.data.token).not.toBe(share.token);

    const json = JSON.stringify(res.body);
    expect(json).not.toContain('tokenHash');
    expect(json).not.toContain('passwordHash');
  });

  it('stores only what is necessary and applies configuration', async () => {
    const fileId = await uploadFile(alice);
    const res = await createShare(alice, {
      fileId,
      expiresInSeconds: 3600,
      maxAccesses: 5,
      allowDownload: false,
      password: 'share-password-1',
      strict: true,
    }).expect(201);

    const share = res.body.data;
    expect(share.hasPassword).toBe(true);
    expect(share.allowDownload).toBe(false);
    expect(share.maxAccesses).toBe(5);
    expect(share.strict).toBe(true);
    expect(new Date(share.expiresAt).getTime()).toBeGreaterThan(Date.now());

    const record = await prisma.share.findUnique({ where: { id: share.id } });
    expect(record?.passwordHash).not.toBeNull();
    expect(record?.passwordHash).not.toContain('share-password-1');
    expect(record?.passwordHash?.startsWith('scrypt$')).toBe(true);
  });

  it('forces a one-time share to a single access', async () => {
    const fileId = await uploadFile(alice);
    const res = await createShare(alice, { fileId, oneTime: true, maxAccesses: 99 }).expect(201);
    expect(res.body.data.oneTime).toBe(true);
    expect(res.body.data.maxAccesses).toBe(1);
  });

  it('refuses to share a file the caller does not own', async () => {
    const fileId = await uploadFile(alice);
    const res = await createShare(bob, { fileId }).expect(404);
    expect(res.body.error.code).toBe('NOT_FOUND');

    const deletedFileId = await uploadFile(alice);
    await request(app.getHttpServer())
      .delete(apiUrl(`files/${deletedFileId}`))
      .set('Authorization', `Bearer ${alice.token}`)
      .expect(200);
    await createShare(alice, { fileId: deletedFileId }).expect(404);
  });

  it('validates the request body', async () => {
    const badFileId = await createShare(alice, { fileId: 'not-a-uuid' }).expect(400);
    expect(badFileId.body.error.code).toBe('VALIDATION_FAILED');

    const fileId = await uploadFile(alice);
    const tooShort = await createShare(alice, { fileId, expiresInSeconds: 5 }).expect(400);
    expect(tooShort.body.error.code).toBe('VALIDATION_FAILED');

    const shortPassword = await createShare(alice, { fileId, password: 'short' }).expect(400);
    expect(shortPassword.body.error.code).toBe('VALIDATION_FAILED');

    const unknownField = await createShare(alice, { fileId, evil: true }).expect(400);
    expect(unknownField.body.error.code).toBe('VALIDATION_FAILED');
  });

  it('requires authentication', async () => {
    await request(app.getHttpServer())
      .post(apiUrl('shares'))
      .send({ fileId: '11111111-1111-1111-1111-111111111111' })
      .expect(401);
  });

  it('records a SHARE_CREATED audit event', async () => {
    const fileId = await uploadFile(alice);
    const res = await createShare(alice, { fileId, password: 'share-password-1' }).expect(201);

    const events = await prisma.auditEvent.findMany({ where: { type: 'SHARE_CREATED', shareId: res.body.data.id } });
    expect(events).toHaveLength(1);
    expect(events[0].actorUserId).toBe(alice.userId);
    expect(events[0].ip).toBeTruthy();
  });
});
