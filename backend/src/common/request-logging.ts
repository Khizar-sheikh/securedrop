import { Logger } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

const logger = new Logger('HTTP');

const SENSITIVE_QUERY = /([?&](?:token|sessionSecret|password|accessToken|refreshToken)=)[^&#]*/gi;
const SHARE_PATH = /(\/(?:public\/shares\/|s\/))[^/?#]+/gi;

/** Share tokens and credentials must never reach the logs. */
export const redactSecrets = (url: string): string =>
  url.replace(SENSITIVE_QUERY, '$1***').replace(SHARE_PATH, '$1***');

/**
 * Minimal access log: method, path, status, duration.
 * Skipped in tests so suites stay quiet.
 */
export const requestLogging = (req: Request, res: Response, next: NextFunction): void => {
  if (process.env.NODE_ENV === 'test') {
    next();
    return;
  }

  const startedAt = Date.now();

  res.on('finish', () => {
    const durationMs = Date.now() - startedAt;
    const line = `${req.method} ${redactSecrets(req.originalUrl)} ${res.statusCode} ${durationMs}ms`;

    if (res.statusCode >= 500) {
      logger.error(line);
    } else if (res.statusCode >= 400) {
      logger.warn(line);
    } else {
      logger.log(line);
    }
  });

  next();
};
