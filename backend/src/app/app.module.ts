import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppConfigModule } from './config.module';
import { DatabaseModule } from '../database/database.module';
import { StorageModule } from '../storage/storage.module';
import { AuditModule } from '../modules/audit/audit.module';
import { SessionModule } from '../modules/sessions/session.module';
import { HealthModule } from '../modules/health/health.module';
import { AuthModule } from '../modules/auth/auth.module';
import { FilesModule } from '../modules/files/files.module';
import { AppThrottlerGuard } from '../common/app-throttler.guard';
import { AppConfig } from '../config/configuration';
import { APP_CONFIG } from '../config/tokens';

@Module({
  imports: [
    AppConfigModule,
    ThrottlerModule.forRootAsync({
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig) => ({
        throttlers: [{ name: 'default', ttl: config.rateLimit.ttlMs, limit: config.rateLimit.max }],
      }),
    }),
    DatabaseModule,
    StorageModule,
    AuditModule,
    SessionModule,
    HealthModule,
    AuthModule,
    FilesModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: AppThrottlerGuard }],
})
export class AppModule {}
