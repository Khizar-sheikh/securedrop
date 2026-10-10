import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app/app.module';
import { apiUrl, configureApp } from '../src/app/bootstrap';

describe('security headers', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = configureApp(moduleRef.createNestApplication());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('sets hardening headers on every API response', async () => {
    const res = await request(app.getHttpServer()).get(apiUrl('health')).expect(200);

    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('DENY');
    expect(res.headers['referrer-policy']).toBe('no-referrer');
    expect(res.headers['permissions-policy']).toContain('camera=()');
    expect(res.headers['x-permitted-cross-domain-policies']).toBe('none');
  });

  it('marks API responses as non-cacheable', async () => {
    const res = await request(app.getHttpServer()).get(apiUrl('health')).expect(200);
    expect(res.headers['cache-control']).toBe('no-store');
  });

  it('applies headers to error responses too', async () => {
    const res = await request(app.getHttpServer()).get(apiUrl('does-not-exist')).expect(404);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['cache-control']).toBe('no-store');
  });

  it('sets a deny-all CSP on API responses', async () => {
    const res = await request(app.getHttpServer()).get(apiUrl('health')).expect(200);
    expect(res.headers['content-security-policy']).toBe(
      "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
    );
  });

  it('omits HSTS unless ENABLE_HSTS is set, then sends it', async () => {
    const before = await request(app.getHttpServer()).get(apiUrl('health')).expect(200);
    expect(before.headers['strict-transport-security']).toBeUndefined();

    process.env.ENABLE_HSTS = 'true';
    const after = await request(app.getHttpServer()).get(apiUrl('health')).expect(200);
    delete process.env.ENABLE_HSTS;

    expect(after.headers['strict-transport-security']).toBe(
      'max-age=31536000; includeSubDomains',
    );
  });
});
