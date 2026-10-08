import { HttpStatus, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app/app.module';
import { apiUrl, configureApp } from '../src/app/bootstrap';

describe('owner activity feed', () => {
  let app: INestApplication;

  interface Account {
    token: string;
    userId: string;
  }

  interface ShareRecord {
    id: string;
    token: string;
    [key: string]: unknown;
  }

  const FILE_CONTENT = 'activity feed file content';

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = configureApp(moduleRef.createNestApplication());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  const createAccount = async (): Promise<Account> => {
    const email = `test-audit-${Date.now()}-${Math.floor(Math.random() * 100000)}@example.com`;
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

  const uploadFile = async (account: Account, name = 'resume.txt'): Promise<any> => {
    const res = await request(app.getHttpServer())
      .post(apiUrl('files'))
      .set('Authorization', `Bearer ${account.token}`)
      .attach('file', Buffer.from(FILE_CONTENT), { filename: name, contentType: 'text/plain' })
      .expect(201);
    return res.body.data;
  };

  const createShare = async (account: Account, fileId: string): Promise<ShareRecord> => {
    const res = await request(app.getHttpServer())
      .post(apiUrl('shares'))
      .set('Authorization', `Bearer ${account.token}`)
      .send({ fileId })
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

  const downloadShare = (token: string, sessionSecret: string) =>
    request(app.getHttpServer())
      .post(apiUrl('public/shares/download'))
      .send({ token, sessionSecret });

  const feed = (account: Account, query = '') =>
    request(app.getHttpServer())
      .get(apiUrl(`audit${query}`))
      .set('Authorization', `Bearer ${account.token}`);

  it('shows the owner the whole lifecycle of their share, newest first', async () => {
    const alice = await createAccount();
    const file = await uploadFile(alice);
    const share = await createShare(alice, file.id);
    const sessionSecret = await openShare(share.token);
    await downloadShare(share.token, sessionSecret).expect(HttpStatus.OK);

    await request(app.getHttpServer())
      .delete(apiUrl(`shares/${share.id}`))
      .set('Authorization', `Bearer ${alice.token}`)
      .expect(200);
    await downloadShare(share.token, sessionSecret).expect(HttpStatus.GONE);

    const res = await feed(alice).expect(200);
    const items = res.body.data.items as Array<{ type: string; filename: string | null; reason: string | null; ip: string | null }>;
    const types = items.map((item) => item.type);

    expect(types).toEqual(expect.arrayContaining([
      'USER_REGISTERED',
      'FILE_UPLOADED',
      'SHARE_CREATED',
      'SHARE_OPENED',
      'SHARE_DOWNLOADED',
      'SHARE_REVOKED',
      'ACCESS_DENIED',
      'RECIPIENT_SESSION_CREATED',
    ]));

    const downloaded = items.find((item) => item.type === 'SHARE_DOWNLOADED');
    expect(downloaded!.filename).toBe('resume.txt');
    expect(downloaded!.ip).not.toBeNull();

    const denied = items.find((item) => item.type === 'ACCESS_DENIED');
    expect(denied!.reason).toBe('revoked');

    const timestamps = (res.body.data.items as Array<{ createdAt: string }>).map((item) => new Date(item.createdAt).getTime());
    expect([...timestamps].sort((a, b) => b - a)).toEqual(timestamps);
  });

  it('never exposes internal identifiers, sessions or tokens', async () => {
    const alice = await createAccount();
    const file = await uploadFile(alice, 'private.txt');
    const share = await createShare(alice, file.id);
    const sessionSecret = await openShare(share.token);
    await downloadShare(share.token, sessionSecret).expect(HttpStatus.OK);

    const res = await feed(alice).expect(200);
    const raw = JSON.stringify(res.body);

    expect(raw).not.toContain('recipientSessionId');
    expect(raw).not.toContain('tokenHash');
    expect(raw).not.toContain('userAgent');
    expect(raw).not.toContain('storageKey');
    expect(raw).not.toContain(share.token);
    expect(raw).not.toContain(sessionSecret);
  });

  it('does not leak another owner’s activity', async () => {
    const alice = await createAccount();
    const file = await uploadFile(alice, 'alice-secret.txt');
    await createShare(alice, file.id);

    const bob = await createAccount();
    const res = await feed(bob).expect(200);
    const raw = JSON.stringify(res.body);

    expect(raw).not.toContain('alice-secret.txt');
    expect(raw).not.toContain(file.id);

    const types = (res.body.data.items as Array<{ type: string }>).map((item) => item.type);
    expect(types.every((type) => type === 'USER_REGISTERED' || type === 'USER_LOGIN')).toBe(true);
  });

  it('supports limiting the feed and filtering by event type', async () => {
    const alice = await createAccount();
    const file = await uploadFile(alice);
    const share = await createShare(alice, file.id);
    const sessionSecret = await openShare(share.token);
    await downloadShare(share.token, sessionSecret).expect(HttpStatus.OK);

    const limited = await feed(alice, '?limit=2').expect(200);
    expect(limited.body.data.items).toHaveLength(2);
    expect(limited.body.data.hasMore).toBe(true);

    const filtered = await feed(alice, '?type=SHARE_DOWNLOADED').expect(200);
    const items = filtered.body.data.items as Array<{ type: string }>;
    expect(items.length).toBeGreaterThan(0);
    expect(items.every((item) => item.type === 'SHARE_DOWNLOADED')).toBe(true);
  });

  it('rejects invalid filters', async () => {
    const alice = await createAccount();
    await feed(alice, '?type=NOT_A_TYPE').expect(400);
    await feed(alice, '?limit=999').expect(400);
  });
});
