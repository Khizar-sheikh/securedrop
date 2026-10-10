import { AuditEventType } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { AdminPaginationQuery } from './admin-pagination.query';

export class ListAdminAuditQuery extends AdminPaginationQuery {
  @IsOptional()
  @IsEnum(AuditEventType)
  type?: AuditEventType;

  /** Case-insensitive actor email substring search. */
  @IsOptional()
  @IsString()
  @MaxLength(320)
  query?: string;
}
