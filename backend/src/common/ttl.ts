const UNITS: Record<string, number> = {
  s: 1,
  m: 60,
  h: 3600,
  d: 86400,
  w: 604800,
};

/** Parses a TTL like "15m", "30d", "7d" into seconds. Throws on invalid input. */
export const parseTtlToSeconds = (ttl: string): number => {
  const match = /^(\d{1,6})([smhdw])$/.exec(ttl.trim());
  if (!match) {
    throw new Error(`Invalid TTL: ${ttl}`);
  }
  const value = Number.parseInt(match[1], 10) * UNITS[match[2]];
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`Invalid TTL: ${ttl}`);
  }
  return value;
};
