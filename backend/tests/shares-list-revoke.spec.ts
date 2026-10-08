import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app/app.module';
import { configureApp, apiUrl } from '../src/app/bootstrap';
import { PrismaService } from '../src/database/prisma.service';

describe('share listing and revocation', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const createdEmails: string[] = [];

  interface Account {
    token: string;
    userId: string;
  }

  const uniqueEmail = () => {
    const email = `test-revoke-${Date.now()}-${Math.floor(Math.random() * 100000)}@example.com`;
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

  const uploadFile = async (account: Account, name: string): Promise<string> => {
    const res = await request(app.getHttpServer())
      .post(apiUrl('files'))
      .set('Authorization', `Bearer ${account.token}`)
      .attach('file', Buffer.from('content'), { filename: name, contentType: 'text/plain' })
      .expect(201);
    return res.body.data.id;
  };

  const createShare = async (account: Account, fileId: string) => {
    const res = await request(app.getHttpServer())
      .post(apiUrl('shares'))
      .set('Authorization', `Bearer ${account.token}`)
      .send({ fileId })
      .expect(201);
    return res.body.data;
  };

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

  it('lists the owner shares with file information and no token material', async () => {
    const fileId = await uploadFile(alice, 'listed.txt');
    const share = await createShare(alice, fileId);

    const res = await request(app.getHttpServer())
      .get(apiUrl('shares'))
      .set('Authorization', `Bearer ${alice.token}`)
      .expect(200);

    const item = res.body.data.items.find((entry: { id: string }) => entry.id === share.id);
    expect(item).toBeDefined();
    expect(item.filename).toBe('listed.txt');
    expect(item.sizeBytes).toBeGreaterThan(0);
    expect(item.token).toBeUndefined();

    const json = JSON.stringify(res.body);
    expect(json).not.toContain('tokenHash');
    expect(json).not.toContain('passwordHash');
  });

  it('does not list another owner shares', async () => {
    const fileId = await uploadFile(bob, 'bob.txt');
    await createShare(bob, fileId);

    const res = await request(app.getHttpServer())
      .get(apiUrl('shares'))
      .set('Authorization', `Bearer ${alice.token}`)
      .expect(200);
    expect(res.body.data.items.every((item: { filename: string }) => item.filename !== 'bob.txt')).toBe(true);
  });

  it('revokes a share and invalidates its recipient sessions', async () => {
    const fileId = await uploadFile(alice, 'revoke-me.txt');
    const share = await createShare(alice, fileId);

    const session = await prisma.recipientSession.create({
      data: {
        shareId: share.id,
        tokenHash: 'b'.repeat(64),
        expiresAt: new Date(Date.now() + 3600_000),
      },
    });

    const res = await request(app.getHttpServer())
      .delete(apiUrl(`shares/${share.id}`))
      .set('Authorization', `Bearer ${alice.token}`)
      .expect(200);
    expect(res.body.data).toEqual({ id: share.id, revoked: true });

    const revoked = await prisma.share.findUnique({ where: { id: share.id } });
    expect(revoked?.revokedAt).not.toBeNull();

    const sessionAfter = await prisma.recipientSession.findUnique({ where: { id: session.id } });
    expect(sessionAfter?.revokedAt).not.toBeNull();

    const list = await request(app.getHttpServer())
      .get(apiUrl('shares'))
      .set('Authorization', `Bearer ${alice.token}`)
      .expect(200);
    const item = list.body.data.items.find((entry: { id: string }) => entry.id === share.id);
    expect(item.revokedAt).not.toBeNull();

    const again = await request(app.getHttpServer())
      .delete(apiUrl(`shares/${share.id}`))
      .set('Authorization', `Bearer ${alice.token}`)
      .expect(200);
    expect(again.body.data.revoked).toBe(true);

    const audits = await prisma.auditEvent.count({ where: { type: 'SHARE_REVOKED', shareId: share.id } });
    expect(audits).toBe(1);
  });

  it('does not let another owner revoke a share', async () => {
    const fileId = await uploadFile(alice, 'keep.txt');
    const share = await createShare(alice, fileId);

    await request(app.getHttpServer())
      .delete(apiUrl(`shares/${share.id}`))
      .set('Authorization', `Bearer ${bob.token}`)
      .expect(404);

    const record = await prisma.share.findUnique({ where: { id: share.id } });
    expect(record?.revokedAt).toBeNull();
  });

  it('requires authentication for list and revoke', async () => {
    await request(app.getHttpServer()).get(apiUrl('shares')).expect(401);
    await request(app.getHttpServer())
      .delete(apiUrl('shares/11111111-1111-1111-1111-111111111111'))
      .expect(401);
  });
});
