import { IsOptional, IsString, MaxLength } from 'class-validator';
import { AdminPaginationQuery } from './admin-pagination.query';

export class ListUsersQuery extends AdminPaginationQuery {
  /** Case-insensitive email substring search. */
  @IsOptional()
  @IsString()
  @MaxLength(320)
  query?: string;
}
