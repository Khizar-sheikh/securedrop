import { HttpStatus, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { Response as SuperagentResponse } from 'superagent';
import { AppModule } from '../src/app/app.module';
import { apiUrl, configureApp } from '../src/app/bootstrap';
import { ERROR_CODES } from '../src/common/error-codes';
import { PrismaService } from '../src/database/prisma.service';

const responseParser = (
  res: SuperagentResponse,
  cb: (error: Error | null, body?: Buffer | Record<string, unknown>) => void,
): void => {
  const chunks: Buffer[] = [];
  res.on('data', (chunk: Buffer) => chunks.push(chunk));
  res.on('error', (error: Error) => cb(error));
  res.on('end', () => {
    const raw = Buffer.concat(chunks);
    if ((res.headers['content-type'] ?? '').includes('application/json')) {
      try {
        cb(null, JSON.parse(raw.toString('utf8')) as Record<string, unknown>);
      } catch (error) {
        cb(error as Error);
      }
      return;
    }
    cb(null, raw);
  });
};

describe('secure share download', () => {
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

  const FILE_CONTENT = 'secret file contents for download tests';

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
    const email = `test-dl-${Date.now()}-${Math.floor(Math.random() * 100000)}@example.com`;
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

  const uploadFile = async (account: Account, name = 'secret.txt'): Promise<{ id: string }> => {
    const res = await request(app.getHttpServer())
      .post(apiUrl('files'))
      .set('Authorization', `Bearer ${account.token}`)
      .attach('file', Buffer.from(FILE_CONTENT), { filename: name, contentType: 'text/plain' })
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

  const openShare = async (token: string): Promise<string> => {
    const res = await request(app.getHttpServer())
      .post(apiUrl('public/shares/open'))
      .send({ token })
      .expect(HttpStatus.OK);
    return res.body.data.session.secret as string;
  };

  const download = (body: Record<string, unknown>) =>
    request(app.getHttpServer())
      .post(apiUrl('public/shares/download'))
      .buffer(true)
      .parse(responseParser)
      .send(body);

  it('streams the file as an attachment with safe headers', async () => {
    const account = await createAccount();
    const file = await uploadFile(account);
    const share = await createShare(account, file.id);
    const sessionSecret = await openShare(share.token);

    const res = await download({ token: share.token, sessionSecret });

    expect(res.status).toBe(HttpStatus.OK);
    expect(res.headers['content-type']).toBe('application/octet-stream');
    expect(res.headers['content-disposition']).toContain('attachment');
    expect(res.headers['content-disposition']).toContain('secret.txt');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['cache-control']).toBe('no-store');
    expect(res.headers['content-length']).toBe(String(Buffer.byteLength(FILE_CONTENT)));
    expect(Buffer.isBuffer(res.body)).toBe(true);
    expect((res.body as Buffer).toString('utf8')).toBe(FILE_CONTENT);
  });

  it('increments the download counter and audits the download', async () => {
    const account = await createAccount();
    const file = await uploadFile(account);
    const share = await createShare(account, file.id);
    const sessionSecret = await openShare(share.token);

    await download({ token: share.token, sessionSecret }).expect(HttpStatus.OK);
    await download({ token: share.token, sessionSecret }).expect(HttpStatus.OK);

    const stored = await prisma.share.findUnique({ where: { id: share.id } });
    expect(stored!.downloadCount).toBe(2);

    const events = await prisma.auditEvent.findMany({
      where: { shareId: share.id, type: 'SHARE_DOWNLOADED' },
    });
    expect(events).toHaveLength(2);
    expect(events.every((event) => event.recipientSessionId !== null)).toBe(true);

    const session = await prisma.recipientSession.findFirst({ where: { shareId: share.id } });
    expect(session!.lastAccessAt.getTime()).toBeGreaterThanOrEqual(session!.createdAt.getTime());
  });

  it('rejects requests without a recipient session', async () => {
    const account = await createAccount();
    const file = await uploadFile(account);
    const share = await createShare(account, file.id);

    const res = await download({ token: share.token });
    expect(res.status).toBe(HttpStatus.UNAUTHORIZED);
    expect(res.body.error.code).toBe(ERROR_CODES.RECIPIENT_SESSION_INVALID);

    const denied = await prisma.auditEvent.count({
      where: { shareId: share.id, type: 'ACCESS_DENIED', metadata: { path: ['reason'], equals: 'session_invalid' } },
    });
    expect(denied).toBe(1);
  });

  it('rejects a session that belongs to another share', async () => {
    const account = await createAccount();
    const first = await uploadFile(account, 'first.txt');
    const second = await uploadFile(account, 'second.txt');
    const shareOne = await createShare(account, first.id);
    const shareTwo = await createShare(account, second.id);
    const sessionSecret = await openShare(shareOne.token);

    const res = await download({ token: shareTwo.token, sessionSecret });
    expect(res.status).toBe(HttpStatus.UNAUTHORIZED);
    expect(res.body.error.code).toBe(ERROR_CODES.RECIPIENT_SESSION_INVALID);
  });

  it('rejects downloads from a revoked share', async () => {
    const account = await createAccount();
    const file = await uploadFile(account);
    const share = await createShare(account, file.id);
    const sessionSecret = await openShare(share.token);
    await request(app.getHttpServer())
      .delete(apiUrl(`shares/${share.id}`))
      .set('Authorization', `Bearer ${account.token}`)
      .expect(200);

    const res = await download({ token: share.token, sessionSecret });
    expect(res.status).toBe(HttpStatus.GONE);
    expect(res.body.error.code).toBe(ERROR_CODES.SHARE_REVOKED);

    const denied = await prisma.auditEvent.count({
      where: { shareId: share.id, type: 'ACCESS_DENIED', metadata: { path: ['reason'], equals: 'revoked' } },
    });
    expect(denied).toBe(1);
    const stored = await prisma.share.findUnique({ where: { id: share.id } });
    expect(stored!.downloadCount).toBe(0);
  });

  it('rejects downloads from an expired share', async () => {
    const account = await createAccount();
    const file = await uploadFile(account);
    const share = await createShare(account, file.id, { expiresInSeconds: 3600 });
    const sessionSecret = await openShare(share.token);
    await prisma.share.update({
      where: { id: share.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    const res = await download({ token: share.token, sessionSecret });
    expect(res.status).toBe(HttpStatus.GONE);
    expect(res.body.error.code).toBe(ERROR_CODES.SHARE_EXPIRED);
  });

  it('rejects downloads when the owner disabled them', async () => {
    const account = await createAccount();
    const file = await uploadFile(account);
    const share = await createShare(account, file.id, { allowDownload: false });
    const sessionSecret = await openShare(share.token);

    const res = await download({ token: share.token, sessionSecret });
    expect(res.status).toBe(HttpStatus.FORBIDDEN);
    expect(res.body.error.code).toBe(ERROR_CODES.DOWNLOAD_NOT_ALLOWED);

    const denied = await prisma.auditEvent.count({
      where: { shareId: share.id, type: 'ACCESS_DENIED', metadata: { path: ['reason'], equals: 'download_not_allowed' } },
    });
    expect(denied).toBe(1);
  });

  it('rejects downloads for a deleted file', async () => {
    const account = await createAccount();
    const file = await uploadFile(account);
    const share = await createShare(account, file.id);
    const sessionSecret = await openShare(share.token);
    await request(app.getHttpServer())
      .delete(apiUrl(`files/${file.id}`))
      .set('Authorization', `Bearer ${account.token}`)
      .expect(200);

    const res = await download({ token: share.token, sessionSecret });
    expect(res.status).toBe(HttpStatus.NOT_FOUND);
    expect(res.body.error.code).toBe(ERROR_CODES.SHARE_INVALID);
  });

  it('requires re-authentication on a strict share when the IP changes', async () => {
    const account = await createAccount();
    const file = await uploadFile(account);
    const share = await createShare(account, file.id, { strict: true });
    const sessionSecret = await openShare(share.token);

    const unchanged = await download({ token: share.token, sessionSecret });
    expect(unchanged.status).toBe(HttpStatus.OK);

    const session = await prisma.recipientSession.findFirst({ where: { shareId: share.id } });
    await prisma.recipientSession.update({
      where: { id: session!.id },
      data: { ip: '203.0.113.5' },
    });

    const changed = await download({ token: share.token, sessionSecret });
    expect(changed.status).toBe(HttpStatus.UNAUTHORIZED);
    expect(changed.body.error.code).toBe(ERROR_CODES.REAUTHENTICATION_REQUIRED);

    const events = await prisma.auditEvent.count({
      where: {
        shareId: share.id,
        type: 'SESSION_CHANGED',
        metadata: { path: ['reason'], equals: 'strict_environment_change' },
      },
    });
    expect(events).toBe(1);
  });

  it('allows an IP change on a normal share but records it', async () => {
    const account = await createAccount();
    const file = await uploadFile(account);
    const share = await createShare(account, file.id);
    const sessionSecret = await openShare(share.token);

    const session = await prisma.recipientSession.findFirst({ where: { shareId: share.id } });
    await prisma.recipientSession.update({
      where: { id: session!.id },
      data: { ip: '203.0.113.9' },
    });

    const res = await download({ token: share.token, sessionSecret });
    expect(res.status).toBe(HttpStatus.OK);

    const updated = await prisma.recipientSession.findUnique({ where: { id: session!.id } });
    expect(updated!.ip).not.toBe('203.0.113.9');

    const events = await prisma.auditEvent.count({
      where: { shareId: share.id, type: 'SESSION_CHANGED', metadata: { path: ['reason'], equals: 'ip_change' } },
    });
    expect(events).toBe(1);
  });

  it('lets the consuming session download a one-time share', async () => {
    const account = await createAccount();
    const file = await uploadFile(account);
    const share = await createShare(account, file.id, { oneTime: true, maxAccesses: 1 });
    const sessionSecret = await openShare(share.token);

    const res = await download({ token: share.token, sessionSecret });
    expect(res.status).toBe(HttpStatus.OK);

    const reopen = await request(app.getHttpServer())
      .post(apiUrl('public/shares/open'))
      .send({ token: share.token })
      .expect(HttpStatus.GONE);
    expect(reopen.body.error.code).toBe(ERROR_CODES.SHARE_CONSUMED);
  });

  it('rejects malformed tokens', async () => {
    const res = await download({ token: 'nope', sessionSecret: 'x'.repeat(40) });
    expect(res.status).toBe(HttpStatus.NOT_FOUND);
    expect(res.body.error.code).toBe(ERROR_CODES.SHARE_INVALID);
  });
});
