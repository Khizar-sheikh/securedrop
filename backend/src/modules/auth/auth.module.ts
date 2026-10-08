import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { APP_CONFIG } from '../../config/tokens';
import { AppConfig } from '../../config/configuration';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthRateLimiterService } from './auth-rate-limiter.service';

@Module({
  imports: [
    JwtModule.registerAsync({
      global: true,
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig) => ({
        secret: config.tokens.accessSecret,
        signOptions: { expiresIn: config.tokens.accessTtlSeconds },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, AuthRateLimiterService],
})
export class AuthModule {}
