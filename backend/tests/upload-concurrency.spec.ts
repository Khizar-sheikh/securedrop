import { HttpStatus, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app/app.module';
import { apiUrl, configureApp } from '../src/app/bootstrap';
import { ERROR_CODES } from '../src/common/error-codes';
import { PrismaService } from '../src/database/prisma.service';
import { RedisService } from '../src/database/redis.service';

describe('per-user upload concurrency cap', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let redis: RedisService;
  let token: string;
  let ownerId: string;
  const createdEmails: string[] = [];

  beforeAll(async () => {
    process.env.UPLOAD_MAX_CONCURRENT = '1';
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = configureApp(moduleRef.createNestApplication());
    await app.init();
    prisma = moduleRef.get(PrismaService);
    redis = moduleRef.get(RedisService);

    const email = `test-upload-slot-${Date.now()}@example.com`;
    createdEmails.push(email);
    await request(app.getHttpServer())
      .post(apiUrl('auth/register'))
      .send({ email, password: 'strong-password-123' })
      .expect(201);
    const login = await request(app.getHttpServer())
      .post(apiUrl('auth/login'))
      .send({ email, password: 'strong-password-123' })
      .expect(200);
    token = login.body.data.accessToken;
    ownerId = login.body.data.user.id;
  });

  afterAll(async () => {
    delete process.env.UPLOAD_MAX_CONCURRENT;
    await redis.del(`upload:active:${ownerId}`);
    await prisma.user.deleteMany({ where: { email: { in: createdEmails } } });
    await app.close();
  });

  const upload = () =>
    request(app.getHttpServer())
      .post(apiUrl('files'))
      .set('Authorization', `Bearer ${token}`)
      .attach('file', Buffer.from('content'), { filename: 'a.txt', contentType: 'text/plain' });

  it('rejects with RATE_LIMITED while the slot is held', async () => {
    await redis.incr(`upload:active:${ownerId}`, 300);

    const res = await upload().expect(HttpStatus.TOO_MANY_REQUESTS);
    expect(res.body.error.code).toBe(ERROR_CODES.RATE_LIMITED);

    await redis.del(`upload:active:${ownerId}`);
  });

  it('accepts the upload once the slot is free', async () => {
    await upload().expect(HttpStatus.CREATED);
  });

  it('releases the slot after a failed upload', async () => {
    const fail = await request(app.getHttpServer())
      .post(apiUrl('files'))
      .set('Authorization', `Bearer ${token}`)
      .attach('file', Buffer.from('content'), { filename: '..', contentType: 'text/plain' })
      .expect(HttpStatus.BAD_REQUEST);
    expect(['VALIDATION_FAILED', 'BAD_REQUEST']).toContain(fail.body.error.code);

    // Slot must be free again for the next upload.
    await upload().expect(HttpStatus.CREATED);
  });
});
