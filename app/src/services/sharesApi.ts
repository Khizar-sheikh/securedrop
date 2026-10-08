import { api } from './api';
import type { CreateShareInput, PublicShare, PublicShareListItem } from '../types/shares';

export const sharesApi = {
  create: (input: CreateShareInput) => api.post<PublicShare>('/shares', input),
  list: () => api.get<{ items: PublicShareListItem[] }>('/shares'),
  revoke: (id: string) => api.delete<{ id: string; revoked: boolean }>(`/shares/${id}`),
};
