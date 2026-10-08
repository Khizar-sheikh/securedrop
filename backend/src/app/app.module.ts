import { Module } from '@nestjs/common';
import { AppConfigModule } from './config.module';
import { DatabaseModule } from '../database/database.module';
import { StorageModule } from '../storage/storage.module';
import { AuditModule } from '../modules/audit/audit.module';
import { SessionModule } from '../modules/sessions/session.module';
import { HealthModule } from '../modules/health/health.module';
import { AuthModule } from '../modules/auth/auth.module';

@Module({
  imports: [
    AppConfigModule,
    DatabaseModule,
    StorageModule,
    AuditModule,
    SessionModule,
    HealthModule,
    AuthModule,
  ],
})
export class AppModule {}
