import { IsIn, IsNumberString, IsOptional, IsString } from 'class-validator';
import { parseTtlToSeconds } from '../common/ttl';
import { DEFAULT_ALLOWED_MIME } from '../security/upload-policy';

const toBool = (value: string | undefined, fallback: boolean): boolean => {
  if (value === undefined || value === '') return fallback;
  return value === 'true' || value === '1';
};

const toInt = (value: string | undefined, fallback: number): number => {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export class EnvironmentVariables {
  @IsIn(['development', 'test', 'production'])
  NODE_ENV!: string;

  @IsOptional()
  @IsNumberString()
  PORT?: string;

  // --- Database ---
  @IsString()
  DATABASE_URL!: string;

  // --- Redis ---
  @IsString()
  REDIS_URL!: string;

  // --- Private object storage (S3 compatible) ---
  @IsString()
  STORAGE_ENDPOINT!: string;

  @IsString()
  STORAGE_REGION!: string;

  @IsString()
  STORAGE_BUCKET!: string;

  @IsString()
  STORAGE_ACCESS_KEY!: string;

  @IsString()
  STORAGE_SECRET_KEY!: string;

  @IsOptional()
  @IsIn(['true', 'false', '1', '0'])
  STORAGE_FORCE_PATH_STYLE?: string;

  // --- Tokens / sessions ---
  @IsString()
  JWT_ACCESS_SECRET!: string;

  @IsString()
  JWT_REFRESH_SECRET!: string;

  @IsString()
  RECIPIENT_SESSION_SECRET!: string;

  @IsOptional()
  @IsString()
  RECIPIENT_SESSION_TTL?: string;

  @IsOptional()
  @IsString()
  JWT_ACCESS_TTL?: string;

  @IsOptional()
  @IsString()
  JWT_REFRESH_TTL?: string;

  // --- Uploads ---
  @IsOptional()
  @IsString()
  UPLOAD_MAX_BYTES?: string;

  @IsOptional()
  @IsString()
  UPLOAD_ALLOWED_MIME?: string;

  // --- App behaviour ---
  @IsOptional()
  @IsIn(['error', 'warn', 'info', 'debug'])
  LOG_LEVEL?: string;

  @IsOptional()
  @IsString()
  CORS_ORIGINS?: string;

  // --- Rate limiting / brute-force protection ---
  @IsOptional()
  @IsNumberString()
  RATE_LIMIT_MAX?: string;

  @IsOptional()
  @IsNumberString()
  RATE_LIMIT_TTL_MS?: string;

  @IsOptional()
  @IsNumberString()
  AUTH_MAX_FAILED_ATTEMPTS?: string;

  @IsOptional()
  @IsString()
  AUTH_FAIL_WINDOW?: string;

  // --- Background cleanup ---
  @IsOptional()
  @IsIn(['true', 'false', '1', '0'])
  CLEANUP_ENABLED?: string;

  @IsOptional()
  @IsNumberString()
  CLEANUP_INTERVAL_MS?: string;

  @IsOptional()
  @IsNumberString()
  AUDIT_RETENTION_DAYS?: string;
}

export interface AppConfig {
  env: 'development' | 'test' | 'production';
  port: number;
  databaseUrl: string;
  redisUrl: string;
  storage: {
    endpoint: string;
    region: string;
    bucket: string;
    accessKey: string;
    secretKey: string;
    forcePathStyle: boolean;
  };
  tokens: {
    accessSecret: string;
    refreshSecret: string;
    recipientSessionSecret: string;
    accessTtl: string;
    refreshTtl: string;
    accessTtlSeconds: number;
    refreshTtlSeconds: number;
    recipientTtl: string;
    recipientTtlSeconds: number;
  };
  upload: {
    maxBytes: number;
    allowedMime: string[];
  };
  rateLimit: {
    max: number;
    ttlMs: number;
  };
  auth: {
    maxFailedAttempts: number;
    failWindowSeconds: number;
  };
  sharePassword: {
    maxFailedAttempts: number;
    failWindowSeconds: number;
  };
  cleanup: {
    enabled: boolean;
    intervalMs: number;
    auditRetentionDays: number;
  };
  logLevel: 'error' | 'warn' | 'info' | 'debug';
  corsOrigins: string[];
}

export const buildConfig = (env: NodeJS.ProcessEnv): AppConfig => ({
  env: (env.NODE_ENV ?? 'development') as AppConfig['env'],
  port: toInt(env.PORT, 3000),
  databaseUrl: env.DATABASE_URL ?? '',
  redisUrl: env.REDIS_URL ?? '',
  storage: {
    endpoint: env.STORAGE_ENDPOINT ?? '',
    region: env.STORAGE_REGION ?? 'us-east-1',
    bucket: env.STORAGE_BUCKET ?? '',
    accessKey: env.STORAGE_ACCESS_KEY ?? '',
    secretKey: env.STORAGE_SECRET_KEY ?? '',
    forcePathStyle: toBool(env.STORAGE_FORCE_PATH_STYLE, true),
  },
  tokens: {
    accessSecret: env.JWT_ACCESS_SECRET ?? '',
    refreshSecret: env.JWT_REFRESH_SECRET ?? '',
    recipientSessionSecret: env.RECIPIENT_SESSION_SECRET ?? '',
    accessTtl: env.JWT_ACCESS_TTL ?? '15m',
    refreshTtl: env.JWT_REFRESH_TTL ?? '30d',
    accessTtlSeconds: parseTtlToSeconds(env.JWT_ACCESS_TTL ?? '15m'),
    refreshTtlSeconds: parseTtlToSeconds(env.JWT_REFRESH_TTL ?? '30d'),
    recipientTtl: env.RECIPIENT_SESSION_TTL ?? '7d',
    recipientTtlSeconds: parseTtlToSeconds(env.RECIPIENT_SESSION_TTL ?? '7d'),
  },
  upload: {
    maxBytes: toInt(env.UPLOAD_MAX_BYTES, 100 * 1024 * 1024),
    allowedMime: (env.UPLOAD_ALLOWED_MIME ?? '')
      .split(',')
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean)
      .concat(env.UPLOAD_ALLOWED_MIME ? [] : DEFAULT_ALLOWED_MIME),
  },
  rateLimit: {
    max: toInt(env.RATE_LIMIT_MAX, 600),
    ttlMs: toInt(env.RATE_LIMIT_TTL_MS, 60_000),
  },
  auth: {
    maxFailedAttempts: toInt(env.AUTH_MAX_FAILED_ATTEMPTS, 10),
    failWindowSeconds: parseTtlToSeconds(env.AUTH_FAIL_WINDOW ?? '15m'),
  },
  sharePassword: {
    maxFailedAttempts: toInt(env.SHARE_PASSWORD_MAX_FAILED_ATTEMPTS, 5),
    failWindowSeconds: parseTtlToSeconds(env.SHARE_PASSWORD_FAIL_WINDOW ?? '15m'),
  },
  cleanup: {
    enabled: toBool(env.CLEANUP_ENABLED, true),
    intervalMs: toInt(env.CLEANUP_INTERVAL_MS, 60 * 60 * 1000),
    auditRetentionDays: toInt(env.AUDIT_RETENTION_DAYS, 180),
  },
  logLevel: (env.LOG_LEVEL ?? 'info') as AppConfig['logLevel'],
  corsOrigins: (env.CORS_ORIGINS ?? '').split(',').filter(Boolean),
});

export const configuration = (): AppConfig => buildConfig(process.env);
