import { HttpStatus, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app/app.module';
import { apiUrl, configureApp } from '../src/app/bootstrap';
import { ERROR_CODES } from '../src/common/error-codes';
import { PrismaService } from '../src/database/prisma.service';

describe('share password brute-force lockout', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let ownerToken: string;
  let shareToken: string;
  let shareId: string;
  const createdEmails: string[] = [];

  beforeAll(async () => {
    process.env.SHARE_PASSWORD_MAX_FAILED_ATTEMPTS = '5';
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = configureApp(moduleRef.createNestApplication());
    await app.init();
    prisma = moduleRef.get(PrismaService);

    const email = `test-share-lockout-${Date.now()}@example.com`;
    createdEmails.push(email);
    await request(app.getHttpServer())
      .post(apiUrl('auth/register'))
      .send({ email, password: 'strong-password-123' })
      .expect(201);
    const login = await request(app.getHttpServer())
      .post(apiUrl('auth/login'))
      .send({ email, password: 'strong-password-123' })
      .expect(200);
    ownerToken = login.body.data.accessToken;

    const file = await request(app.getHttpServer())
      .post(apiUrl('files'))
      .set('Authorization', `Bearer ${ownerToken}`)
      .attach('file', Buffer.from('protected content'), {
        filename: 'protected.txt',
        contentType: 'text/plain',
      })
      .expect(201);

    const share = await request(app.getHttpServer())
      .post(apiUrl('shares'))
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ fileId: file.body.data.id, password: 'correct-horse-battery' })
      .expect(201);
    shareToken = share.body.data.token;
    shareId = share.body.data.id;
  });

  afterAll(async () => {
    delete process.env.SHARE_PASSWORD_MAX_FAILED_ATTEMPTS;
    await prisma.user.deleteMany({ where: { email: { in: createdEmails } } });
    await app.close();
  });

  const open = (body: Record<string, unknown>) =>
    request(app.getHttpServer()).post(apiUrl('public/shares/open')).send(body);

  it('answers SHARE_PASSWORD_REQUIRED before any password is sent', async () => {
    const res = await open({ token: shareToken }).expect(HttpStatus.FORBIDDEN);
    expect(res.body.error.code).toBe(ERROR_CODES.SHARE_PASSWORD_REQUIRED);
  });

  it('locks out after the configured number of wrong passwords', async () => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const res = await open({ token: shareToken, password: `wrong-${attempt}` }).expect(
        HttpStatus.FORBIDDEN,
      );
      expect(res.body.error.code).toBe(ERROR_CODES.SHARE_PASSWORD_INVALID);
    }

    // Even the correct password is refused while locked.
    const locked = await open({ token: shareToken, password: 'correct-horse-battery' }).expect(
      HttpStatus.TOO_MANY_REQUESTS,
    );
    expect(locked.body.error.code).toBe(ERROR_CODES.RATE_LIMITED);
  });

  it('records the lockout as an audited ACCESS_DENIED event', async () => {
    const events = await prisma.auditEvent.findMany({
      where: { type: 'ACCESS_DENIED', shareId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
    expect(
      events.some(
        (event) =>
          (event.metadata as { reason?: string } | null)?.reason === 'password_rate_limited',
      ),
    ).toBe(true);
  });

  it('still answers invalid tokens as 404 (no lockout leakage)', async () => {
    const res = await open({ token: 'a'.repeat(40), password: 'anything' }).expect(
      HttpStatus.NOT_FOUND,
    );
    expect(res.body.error.code).toBe(ERROR_CODES.SHARE_INVALID);
  });
});
