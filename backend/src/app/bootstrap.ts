import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { AllExceptionsFilter } from '../common/all-exceptions.filter';
import { ResponseInterceptor } from '../common/response.interceptor';
import { requestLogging } from '../common/request-logging';

/** All routes live under /api/v1/... */
export const API_PREFIX = 'api';
export const API_VERSION = '1';

/** Builds a versioned API path, e.g. apiUrl('health') -> '/api/v1/health'. */
export const apiUrl = (path: string): string =>
  `/${API_PREFIX}/v${API_VERSION}/${path.replace(/^\/+/, '')}`;

/**
 * Single place where every Nest application (main + tests) is configured,
 * so tests exercise exactly the same pipes/filters/prefix as production.
 */
export const configureApp = (app: INestApplication): INestApplication => {
  app.use(requestLogging);
  app.setGlobalPrefix(API_PREFIX);
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: API_VERSION,
  });

  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      stopAtFirstError: true,
    }),
  );

  return app;
};
