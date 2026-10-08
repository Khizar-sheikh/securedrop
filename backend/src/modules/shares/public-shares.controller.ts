import { Body, Controller, HttpCode, Inject, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { PublicSharesService, OpenedShare } from './public-shares.service';
import { OpenShareDto } from './dto/open-share.dto';
import { getRequestContext } from '../../common/request-context';

@Controller('public/shares')
export class PublicSharesController {
  constructor(private readonly publicShares: PublicSharesService) {}

  @Post('open')
  @HttpCode(200)
  open(@Body() dto: OpenShareDto, @Req() req: Request): Promise<OpenedShare> {
    return this.publicShares.open(dto, getRequestContext(req));
  }
}
