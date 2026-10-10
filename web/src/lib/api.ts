/** Typed client for the SecureDrop backend. Access token lives in memory only;
 * the rotating refresh token is held by the server in an httpOnly cookie. */

import type { SessionResponse, User } from './types';

const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000').replace(/\/+$/, '');
export const API_URL = `${API_BASE}/api/v1`;

export class ApiError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface Envelope<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
}

let accessToken: string | null = null;

export const setAccessToken = (token: string | null): void => {
  accessToken = token;
};

export const getAccessToken = (): string | null => accessToken;

/** Asks our own route handler to rotate the stored refresh cookie. */
const refreshViaCookie = async (): Promise<{ accessToken: string; user: User } | null> => {
  try {
    const res = await fetch('/api/auth/refresh', { method: 'POST', credentials: 'same-origin' });
    if (!res.ok) return null;
    const body = (await res.json()) as { accessToken?: string; user?: User };
    if (!body.accessToken || !body.user) return null;
    return { accessToken: body.accessToken, user: body.user };
  } catch {
    return null;
  }
};

type ApiOptions = RequestInit & { retryOn401?: boolean; skipAuth?: boolean };

export async function apiFetch<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { retryOn401 = true, skipAuth = false, headers, body, ...rest } = options;

  const send = async (): Promise<Response> => {
    const isForm = body instanceof FormData;
    return fetch(`${API_URL}/${path.replace(/^\/+/, '')}`, {
      ...rest,
      body,
      headers: {
        ...(isForm || body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(accessToken && !skipAuth ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...(headers as Record<string, string> | undefined),
      },
    });
  };

  const parse = async (res: Response): Promise<T> => {
    const payload = (await res.json().catch(() => null)) as Envelope<T> | null;
    if (!res.ok || !payload?.success || payload.data === undefined) {
      const code = payload?.error?.code ?? (res.ok ? 'INTERNAL_ERROR' : `HTTP_${res.status}`);
      const message = payload?.error?.message ?? 'Something went wrong. Please try again.';
      throw new ApiError(message, code, res.status);
    }
    return payload.data;
  };

  let res = await send();

  if (res.status === 401 && retryOn401 && !skipAuth) {
    const refreshed = await refreshViaCookie();
    if (refreshed) {
      accessToken = refreshed.accessToken;
      res = await send();
    } else {
      accessToken = null;
    }
  }

  return parse(res);
}

/** Sends the rotating refresh token to our session route so it is stored httpOnly. */
export const storeRefreshSession = async (
  refreshToken: string,
  refreshExpiresIn: number,
): Promise<void> => {
  await fetch('/api/auth/session', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken, refreshExpiresIn }),
  });
};

/** Completes login/register against the backend and stores the refresh cookie. */
export const completeLogin = async (data: SessionResponse): Promise<User> => {
  setAccessToken(data.accessToken);
  await storeRefreshSession(data.refreshToken, data.refreshExpiresIn);
  return data.user;
};

export const endSession = async (): Promise<void> => {
  try {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
  } finally {
    setAccessToken(null);
  }
};

/** Binary download for a public share. Returns the blob and its filename. */
export const downloadShareFile = async (
  token: string,
  sessionSecret: string | undefined,
): Promise<{ blob: Blob; filename: string }> => {
  const res = await fetch(`${API_URL}/public/shares/download`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, sessionSecret }),
  });

  if (!res.ok) {
    const payload = (await res.json().catch(() => null)) as Envelope<never> | null;
    throw new ApiError(
      payload?.error?.message ?? 'The download could not be started.',
      payload?.error?.code ?? `HTTP_${res.status}`,
      res.status,
    );
  }

  const disposition = res.headers.get('content-disposition') ?? '';
  const starMatch = /filename\*=UTF-8''([^;]+)/i.exec(disposition);
  const plainMatch = /filename="([^"]+)"/i.exec(disposition);
  const filename = starMatch
    ? decodeURIComponent(starMatch[1])
    : (plainMatch?.[1] ?? 'download');

  return { blob: await res.blob(), filename };
};
