import { env } from '../constants/env';
import type { ApiResponse } from '../types/api';
import { logger } from '../utils/logger';

export class ApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const NETWORK_ERROR_CODE = 'NETWORK_ERROR';
export const TIMEOUT_ERROR_CODE = 'TIMEOUT';

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  /** Bearer token for authenticated endpoints. */
  token?: string | null;
  signal?: AbortSignal;
  timeoutMs?: number;
  /** Query string parameters (undefined/null values are dropped). */
  query?: Record<string, string | number | boolean | undefined | null>;
}

let accessToken: string | null = null;

/** Stored session token; attached automatically to authenticated calls. */
export const setAccessToken = (token: string | null): void => {
  accessToken = token;
};

export const getAccessToken = (): string | null => accessToken;

const buildUrl = (path: string, query?: RequestOptions['query']): string => {
  const url = `${env.apiBaseUrl}${path.startsWith('/') ? path : `/${path}`}`;
  if (!query) return url;

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) continue;
    params.append(key, String(value));
  }

  const qs = params.toString();
  return qs ? `${url}?${qs}` : url;
};

/**
 * Calls the API and unwraps the { success, data } envelope.
 * Throws ApiError for API failures, network errors and timeouts.
 */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, token, signal, timeoutMs = 30_000, query } = options;
  const url = buildUrl(path, query);

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const effectiveToken = token === undefined ? accessToken : token;
  if (effectiveToken) headers.Authorization = `Bearer ${effectiveToken}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const onExternalAbort = () => controller.abort();
  signal?.addEventListener('abort', onExternalAbort);

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });

    const text = await response.text();
    let payload: ApiResponse<T> | null = null;
    try {
      payload = text ? (JSON.parse(text) as ApiResponse<T>) : null;
    } catch {
      payload = null;
    }

    if (!payload) {
      logger.error('Non-JSON response', response.status, url);
      throw new ApiError('INTERNAL_ERROR', 'The server returned an unexpected response.', response.status);
    }

    if (!payload.success) {
      throw new ApiError(payload.error.code, payload.error.message, response.status);
    }

    return payload.data;
  } catch (error) {
    if (error instanceof ApiError) throw error;

    if (error instanceof DOMException && error.name === 'AbortError') {
      if (signal?.aborted) throw error; // caller cancelled deliberately
      throw new ApiError(TIMEOUT_ERROR_CODE, 'The request timed out. Please try again.', 0);
    }

    logger.warn('Network failure', path, error);
    throw new ApiError(NETWORK_ERROR_CODE, 'Cannot reach the server. Check your connection.', 0);
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onExternalAbort);
  }
}

export const api = {
  get: <T>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(path, { ...options, method: 'POST', body }),
  patch: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(path, { ...options, method: 'PATCH', body }),
  delete: <T>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(path, { ...options, method: 'DELETE' }),
};
