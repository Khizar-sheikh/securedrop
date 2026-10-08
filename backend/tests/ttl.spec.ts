import { parseTtlToSeconds } from '../src/common/ttl';

describe('parseTtlToSeconds', () => {
  it('parses supported units', () => {
    expect(parseTtlToSeconds('30s')).toBe(30);
    expect(parseTtlToSeconds('15m')).toBe(900);
    expect(parseTtlToSeconds('2h')).toBe(7200);
    expect(parseTtlToSeconds('30d')).toBe(2592000);
    expect(parseTtlToSeconds('1w')).toBe(604800);
  });

  it('rejects invalid values', () => {
    expect(() => parseTtlToSeconds('')).toThrow();
    expect(() => parseTtlToSeconds('abc')).toThrow();
    expect(() => parseTtlToSeconds('15')).toThrow();
    expect(() => parseTtlToSeconds('15x')).toThrow();
    expect(() => parseTtlToSeconds('-5m')).toThrow();
  });
});
