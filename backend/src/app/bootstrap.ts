import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import type { RequestHandler } from 'express';
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
 * Defense-in-depth headers on every response: no MIME sniffing, no framing,
 * no referrer leakage (share tokens live in request bodies/paths), no plugin
 * content. API responses are never cacheable — several of them carry tokens.
 */
export const securityHeaders: RequestHandler = (req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  if (req.path.startsWith(`/${API_PREFIX}/`)) {
    res.setHeader('Cache-Control', 'no-store');
  }
  next();
};

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
  // Registered before CORS so preflight responses get the headers too.
  app.use(securityHeaders);
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
