import { API_URL, getAccessToken, setAccessToken } from './api';
import type { FileItem } from './types';

const refreshAccessToken = async (): Promise<string | null> => {
  try {
    const res = await fetch('/api/auth/refresh', { method: 'POST', credentials: 'same-origin' });
    if (!res.ok) return null;
    const body = (await res.json()) as { accessToken: string };
    setAccessToken(body.accessToken);
    return body.accessToken;
  } catch {
    return null;
  }
};

/** Uploads with real progress via XHR (fetch cannot report upload progress). */
export async function uploadFile(
  file: File,
  onProgress: (fraction: number) => void,
): Promise<FileItem> {
  const attempt = async (token: string | null): Promise<{ status: number; item?: FileItem }> => {
    return new Promise((resolve) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${API_URL}/files`);
      if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) onProgress(event.loaded / event.total);
      };
      xhr.onload = () => {
        let item: FileItem | undefined;
        try {
          const body = JSON.parse(xhr.responseText) as {
            success: boolean;
            data?: FileItem;
          };
          if (body.success) item = body.data;
        } catch {
          item = undefined;
        }
        resolve({ status: xhr.status, item });
      };
      xhr.onerror = () => resolve({ status: 0 });
      const form = new FormData();
      form.append('file', file);
      xhr.send(form);
    });
  };

  let result = await attempt(getAccessToken());
  if (result.status === 401) {
    const token = await refreshAccessToken();
    if (token) result = await attempt(token);
  }
  if (!result.item) {
    throw new Error(
      result.status === 401
        ? 'Your session expired. Please sign in again.'
        : result.status === 413
          ? 'This file is too large to upload.'
          : result.status === 415
            ? 'This file type is not supported.'
            : 'The upload failed. Please try again.',
    );
  }
  return result.item;
}
