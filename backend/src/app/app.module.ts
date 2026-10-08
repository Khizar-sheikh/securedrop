import { Module } from '@nestjs/common';
import { AppConfigModule } from './config.module';
import { DatabaseModule } from '../database/database.module';
import { StorageModule } from '../storage/storage.module';
import { HealthModule } from '../modules/health/health.module';

@Module({
  imports: [AppConfigModule, DatabaseModule, StorageModule, HealthModule],
})
export class AppModule {}
