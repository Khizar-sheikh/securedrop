import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app/app.module';
import { configureApp, apiUrl } from '../src/app/bootstrap';
import { PrismaService } from '../src/database/prisma.service';

describe('GET /auth/me (AccessTokenGuard)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwt: JwtService;
  const createdEmails: string[] = [];

  const uniqueEmail = () => {
    const email = `test-guard-${Date.now()}-${Math.floor(Math.random() * 100000)}@example.com`;
    createdEmails.push(email);
    return email;
  };

  const login = async (email: string, password: string): Promise<string> => {
    const res = await request(app.getHttpServer())
      .post(apiUrl('auth/login'))
      .send({ email, password })
      .expect(200);
    return res.body.data.accessToken as string;
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = configureApp(moduleRef.createNestApplication());
    await app.init();
    prisma = app.get(PrismaService);
    jwt = app.get(JwtService);
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { in: createdEmails } } });
    await app.close();
  });

  it('rejects a missing token', async () => {
    const res = await request(app.getHttpServer()).get(apiUrl('auth/me')).expect(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('rejects a malformed Authorization header', async () => {
    await request(app.getHttpServer())
      .get(apiUrl('auth/me'))
      .set('Authorization', 'Token abc')
      .expect(401);
    await request(app.getHttpServer())
      .get(apiUrl('auth/me'))
      .set('Authorization', 'Bearer')
      .expect(401);
  });

  it('rejects a tampered or wrong-secret token', async () => {
    const token = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJmYWtlIn0.invalid';
    const res = await request(app.getHttpServer())
      .get(apiUrl('auth/me'))
      .set('Authorization', `Bearer ${token}`)
      .expect(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('reports an expired token as SESSION_EXPIRED', async () => {
    const email = uniqueEmail();
    await request(app.getHttpServer())
      .post(apiUrl('auth/register'))
      .send({ email, password: 'strong-password-123' })
      .expect(201);
    const accessToken = await login(email, 'strong-password-123');

    const payload = jwt.decode(accessToken) as { sub: string; typ: string };
    const expired = jwt.sign({ sub: payload.sub, typ: payload.typ }, { expiresIn: -10 });

    const res = await request(app.getHttpServer())
      .get(apiUrl('auth/me'))
      .set('Authorization', `Bearer ${expired}`)
      .expect(401);
    expect(res.body.error.code).toBe('SESSION_EXPIRED');
  });

  it('rejects a token whose typ is not access', async () => {
    const forged = jwt.sign({ sub: 'someone', typ: 'refresh' });
    await request(app.getHttpServer())
      .get(apiUrl('auth/me'))
      .set('Authorization', `Bearer ${forged}`)
      .expect(401);
  });

  it('returns the current user for a valid token', async () => {
    const email = uniqueEmail();
    await request(app.getHttpServer())
      .post(apiUrl('auth/register'))
      .send({ email, password: 'strong-password-123' })
      .expect(201);
    const accessToken = await login(email, 'strong-password-123');

    const res = await request(app.getHttpServer())
      .get(apiUrl('auth/me'))
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.data.email).toBe(email);
    expect(res.body.data.status).toBe('ACTIVE');
    expect(res.body.data).not.toHaveProperty('passwordHash');
  });

  it('rejects a token for a disabled account', async () => {
    const email = uniqueEmail();
    const created = await request(app.getHttpServer())
      .post(apiUrl('auth/register'))
      .send({ email, password: 'strong-password-123' })
      .expect(201);
    const accessToken = await login(email, 'strong-password-123');
    await prisma.user.update({ where: { id: created.body.data.id }, data: { status: 'DISABLED' } });

    const res = await request(app.getHttpServer())
      .get(apiUrl('auth/me'))
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(403);
    expect(res.body.error.code).toBe('ACCOUNT_DISABLED');
  });

  it('rejects a token for a deleted user', async () => {
    const forged = jwt.sign({ sub: '11111111-1111-1111-1111-111111111111', typ: 'access' });
    await request(app.getHttpServer())
      .get(apiUrl('auth/me'))
      .set('Authorization', `Bearer ${forged}`)
      .expect(401);
  });
});
