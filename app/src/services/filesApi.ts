import { api } from './api';
import type { FileList, PublicFile } from '../types/files';

export const filesApi = {
  list: (page = 1, pageSize = 20) => api.get<FileList>('/files', { query: { page, pageSize } }),
  get: (id: string) => api.get<PublicFile>(`/files/${id}`),
  remove: (id: string) => api.delete<{ id: string; deleted: boolean }>(`/files/${id}`),
};
