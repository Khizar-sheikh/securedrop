import type { CreateNoteInput, Note, NoteSummary, UpdateNoteInput } from '../types/notes';
import { api } from './api';

export const notesApi = {
  list: (page = 1, pageSize = 50, tag?: string) =>
    api.get<{ items: NoteSummary[]; hasMore: boolean }>('/notes', {
      query: { page, pageSize, tag },
    }),

  get: (id: string) => api.get<Note>(`/notes/${id}`),

  create: (input: CreateNoteInput) => api.post<Note>('/notes', input),

  update: (id: string, input: UpdateNoteInput) => api.patch<Note>(`/notes/${id}`, input),

  remove: (id: string) => api.delete<{ id: string; deleted: boolean }>(`/notes/${id}`),

  attach: (noteId: string, fileId: string) =>
    api.post<{ noteId: string; fileId: string; attached: boolean }>(`/notes/${noteId}/files`, { fileId }),

  detach: (noteId: string, fileId: string) =>
    api.delete<{ noteId: string; fileId: string; detached: boolean }>(`/notes/${noteId}/files/${fileId}`),
};
