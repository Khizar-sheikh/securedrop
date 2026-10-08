import { fetch } from 'expo/fetch';
import { File, Paths } from 'expo-file-system';
import { env } from '../constants/env';
import type { CreateShareInput, OpenedShare, PublicShare, PublicShareListItem, ShareInspection } from '../types/shares';
import { ApiError, api } from './api';

export interface OpenShareInput {
  token: string;
  password?: string;
  sessionSecret?: string;
}

const safeFilename = (name: string): string => {
  const cleaned = name.replace(/[\u0000-\u001f/\\?%*:|"<>]/g, '_').trim();
  return (cleaned || 'download').slice(0, 120);
};

/**
 * Streams a shared file from the API into the app cache. The endpoint is a
 * POST with the session credential — there is no permanent storage URL.
 */
const downloadShareFile = async (input: OpenShareInput, filename: string): Promise<string> => {
  const response = await fetch(`${env.apiBaseUrl}/public/shares/download`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/octet-stream' },
    body: JSON.stringify({ token: input.token, sessionSecret: input.sessionSecret }),
  });

  if (!response.ok) {
    let code = 'INTERNAL_ERROR';
    let message = 'The download could not be completed. Please try again.';
    try {
      const payload = (await response.json()) as { success?: boolean; error?: { code?: string; message?: string } };
      if (payload?.error?.code) {
        code = payload.error.code;
        message = payload.error.message ?? message;
      }
    } catch {
      // keep the generic message for non-JSON failures
    }
    throw new ApiError(code, message, response.status);
  }

  const bytes = await response.bytes();
  const file = new File(Paths.cache, safeFilename(filename));
  if (file.exists) file.delete();
  file.write(bytes);
  return file.uri;
};

export const sharesApi = {
  create: (input: CreateShareInput) => api.post<PublicShare>('/shares', input),
  list: () => api.get<{ items: PublicShareListItem[] }>('/shares'),
  revoke: (id: string) => api.delete<{ id: string; revoked: boolean }>(`/shares/${id}`),

  /** Metadata-only: never consumes an access or creates a session. */
  inspectShare: (token: string) => api.post<ShareInspection>('/public/shares/open', { token, inspect: true }),

  /** Opens or restores a recipient session. */
  openShare: (input: OpenShareInput) => api.post<OpenedShare>('/public/shares/open', input),

  downloadShareFile,
};
