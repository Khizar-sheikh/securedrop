import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { AllExceptionsFilter } from '../common/all-exceptions.filter';
import { ResponseInterceptor } from '../common/response.interceptor';
import { requestLogging } from '../common/request-logging';
import { AppConfig } from '../config/configuration';
import { APP_CONFIG } from '../config/tokens';

/** All routes live under /api/v1/... */
export const API_PREFIX = 'api';
export const API_VERSION = '1';

/** Builds a versioned API path, e.g. apiUrl('health') -> '/api/v1/health'. */
export const apiUrl = (path: string): string =>
  `/${API_PREFIX}/v${API_VERSION}/${path.replace(/^\/+/, '')}`;

/**
 * CORS is opt-in: it is only enabled when CORS_ORIGINS lists explicit trusted
 * origins. Auth uses the Authorization header (no cookies), so credentials
 * stay disabled.
 */
const enableConfiguredCors = (app: INestApplication): void => {
  let origins: string[] = [];
  try {
    origins = app.get<AppConfig>(APP_CONFIG, { strict: false }).corsOrigins ?? [];
  } catch {
    return; // configuration unavailable (e.g. a minimal test module)
  }
  if (origins.length === 0) return;

  app.enableCors({
    origin: origins,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    exposedHeaders: ['Content-Disposition'],
    credentials: false,
    maxAge: 86_400,
  });
};

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

  enableConfiguredCors(app);

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
