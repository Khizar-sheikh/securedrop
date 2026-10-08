import type { Request } from 'express';

export interface RequestContext {
  ip: string | null;
  userAgent: string | null;
}

/**
 * Best-effort request metadata used as an audit/security signal.
 * IP is recorded as a risk signal only — never as an identity.
 */
export const getRequestContext = (req: Request): RequestContext => ({
  ip: req.ip ?? req.socket?.remoteAddress ?? null,
  userAgent: typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'].slice(0, 500) : null,
});

/** Extracts context from a Nest execution context. */
export const getRequestContextFromArgs = (args: unknown[]): RequestContext => {
  const req = (args[2] as { getRequest?: () => Request })?.getRequest?.() ?? (args[0] as Request);
  return getRequestContext(req ?? ({} as Request));
};
