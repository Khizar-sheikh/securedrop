import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app/app.module';
import { configureApp, apiUrl } from '../src/app/bootstrap';
import { PrismaService } from '../src/database/prisma.service';

describe('POST /auth/register', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const createdEmails: string[] = [];

  const uniqueEmail = () => {
    const email = `test-register-${Date.now()}-${Math.floor(Math.random() * 100000)}@example.com`;
    createdEmails.push(email);
    return email;
  };

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

  it('creates an account and never returns the password hash', async () => {
    const email = uniqueEmail();
    const res = await request(app.getHttpServer())
      .post(apiUrl('auth/register'))
      .send({ email: email.toUpperCase(), password: 'strong-password-123' })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe(email); // normalized to lowercase
    expect(res.body.data).not.toHaveProperty('passwordHash');
    expect(JSON.stringify(res.body)).not.toContain('strong-password-123');

    const stored = await prisma.user.findUnique({ where: { email } });
    expect(stored).not.toBeNull();
    expect(stored?.passwordHash.startsWith('scrypt$')).toBe(true);
    expect(stored?.passwordHash).not.toContain('strong-password-123');
    expect(stored?.status).toBe('ACTIVE');
  });

  it('rejects a duplicate email with EMAIL_TAKEN', async () => {
    const email = uniqueEmail();
    await request(app.getHttpServer())
      .post(apiUrl('auth/register'))
      .send({ email, password: 'strong-password-123' })
      .expect(201);

    const res = await request(app.getHttpServer())
      .post(apiUrl('auth/register'))
      .send({ email, password: 'another-password-456' })
      .expect(409);

    expect(res.body.error.code).toBe('EMAIL_TAKEN');
  });

  it('rejects an invalid email', async () => {
    const res = await request(app.getHttpServer())
      .post(apiUrl('auth/register'))
      .send({ email: 'not-an-email', password: 'strong-password-123' })
      .expect(400);
    expect(res.body.error.code).toBe('VALIDATION_FAILED');
  });

  it('rejects a short password', async () => {
    const res = await request(app.getHttpServer())
      .post(apiUrl('auth/register'))
      .send({ email: uniqueEmail(), password: 'short' })
      .expect(400);
    expect(res.body.error.code).toBe('VALIDATION_FAILED');
  });

  it('records a USER_REGISTERED audit event', async () => {
    const email = uniqueEmail();
    const res = await request(app.getHttpServer())
      .post(apiUrl('auth/register'))
      .send({ email, password: 'strong-password-123' })
      .expect(201);

    const events = await prisma.auditEvent.findMany({
      where: { type: 'USER_REGISTERED', actorUserId: res.body.data.id },
    });
    expect(events.length).toBeGreaterThan(0);
    expect(events[0].ip).toBeTruthy();
  });
});
