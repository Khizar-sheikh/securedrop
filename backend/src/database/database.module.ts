import { Global, Module } from '@nestjs/common';
import { AppConfigModule } from '../app/config.module';
import { PrismaService } from './prisma.service';
import { RedisService } from './redis.service';

@Global()
@Module({
  imports: [AppConfigModule],
  providers: [PrismaService, RedisService],
  exports: [PrismaService, RedisService],
})
export class DatabaseModule {}
