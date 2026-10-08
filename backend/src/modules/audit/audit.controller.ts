import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { AuditService } from './audit.service';
import { ListAuditQuery } from './dto/list-audit.query';

@Controller('audit')
@UseGuards(AccessTokenGuard)
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  list(@Req() req: Request, @Query() query: ListAuditQuery) {
    return this.audit.listForOwner(req.user!.id, query);
  }
}
