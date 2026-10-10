import { IsIn, IsOptional } from 'class-validator';
import { AdminPaginationQuery } from './admin-pagination.query';

export class ListAdminSharesQuery extends AdminPaginationQuery {
  @IsOptional()
  @IsIn(['ACTIVE', 'REVOKED', 'EXPIRED', 'CONSUMED'])
  status?: 'ACTIVE' | 'REVOKED' | 'EXPIRED' | 'CONSUMED';
}
