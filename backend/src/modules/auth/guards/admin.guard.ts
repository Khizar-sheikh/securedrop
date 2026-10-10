import { CanActivate, ExecutionContext, HttpException, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { fail } from '../../../common/api-response';
import { ERROR_CODES } from '../../../common/error-codes';

/**
 * Requires req.user (set by AccessTokenGuard) to hold the ADMIN role.
 * The role is read from the database on every request — never from the token —
 * so demotions and suspensions take effect immediately.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    if (request.user?.role !== 'ADMIN') {
      throw new HttpException(fail(ERROR_CODES.FORBIDDEN), 403);
    }
    return true;
  }
}
