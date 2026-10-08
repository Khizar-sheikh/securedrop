import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { buildConfig, AppConfig } from '../config/configuration';
import { validateEnvironment } from '../config/env.validation';

export const APP_CONFIG = Symbol('APP_CONFIG');

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../.env'],
      validate: validateEnvironment,
      cache: true,
    }),
  ],
  providers: [
    {
      provide: APP_CONFIG,
      useFactory: (): AppConfig => buildConfig(process.env),
    },
  ],
  exports: [APP_CONFIG],
})
export class AppConfigModule {}
