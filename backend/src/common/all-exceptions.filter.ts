import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ERROR_CODES, ERROR_MESSAGES, ErrorCode } from './error-codes';
import { fail } from './api-response';

const statusToCode: Record<number, ErrorCode> = {
  400: ERROR_CODES.BAD_REQUEST,
  401: ERROR_CODES.UNAUTHORIZED,
  403: ERROR_CODES.FORBIDDEN,
  404: ERROR_CODES.NOT_FOUND,
  409: ERROR_CODES.CONFLICT,
  413: ERROR_CODES.FILE_TOO_LARGE,
  429: ERROR_CODES.RATE_LIMITED,
  503: ERROR_CODES.SERVICE_UNAVAILABLE,
};

const isApiFailure = (value: unknown): value is { success: false; error: { code: ErrorCode; message: string } } =>
  typeof value === 'object' &&
  value !== null &&
  (value as { success?: unknown }).success === false &&
  typeof (value as { error?: { code?: unknown } }).error?.code === 'string';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<{ status(code: number): { json(body: unknown): unknown } }>();
    const request = ctx.getRequest<{ method?: string; url?: string }>();

    const { status, code, message, unexpected } = this.resolve(exception);

    if (unexpected) {
      // Full detail stays server-side; the client only ever gets a safe message.
      this.logger.error(
        `Unhandled exception on ${request.method ?? '?'} ${request.url ?? '?'}: ${
          exception instanceof Error ? (exception.stack ?? exception.message) : String(exception)
        }`,
      );
    }

    response.status(status).json(fail(code, message));
  }

  private resolve(exception: unknown): {
    status: number;
    code: ErrorCode;
    message: string;
    unexpected: boolean;
  } {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();

      // Controllers may throw HttpException carrying our own failure envelope.
      if (isApiFailure(body)) {
        return { status, code: body.error.code, message: body.error.message, unexpected: false };
      }

      // class-validator failures arrive as message[] / message string on a 400.
      if (status === HttpStatus.BAD_REQUEST || status === HttpStatus.UNPROCESSABLE_ENTITY) {
        const maybeMessage = typeof body === 'object' && body !== null ? (body as { message?: unknown }).message : undefined;
        if (Array.isArray(maybeMessage) || typeof maybeMessage === 'string') {
          return {
            status,
            code: ERROR_CODES.VALIDATION_FAILED,
            message: ERROR_MESSAGES.VALIDATION_FAILED,
            unexpected: false,
          };
        }
      }

      // Plain-string bodies are explicit messages set by the controller.
      if (typeof body === 'string' && body.length > 0) {
        const code = statusToCode[status] ?? ERROR_CODES.INTERNAL_ERROR;
        return { status, code, message: body, unexpected: status >= 500 };
      }

      const code = statusToCode[status] ?? ERROR_CODES.INTERNAL_ERROR;
      return { status, code, message: ERROR_MESSAGES[code], unexpected: status >= 500 };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      code: ERROR_CODES.INTERNAL_ERROR,
      message: ERROR_MESSAGES.INTERNAL_ERROR,
      unexpected: true,
    };
  }
}
