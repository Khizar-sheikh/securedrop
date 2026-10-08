import {
  CanActivate,
  ExecutionContext,
  HttpException,
  Injectable,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { PrismaService } from '../../../database/prisma.service';
import { fail } from '../../../common/api-response';
import { ERROR_CODES } from '../../../common/error-codes';
import { toPublicUser } from '../../users/user.presenter';

/** Verifies the access token, rejects revoked/disabled accounts, and sets req.user. */
@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractToken(request);
    if (!token) {
      throw new HttpException(fail(ERROR_CODES.UNAUTHORIZED), 401);
    }

    let payload: { sub?: string; typ?: string };
    try {
      payload = await this.jwt.verifyAsync(token);
    } catch (error) {
      const expired = (error as { name?: string }).name === 'TokenExpiredError';
      throw new HttpException(fail(expired ? ERROR_CODES.SESSION_EXPIRED : ERROR_CODES.UNAUTHORIZED), 401);
    }

    if (payload.typ !== 'access' || typeof payload.sub !== 'string') {
      throw new HttpException(fail(ERROR_CODES.UNAUTHORIZED), 401);
    }

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) {
      throw new HttpException(fail(ERROR_CODES.UNAUTHORIZED), 401);
    }
    if (user.status !== 'ACTIVE') {
      throw new HttpException(fail(ERROR_CODES.ACCOUNT_DISABLED), 403);
    }

    request.user = toPublicUser(user);
    return true;
  }

  private extractToken(request: Request): string | null {
    const header = request.headers.authorization;
    if (!header) return null;
    const [scheme, token] = header.split(' ');
    if (scheme?.toLowerCase() !== 'bearer' || !token) return null;
    return token;
  }
}
