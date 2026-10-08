import { HttpException, Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomBytes } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { SessionService } from '../sessions/session.service';
import { RequestContext } from '../../common/request-context';
import { fail } from '../../common/api-response';
import { ERROR_CODES } from '../../common/error-codes';
import { assertPasswordPolicy, hashPassword, verifyPassword } from '../../security/password';
import { AppConfig } from '../../config/configuration';
import { APP_CONFIG } from '../../config/tokens';
import { toPublicUser } from '../users/user.presenter';
import { LoginDto } from './dto/login.dto';
import { LogoutDto } from './dto/logout.dto';
import { RefreshDto } from './dto/refresh.dto';
import { RegisterDto } from './dto/register.dto';

let dummyPasswordHash: Promise<string> | null = null;

/** Equalizes timing for "user not found" so login cannot enumerate accounts. */
const dummyVerify = (password: string): Promise<boolean> => {
  dummyPasswordHash ??= hashPassword(randomBytes(16).toString('hex'));
  return dummyPasswordHash.then((hash) => verifyPassword(password, hash));
};

export interface SessionResponse {
  user: ReturnType<typeof toPublicUser>;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  refreshExpiresIn: number;
}

@Injectable()
export class AuthService {
  private readonly accessTtlSeconds: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly sessions: SessionService,
    private readonly jwt: JwtService,
    @Inject(APP_CONFIG) config: AppConfig,
  ) {
    this.accessTtlSeconds = config.tokens.accessTtlSeconds;
  }

  async register(dto: RegisterDto, context: RequestContext) {
    const email = dto.email.trim().toLowerCase();
    assertPasswordPolicy(dto.password);

    const passwordHash = await hashPassword(dto.password);

    let user;
    try {
      user = await this.prisma.user.create({ data: { email, passwordHash } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new HttpException(fail(ERROR_CODES.EMAIL_TAKEN), 409);
      }
      throw error;
    }

    await this.audit.record({
      type: 'USER_REGISTERED',
      actorUserId: user.id,
      ip: context.ip,
      userAgent: context.userAgent,
    });

    return toPublicUser(user);
  }

  async login(dto: LoginDto, context: RequestContext): Promise<SessionResponse> {
    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email } });

    const passwordOk = user
      ? await verifyPassword(dto.password, user.passwordHash)
      : await dummyVerify(dto.password);

    if (!user || !passwordOk) {
      await this.audit.record({
        type: 'LOGIN_FAILED',
        ip: context.ip,
        userAgent: context.userAgent,
        metadata: { reason: 'invalid_credentials' },
      });
      throw new HttpException(fail(ERROR_CODES.INVALID_CREDENTIALS), 401);
    }

    if (user.status !== 'ACTIVE') {
      await this.audit.record({
        type: 'LOGIN_FAILED',
        actorUserId: user.id,
        ip: context.ip,
        userAgent: context.userAgent,
        metadata: { reason: 'account_disabled' },
      });
      throw new HttpException(fail(ERROR_CODES.ACCOUNT_DISABLED), 403);
    }

    const { refreshToken, expiresInSeconds } = await this.sessions.create(user.id);

    await this.audit.record({
      type: 'USER_LOGIN',
      actorUserId: user.id,
      ip: context.ip,
      userAgent: context.userAgent,
    });

    return {
      user: toPublicUser(user),
      accessToken: this.signAccessToken(user.id),
      refreshToken,
      expiresIn: this.accessTtlSeconds,
      refreshExpiresIn: expiresInSeconds,
    };
  }

  async refresh(dto: RefreshDto, context: RequestContext): Promise<SessionResponse> {
    // Single-use: the old token is consumed atomically, so it cannot be replayed.
    const session = await this.sessions.consume(dto.refreshToken);
    if (!session) {
      throw new HttpException(fail(ERROR_CODES.SESSION_INVALID), 401);
    }

    const user = await this.prisma.user.findUnique({ where: { id: session.userId } });
    if (!user || user.status !== 'ACTIVE') {
      throw new HttpException(fail(ERROR_CODES.SESSION_INVALID), 401);
    }

    const { refreshToken, expiresInSeconds } = await this.sessions.create(user.id);

    return {
      user: toPublicUser(user),
      accessToken: this.signAccessToken(user.id),
      refreshToken,
      expiresIn: this.accessTtlSeconds,
      refreshExpiresIn: expiresInSeconds,
    };
  }

  /** Idempotent: an unknown token is treated as already logged out. */
  async logout(dto: LogoutDto, context: RequestContext): Promise<{ loggedOut: boolean }> {
    const session = await this.sessions.lookup(dto.refreshToken);
    await this.sessions.revoke(dto.refreshToken);

    if (session) {
      await this.audit.record({
        type: 'USER_LOGOUT',
        actorUserId: session.userId,
        ip: context.ip,
        userAgent: context.userAgent,
      });
    }

    return { loggedOut: true };
  }

  private signAccessToken(userId: string): string {
    return this.jwt.sign({ sub: userId, typ: 'access' });
  }
}
