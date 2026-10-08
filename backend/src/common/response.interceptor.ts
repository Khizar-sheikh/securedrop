import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, map } from 'rxjs';
import { ok } from './api-response';

const isAlreadyWrapped = (value: unknown): value is { success: true } =>
  typeof value === 'object' && value !== null && (value as { success?: unknown }).success === true;

/**
 * Wraps every successful response as { success: true, data }.
 * Handlers can also return ok(...) themselves; those pass through unchanged.
 */
@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(map((data) => (isAlreadyWrapped(data) ? data : ok(data ?? null))));
  }
}
