import { ApiError, NETWORK_ERROR_CODE, TIMEOUT_ERROR_CODE, getAccessToken } from './api';
import { env } from '../constants/env';
import type { ApiResponse } from '../types/api';
import type { PublicFile } from '../types/files';

export class UploadCancelledError extends Error {
  constructor() {
    super('Upload cancelled.');
    this.name = 'UploadCancelledError';
  }
}

export interface UploadJob {
  promise: Promise<PublicFile>;
  cancel: () => void;
}

export interface PickableAsset {
  uri: string;
  name: string;
  mimeType?: string;
}

/**
 * Uploads with real progress and cancellation, which fetch does not support.
 * Rejects with ApiError for API/network failures and UploadCancelledError on abort.
 */
export const uploadFile = (asset: PickableAsset, onProgress?: (percent: number) => void): UploadJob => {
  const xhr = new XMLHttpRequest();

  const promise = new Promise<PublicFile>((resolve, reject) => {
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0 && onProgress) {
        onProgress(Math.min(100, Math.round((event.loaded / event.total) * 100)));
      }
    };

    xhr.onload = () => {
      let payload: ApiResponse<PublicFile> | null = null;
      try {
        payload = xhr.responseText ? (JSON.parse(xhr.responseText) as ApiResponse<PublicFile>) : null;
      } catch {
        payload = null;
      }

      if (!payload) {
        reject(new ApiError('INTERNAL_ERROR', 'The server returned an unexpected response.', xhr.status));
        return;
      }
      if (!payload.success) {
        reject(new ApiError(payload.error.code, payload.error.message, xhr.status));
        return;
      }
      resolve(payload.data);
    };

    xhr.onerror = () => reject(new ApiError(NETWORK_ERROR_CODE, 'Cannot reach the server. Check your connection.', 0));
    xhr.ontimeout = () => reject(new ApiError(TIMEOUT_ERROR_CODE, 'The upload timed out. Please try again.', 0));
    xhr.onabort = () => reject(new UploadCancelledError());

    xhr.open('POST', `${env.apiBaseUrl}/files`);
    xhr.timeout = 300_000;

    const token = getAccessToken();
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.setRequestHeader('Accept', 'application/json');

    const form = new FormData();
    form.append('file', {
      uri: asset.uri,
      name: asset.name,
      type: asset.mimeType || 'application/octet-stream',
    } as unknown as Blob);

    xhr.send(form);
  });

  return { promise, cancel: () => xhr.abort() };
};
