import { Module } from '@nestjs/common';
import { SharesController } from './shares.controller';
import { SharesService } from './shares.service';
import { PublicSharesController } from './public-shares.controller';
import { PublicSharesService } from './public-shares.service';
import { SharePasswordRateLimiterService } from './share-password-rate-limiter.service';

@Module({
  controllers: [SharesController, PublicSharesController],
  providers: [SharesService, PublicSharesService, SharePasswordRateLimiterService],
})
export class SharesModule {}
