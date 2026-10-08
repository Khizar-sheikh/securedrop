import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { AppConfig } from '../config/configuration';
import { APP_CONFIG } from '../config/tokens';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly client: Redis;

  constructor(@Inject(APP_CONFIG) config: AppConfig) {
    this.client = new Redis(config.redisUrl, {
      lazyConnect: true,
      connectTimeout: 5000,
      maxRetriesPerRequest: 1,
      // Never spin forever in the background: health checks surface problems.
      retryStrategy: (times) => Math.min(times * 200, 2000),
    });
  }

  /** Used by the health endpoint. */
  async ping(): Promise<void> {
    if (this.client.status !== 'ready') {
      await this.client.connect();
    }
    await this.client.ping();
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit().catch(() => undefined);
  }
}
