import { HttpException, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { fail } from './api-response';
import { ERROR_CODES } from './error-codes';

/** Global request-rate guard that answers in the standard error envelope. */
@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  protected async throwThrottlingException(): Promise<void> {
    throw new HttpException(fail(ERROR_CODES.RATE_LIMITED), 429);
  }
}
