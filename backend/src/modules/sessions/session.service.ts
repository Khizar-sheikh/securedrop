import { Inject, Injectable } from '@nestjs/common';
import { RedisService } from '../../database/redis.service';
import { AppConfig } from '../../config/configuration';
import { APP_CONFIG } from '../../config/tokens';
import { generateToken, hashToken } from '../../security/tokens';

interface RefreshSession {
  userId: string;
  createdAt: string;
}

const REFRESH_PREFIX = 'auth:refresh:';

/**
 * Owner refresh sessions, stored in Redis.
 * Only the SHA-256 of the refresh token is stored; rotation consumes the old
 * token atomically so a replayed token cannot be used twice.
 */
@Injectable()
export class SessionService {
  private readonly refreshTtlSeconds: number;

  constructor(
    private readonly redis: RedisService,
    @Inject(APP_CONFIG) config: AppConfig,
  ) {
    this.refreshTtlSeconds = config.tokens.refreshTtlSeconds;
  }

  async create(userId: string): Promise<{ refreshToken: string; expiresInSeconds: number }> {
    const refreshToken = generateToken(32);
    const session: RefreshSession = { userId, createdAt: new Date().toISOString() };
    await this.redis.set(REFRESH_PREFIX + hashToken(refreshToken), JSON.stringify(session), this.refreshTtlSeconds);
    return { refreshToken, expiresInSeconds: this.refreshTtlSeconds };
  }

  async lookup(refreshToken: string): Promise<RefreshSession | null> {
    const raw = await this.redis.get(REFRESH_PREFIX + hashToken(refreshToken));
    if (!raw) return null;
    try {
      return JSON.parse(raw) as RefreshSession;
    } catch {
      return null;
    }
  }

  /** Atomically consumes the token and returns it, or null when invalid/used. */
  async consume(refreshToken: string): Promise<RefreshSession | null> {
    const raw = await this.redis.getdel(REFRESH_PREFIX + hashToken(refreshToken));
    if (!raw) return null;
    try {
      return JSON.parse(raw) as RefreshSession;
    } catch {
      return null;
    }
  }

  async revoke(refreshToken: string): Promise<void> {
    await this.redis.del(REFRESH_PREFIX + hashToken(refreshToken));
  }
}
