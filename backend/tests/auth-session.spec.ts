import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app/app.module';
import { configureApp, apiUrl } from '../src/app/bootstrap';
import { PrismaService } from '../src/database/prisma.service';

describe('auth sessions (login / refresh / logout)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const createdEmails: string[] = [];

  const uniqueEmail = () => {
    const email = `test-session-${Date.now()}-${Math.floor(Math.random() * 100000)}@example.com`;
    createdEmails.push(email);
    return email;
  };

  const register = (email: string, password: string) =>
    request(app.getHttpServer()).post(apiUrl('auth/register')).send({ email, password });

  const login = (email: string, password: string) =>
    request(app.getHttpServer()).post(apiUrl('auth/login')).send({ email, password });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = configureApp(moduleRef.createNestApplication());
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { in: createdEmails } } });
    await app.close();
  });

  it('logs in with correct credentials and returns a JWT access token', async () => {
    const email = uniqueEmail();
    await register(email, 'strong-password-123').expect(201);

    const res = await login(email, 'strong-password-123').expect(200);
    expect(res.body.data.user.email).toBe(email);
    expect(res.body.data.user).not.toHaveProperty('passwordHash');
    expect(res.body.data.accessToken.split('.')).toHaveLength(3);
    expect(res.body.data.refreshToken).toMatch(/^[A-Za-z0-9_-]{20,}$/);
    expect(res.body.data.expiresIn).toBe(900);
    expect(res.body.data.refreshExpiresIn).toBeGreaterThan(86400);
  });

  it('rejects a wrong password and an unknown email with the same error', async () => {
    const email = uniqueEmail();
    await register(email, 'strong-password-123').expect(201);

    const wrongPassword = await login(email, 'wrong-password-1').expect(401);
    expect(wrongPassword.body.error.code).toBe('INVALID_CREDENTIALS');

    const unknownUser = await login(`nobody-${email}`, 'wrong-password-1').expect(401);
    expect(unknownUser.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('rotates the refresh token on refresh and rejects the old one', async () => {
    const email = uniqueEmail();
    await register(email, 'strong-password-123').expect(201);
    const first = await login(email, 'strong-password-123').expect(200);
    const firstRefresh = first.body.data.refreshToken;

    const rotated = await request(app.getHttpServer())
      .post(apiUrl('auth/refresh'))
      .send({ refreshToken: firstRefresh })
      .expect(200);
    expect(rotated.body.data.refreshToken).not.toBe(firstRefresh);
    expect(rotated.body.data.accessToken.split('.')).toHaveLength(3);

    const replay = await request(app.getHttpServer())
      .post(apiUrl('auth/refresh'))
      .send({ refreshToken: firstRefresh })
      .expect(401);
    expect(replay.body.error.code).toBe('SESSION_INVALID');
  });

  it('rejects an unknown refresh token', async () => {
    const res = await request(app.getHttpServer())
      .post(apiUrl('auth/refresh'))
      .send({ refreshToken: 'x'.repeat(43) })
      .expect(401);
    expect(res.body.error.code).toBe('SESSION_INVALID');
  });

  it('logs out and invalidates the refresh token', async () => {
    const email = uniqueEmail();
    await register(email, 'strong-password-123').expect(201);
    const loggedIn = await login(email, 'strong-password-123').expect(200);
    const refreshToken = loggedIn.body.data.refreshToken;

    const logout = await request(app.getHttpServer())
      .post(apiUrl('auth/logout'))
      .send({ refreshToken })
      .expect(200);
    expect(logout.body.data.loggedOut).toBe(true);

    const afterLogout = await request(app.getHttpServer())
      .post(apiUrl('auth/refresh'))
      .send({ refreshToken })
      .expect(401);
    expect(afterLogout.body.error.code).toBe('SESSION_INVALID');

    const again = await request(app.getHttpServer())
      .post(apiUrl('auth/logout'))
      .send({ refreshToken })
      .expect(200);
    expect(again.body.data.loggedOut).toBe(true);
  });

  it('rejects a disabled account with ACCOUNT_DISABLED', async () => {
    const email = uniqueEmail();
    const created = await register(email, 'strong-password-123').expect(201);
    await prisma.user.update({ where: { id: created.body.data.id }, data: { status: 'DISABLED' } });

    const res = await login(email, 'strong-password-123').expect(403);
    expect(res.body.error.code).toBe('ACCOUNT_DISABLED');
  });

  it('records login success and failure audit events', async () => {
    const email = uniqueEmail();
    await register(email, 'strong-password-123').expect(201);
    await login(email, 'bad-password').expect(401);
    await login(email, 'strong-password-123').expect(200);

    const failed = await prisma.auditEvent.findMany({ where: { type: 'LOGIN_FAILED' } });
    expect(failed.length).toBeGreaterThan(0);
    expect(failed.some((e) => e.ip)).toBe(true);

    const success = await prisma.auditEvent.findMany({
      where: { type: 'USER_LOGIN', actorUserId: { not: null } },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });
    expect(success.length).toBeGreaterThan(0);
  });
});
