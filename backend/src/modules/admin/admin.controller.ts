import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { getRequestContext } from '../../common/request-context';
import { AdminService } from './admin.service';
import { ListUsersQuery } from './dto/list-users.query';
import { ListAdminSharesQuery } from './dto/list-admin-shares.query';
import { ListAdminAuditQuery } from './dto/list-admin-audit.query';
import { SetUserStatusDto } from './dto/set-user-status.dto';

/** Admin-only oversight API. Every route requires an ADMIN role (DB-checked). */
@Controller('admin')
@UseGuards(AccessTokenGuard, AdminGuard)
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('metrics')
  metrics() {
    return this.admin.metrics();
  }

  @Get('users')
  listUsers(@Query() query: ListUsersQuery) {
    return this.admin.listUsers(query);
  }

  @Patch('users/:id/status')
  setUserStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetUserStatusDto,
    @Req() req: Request,
  ) {
    return this.admin.setUserStatus(id, dto.status, req.user!.id, getRequestContext(req));
  }

  @Get('shares')
  listShares(@Query() query: ListAdminSharesQuery) {
    return this.admin.listShares(query);
  }

  @Delete('shares/:id')
  revokeShare(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    return this.admin.revokeShare(id, req.user!.id, getRequestContext(req));
  }

  @Get('audit')
  listAudit(@Query() query: ListAdminAuditQuery) {
    return this.admin.listAudit(query);
  }
}
