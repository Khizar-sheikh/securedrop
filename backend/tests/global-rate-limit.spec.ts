import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app/app.module';
import { configureApp, apiUrl } from '../src/app/bootstrap';

describe('global request rate limit', () => {
  let app: INestApplication;

  beforeAll(async () => {
    // Tightened for this suite only; the default is much higher.
    process.env.RATE_LIMIT_MAX = '5';
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = configureApp(moduleRef.createNestApplication());
    await app.init();
  });

  afterAll(async () => {
    delete process.env.RATE_LIMIT_MAX;
    await app.close();
  });

  it('answers further requests from one IP with RATE_LIMITED', async () => {
    for (let i = 0; i < 5; i += 1) {
      await request(app.getHttpServer()).get(apiUrl('health')).expect(200);
    }

    const res = await request(app.getHttpServer()).get(apiUrl('health')).expect(429);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('RATE_LIMITED');
    expect(res.body.error.message).toBeTruthy();
  });
});
