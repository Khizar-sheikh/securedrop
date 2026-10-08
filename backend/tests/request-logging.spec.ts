import { redactSecrets } from '../src/common/request-logging';

describe('redactSecrets', () => {
  it('masks tokens in public share paths', () => {
    expect(redactSecrets('/api/v1/public/shares/AbC123xYz_')).toBe('/api/v1/public/shares/***');
    expect(redactSecrets('/api/v1/s/aGVsbG8')).toBe('/api/v1/s/***');
  });

  it('masks sensitive query parameters but keeps the rest', () => {
    expect(redactSecrets('/api/v1/health?password=hunter2&token=abc&verbose=1')).toBe(
      '/api/v1/health?password=***&token=***&verbose=1',
    );
    expect(redactSecrets('/api/v1/files?page=2&pageSize=20')).toBe('/api/v1/files?page=2&pageSize=20');
  });

  it('leaves ordinary paths untouched', () => {
    expect(redactSecrets('/api/v1/auth/me')).toBe('/api/v1/auth/me');
    expect(redactSecrets('/api/v1/files/4b6f1f5e-0000-4000-8000-000000000000')).toBe(
      '/api/v1/files/4b6f1f5e-0000-4000-8000-000000000000',
    );
  });
});
