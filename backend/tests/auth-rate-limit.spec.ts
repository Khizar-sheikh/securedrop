import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app/app.module';
import { configureApp, apiUrl } from '../src/app/bootstrap';
import { PrismaService } from '../src/database/prisma.service';

describe('authentication brute-force lockout', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const createdEmails: string[] = [];

  const uniqueEmail = () => {
    const email = `test-lockout-${Date.now()}-${Math.floor(Math.random() * 100000)}@example.com`;
    createdEmails.push(email);
    return email;
  };

  const register = (email: string) =>
    request(app.getHttpServer())
      .post(apiUrl('auth/register'))
      .send({ email, password: 'strong-password-123' });

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

  it('locks the account after the configured number of failed attempts', async () => {
    const email = uniqueEmail();
    await register(email).expect(201);

    for (let attempt = 0; attempt < 10; attempt += 1) {
      const res = await login(email, `wrong-${attempt}`).expect(401);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    }

    const locked = await login(email, 'wrong').expect(429);
    expect(locked.body.error.code).toBe('RATE_LIMITED');

    // Even the correct password is refused while the lock window is open.
    const withValidPassword = await login(email, 'strong-password-123').expect(429);
    expect(withValidPassword.body.error.code).toBe('RATE_LIMITED');
  });

  it('treats unknown emails the same way (no account probing)', async () => {
    const email = uniqueEmail(); // never registered

    for (let attempt = 0; attempt < 10; attempt += 1) {
      await login(email, `wrong-${attempt}`).expect(401);
    }
    const locked = await login(email, 'anything').expect(429);
    expect(locked.body.error.code).toBe('RATE_LIMITED');
  });

  it('clears the failure counter after a successful login', async () => {
    const email = uniqueEmail();
    await register(email).expect(201);

    for (let attempt = 0; attempt < 3; attempt += 1) {
      await login(email, `wrong-${attempt}`).expect(401);
    }
    await login(email, 'strong-password-123').expect(200);

    // Counter was reset: further failures below the limit are still 401, not 429.
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const res = await login(email, `wrong-again-${attempt}`).expect(401);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    }
  });

  it('records a LOGIN_RATE_LIMITED audit event while locked', async () => {
    const email = uniqueEmail();
    await register(email).expect(201);
    for (let attempt = 0; attempt < 10; attempt += 1) {
      await login(email, `wrong-${attempt}`).expect(401);
    }
    await login(email, 'wrong').expect(429);

    const events = await prisma.auditEvent.count({ where: { type: 'LOGIN_RATE_LIMITED' } });
    expect(events).toBeGreaterThan(0);
  });
});
