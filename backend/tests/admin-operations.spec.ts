import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app/app.module';
import { apiUrl, configureApp } from '../src/app/bootstrap';
import { PrismaService } from '../src/database/prisma.service';

describe('admin operations', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const createdEmails: string[] = [];
  const stamp = Date.now();

  interface Account {
    token: string;
    userId: string;
    email: string;
  }

  const uniqueEmail = (prefix: string) => {
    const email = `admin-ops-${prefix}-${stamp}-${Math.floor(Math.random() * 100000)}@example.com`;
    createdEmails.push(email);
    return email;
  };

  const createAccount = async (email: string): Promise<Account> => {
    await request(app.getHttpServer())
      .post(apiUrl('auth/register'))
      .send({ email, password: 'strong-password-123' })
      .expect(201);
    const login = await request(app.getHttpServer())
      .post(apiUrl('auth/login'))
      .send({ email, password: 'strong-password-123' })
      .expect(200);
    return { token: login.body.data.accessToken, userId: login.body.data.user.id, email };
  };

  const createShare = async (account: Account, name: string) => {
    const upload = await request(app.getHttpServer())
      .post(apiUrl('files'))
      .set('Authorization', `Bearer ${account.token}`)
      .attach('file', Buffer.from('content'), { filename: name, contentType: 'text/plain' })
      .expect(201);
    const share = await request(app.getHttpServer())
      .post(apiUrl('shares'))
      .set('Authorization', `Bearer ${account.token}`)
      .send({ fileId: upload.body.data.id })
      .expect(201);
    return share.body.data as { id: string; token: string };
  };

  let admin: Account;
  let owner: Account;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = configureApp(moduleRef.createNestApplication());
    await app.init();
    prisma = app.get(PrismaService);

    admin = await createAccount(uniqueEmail('root'));
    owner = await createAccount(uniqueEmail('owner'));
    await prisma.user.update({ where: { id: admin.userId }, data: { role: 'ADMIN' } });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { in: createdEmails } } });
    await app.close();
  });

  it('serves metrics with the expected shape', async () => {
    const res = await request(app.getHttpServer())
      .get(apiUrl('admin/metrics'))
      .set('Authorization', `Bearer ${admin.token}`)
      .expect(200);

    const metrics = res.body.data;
    expect(metrics).toEqual(
      expect.objectContaining({
        users: expect.any(Number),
        disabledUsers: expect.any(Number),
        files: expect.any(Number),
        activeShares: expect.any(Number),
        recentEvents: expect.any(Number),
      }),
    );
    expect(metrics.users).toBeGreaterThan(0);
  });

  it('lists and searches users server-side', async () => {
    const list = await request(app.getHttpServer())
      .get(apiUrl('admin/users'))
      .set('Authorization', `Bearer ${admin.token}`)
      .expect(200);
    expect(list.body.data.items.some((u: { email: string }) => u.email === owner.email)).toBe(true);

    const search = await request(app.getHttpServer())
      .get(apiUrl(`admin/users?query=${encodeURIComponent(owner.email)}`))
      .set('Authorization', `Bearer ${admin.token}`)
      .expect(200);
    expect(search.body.data.items).toHaveLength(1);
    expect(search.body.data.items[0].email).toBe(owner.email);
    expect(search.body.data.items[0]).not.toHaveProperty('passwordHash');
  });

  it('suspends a user, blocks login, records audit, then reactivates', async () => {
    const suspend = await request(app.getHttpServer())
      .patch(apiUrl(`admin/users/${owner.userId}/status`))
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ status: 'DISABLED' })
      .expect(200);
    expect(suspend.body.data.status).toBe('DISABLED');

    const login = await request(app.getHttpServer())
      .post(apiUrl('auth/login'))
      .send({ email: owner.email, password: 'strong-password-123' })
      .expect(403);
    expect(login.body.error.code).toBe('ACCOUNT_DISABLED');

    const suspendedEvent = await prisma.auditEvent.findFirst({
      where: { type: 'USER_SUSPENDED', actorUserId: admin.userId },
      orderBy: { createdAt: 'desc' },
    });
    expect(suspendedEvent).not.toBeNull();

    const reactivate = await request(app.getHttpServer())
      .patch(apiUrl(`admin/users/${owner.userId}/status`))
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ status: 'ACTIVE' })
      .expect(200);
    expect(reactivate.body.data.status).toBe('ACTIVE');

    await request(app.getHttpServer())
      .post(apiUrl('auth/login'))
      .send({ email: owner.email, password: 'strong-password-123' })
      .expect(200);

    const reactivatedEvent = await prisma.auditEvent.findFirst({
      where: { type: 'USER_REACTIVATED', actorUserId: admin.userId },
      orderBy: { createdAt: 'desc' },
    });
    expect(reactivatedEvent).not.toBeNull();
  });

  it('refuses to let an admin disable their own account', async () => {
    const res = await request(app.getHttpServer())
      .patch(apiUrl(`admin/users/${admin.userId}/status`))
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ status: 'DISABLED' })
      .expect(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('rejects an unknown user id and an invalid status body', async () => {
    await request(app.getHttpServer())
      .patch(apiUrl(`admin/users/${'0'.repeat(8)}-0000-4000-8000-000000000000/status`))
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ status: 'DISABLED' })
      .expect(404);

    await request(app.getHttpServer())
      .patch(apiUrl(`admin/users/${owner.userId}/status`))
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ status: 'NOPE' })
      .expect(400);
  });

  it('lists shares with owner emails and no token material, filtering by status', async () => {
    const share = await createShare(owner, 'admin-ops-share.txt');

    const active = await request(app.getHttpServer())
      .get(apiUrl('admin/shares?status=ACTIVE'))
      .set('Authorization', `Bearer ${admin.token}`)
      .expect(200);
    const item = active.body.data.items.find((entry: { id: string }) => entry.id === share.id);
    expect(item).toBeDefined();
    expect(item.ownerEmail).toBe(owner.email);
    expect(item.status).toBe('ACTIVE');
    expect(item).not.toHaveProperty('tokenHash');
    expect(JSON.stringify(item)).not.toContain(share.token);

    await request(app.getHttpServer())
      .delete(apiUrl(`admin/shares/${share.id}`))
      .set('Authorization', `Bearer ${admin.token}`)
      .expect(200);

    const revoked = await request(app.getHttpServer())
      .get(apiUrl('admin/shares?status=REVOKED'))
      .set('Authorization', `Bearer ${admin.token}`)
      .expect(200);
    const revokedItem = revoked.body.data.items.find((entry: { id: string }) => entry.id === share.id);
    expect(revokedItem).toBeDefined();
    expect(revokedItem.status).toBe('REVOKED');

    const stillActive = await request(app.getHttpServer())
      .get(apiUrl('admin/shares?status=ACTIVE'))
      .set('Authorization', `Bearer ${admin.token}`)
      .expect(200);
    expect(stillActive.body.data.items.some((entry: { id: string }) => entry.id === share.id)).toBe(false);
  });

  it('revokes a share for real: recipients get SHARE_REVOKED, audit records the admin action', async () => {
    const share = await createShare(owner, 'admin-ops-revoke.txt');

    await request(app.getHttpServer())
      .delete(apiUrl(`admin/shares/${share.id}`))
      .set('Authorization', `Bearer ${admin.token}`)
      .expect(200);

    const open = await request(app.getHttpServer())
      .post(apiUrl('public/shares/open'))
      .send({ token: share.token })
      .expect(410);
    expect(open.body.error.code).toBe('SHARE_REVOKED');

    const event = await prisma.auditEvent.findFirst({
      where: { type: 'SHARE_REVOKED_BY_ADMIN', shareId: share.id },
      orderBy: { createdAt: 'desc' },
    });
    expect(event).not.toBeNull();
    expect(event?.actorUserId).toBe(admin.userId);

    // Idempotent: a second revoke succeeds and does not fail.
    await request(app.getHttpServer())
      .delete(apiUrl(`admin/shares/${share.id}`))
      .set('Authorization', `Bearer ${admin.token}`)
      .expect(200);

    await request(app.getHttpServer())
      .delete(apiUrl(`admin/shares/${'0'.repeat(8)}-0000-4000-8000-000000000000`))
      .set('Authorization', `Bearer ${admin.token}`)
      .expect(404);
  });

  it('serves a searchable, filterable audit trail', async () => {
    const all = await request(app.getHttpServer())
      .get(apiUrl('admin/audit'))
      .set('Authorization', `Bearer ${admin.token}`)
      .expect(200);
    expect(all.body.data.items.length).toBeGreaterThan(0);
    expect(all.body.data).toHaveProperty('page', 1);
    expect(all.body.data).toHaveProperty('hasMore');

    const byType = await request(app.getHttpServer())
      .get(apiUrl('admin/audit?type=USER_SUSPENDED'))
      .set('Authorization', `Bearer ${admin.token}`)
      .expect(200);
    expect(byType.body.data.items.every((e: { type: string }) => e.type === 'USER_SUSPENDED')).toBe(true);

    const byActor = await request(app.getHttpServer())
      .get(apiUrl(`admin/audit?query=${encodeURIComponent(admin.email)}`))
      .set('Authorization', `Bearer ${admin.token}`)
      .expect(200);
    expect(byActor.body.data.items.every((e: { actorEmail: string }) => e.actorEmail === admin.email)).toBe(
      true,
    );

    const invalid = await request(app.getHttpServer())
      .get(apiUrl('admin/audit?type=NOT_A_TYPE'))
      .set('Authorization', `Bearer ${admin.token}`)
      .expect(400);
    expect(invalid.body.error.code).toBe('VALIDATION_FAILED');
  });

  it('paginates admin lists', async () => {
    const res = await request(app.getHttpServer())
      .get(apiUrl('admin/users?page=1&pageSize=1'))
      .set('Authorization', `Bearer ${admin.token}`)
      .expect(200);
    expect(res.body.data.items).toHaveLength(1);
    expect(res.body.data.page).toBe(1);
    expect(res.body.data.pageSize).toBe(1);
    expect(typeof res.body.data.total).toBe('number');
    expect(typeof res.body.data.hasMore).toBe('boolean');
  });
});
