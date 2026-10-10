import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app/app.module';
import { apiUrl, configureApp } from '../src/app/bootstrap';
import { PrismaService } from '../src/database/prisma.service';

describe('admin authorization', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const createdEmails: string[] = [];
  const stamp = Date.now();

  const uniqueEmail = (prefix: string) => {
    const email = `admin-authz-${prefix}-${stamp}-${Math.floor(Math.random() * 100000)}@example.com`;
    createdEmails.push(email);
    return email;
  };

  const createAccount = async (email: string): Promise<{ token: string; userId: string }> => {
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

  let user: { token: string; userId: string };
  let admin: { token: string; userId: string };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = configureApp(moduleRef.createNestApplication());
    await app.init();
    prisma = app.get(PrismaService);

    user = await createAccount(uniqueEmail('user'));
    admin = await createAccount(uniqueEmail('admin'));
    await prisma.user.update({ where: { id: admin.userId }, data: { role: 'ADMIN' } });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { in: createdEmails } } });
    await app.close();
  });

  const adminRoutes: Array<{ method: 'get' | 'patch' | 'delete'; path: string; body?: object }> = [
    { method: 'get', path: 'admin/metrics' },
    { method: 'get', path: 'admin/users' },
    { method: 'get', path: 'admin/shares' },
    { method: 'get', path: 'admin/audit' },
    { method: 'patch', path: `admin/users/${'0'.repeat(24)}/status`, body: { status: 'DISABLED' } },
    { method: 'delete', path: `admin/shares/${'0'.repeat(24)}` },
  ];

  it('rejects unauthenticated requests with 401', async () => {
    for (const route of adminRoutes) {
      const res = await request(app.getHttpServer())[route.method](apiUrl(route.path))
        .send(route.body ?? {});
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    }
  });

  it('denies ordinary users on every admin route with 403', async () => {
    for (const route of adminRoutes) {
      const res = await request(app.getHttpServer())
        [route.method](apiUrl(route.path))
        .set('Authorization', `Bearer ${user.token}`)
        .send(route.body ?? {});
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    }
  });

  it('allows the admin on read routes', async () => {
    for (const path of ['admin/metrics', 'admin/users', 'admin/shares', 'admin/audit']) {
      const res = await request(app.getHttpServer())
        .get(apiUrl(path))
        .set('Authorization', `Bearer ${admin.token}`)
        .expect(200);
      expect(res.body.success).toBe(true);
    }
  });

  it('exposes the role in /auth/me so the website can branch', async () => {
    const asUser = await request(app.getHttpServer())
      .get(apiUrl('auth/me'))
      .set('Authorization', `Bearer ${user.token}`)
      .expect(200);
    expect(asUser.body.data.role).toBe('USER');

    const asAdmin = await request(app.getHttpServer())
      .get(apiUrl('auth/me'))
      .set('Authorization', `Bearer ${admin.token}`)
      .expect(200);
    expect(asAdmin.body.data.role).toBe('ADMIN');
  });

  it('never leaks secrets in admin payloads', async () => {
    const res = await request(app.getHttpServer())
      .get(apiUrl('admin/users'))
      .set('Authorization', `Bearer ${admin.token}`)
      .expect(200);
    const json = JSON.stringify(res.body);
    expect(json).not.toContain('passwordHash');
    expect(json).not.toContain('tokenHash');
  });
});
