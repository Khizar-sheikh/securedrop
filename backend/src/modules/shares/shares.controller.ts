import { Body, Controller, Delete, Get, HttpCode, Param, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { getRequestContext } from '../../common/request-context';
import { CreateShareDto } from './dto/create-share.dto';
import { SharesService } from './shares.service';

@Controller('shares')
@UseGuards(AccessTokenGuard)
export class SharesController {
  constructor(private readonly shares: SharesService) {}

  @Get()
  list(@Req() req: Request) {
    return this.shares.list(req.user!.id);
  }

  @Post()
  create(@Req() req: Request, @Body() dto: CreateShareDto) {
    return this.shares.create(req.user!.id, dto, getRequestContext(req));
  }

  @Delete(':id')
  @HttpCode(200)
  revoke(@Req() req: Request, @Param('id') id: string) {
    return this.shares.revoke(req.user!.id, id, getRequestContext(req));
  }
}
