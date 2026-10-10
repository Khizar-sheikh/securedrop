import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app/app.module';
import { apiUrl, configureApp } from '../src/app/bootstrap';

describe('CORS (opt-in, explicit origins only)', () => {
  let app: INestApplication;
  const allowed = 'http://localhost:3001';
  const unknown = 'http://evil.example';

  beforeAll(async () => {
    process.env.CORS_ORIGINS = allowed;
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = configureApp(moduleRef.createNestApplication());
    await app.init();
  });

  afterAll(async () => {
    delete process.env.CORS_ORIGINS;
    await app.close();
  });

  it('answers a preflight from a trusted origin', async () => {
    const res = await request(app.getHttpServer())
      .options(apiUrl('health'))
      .set('Origin', allowed)
      .set('Access-Control-Request-Method', 'GET')
      .expect(204);

    expect(res.headers['access-control-allow-origin']).toBe(allowed);
    expect(res.headers['access-control-allow-credentials']).toBeUndefined();
  });

  it('adds the header to responses for a trusted origin', async () => {
    const res = await request(app.getHttpServer())
      .get(apiUrl('health'))
      .set('Origin', allowed)
      .expect(200);

    expect(res.headers['access-control-allow-origin']).toBe(allowed);
  });

  it('does not allow other origins', async () => {
    const res = await request(app.getHttpServer())
      .get(apiUrl('health'))
      .set('Origin', unknown)
      .expect(200);

    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });
});

describe('CORS (disabled without configured origins)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    delete process.env.CORS_ORIGINS;
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = configureApp(moduleRef.createNestApplication());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('never emits CORS headers when CORS_ORIGINS is empty', async () => {
    const res = await request(app.getHttpServer())
      .get(apiUrl('health'))
      .set('Origin', 'http://localhost:3001')
      .expect(200);

    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });
});
