import { api } from './api';
import type { PublicUser, SessionPayload } from '../types/auth';

export const authApi = {
  register: (email: string, password: string) =>
    api.post<PublicUser>('/auth/register', { email, password }),

  login: (email: string, password: string) => api.post<SessionPayload>('/auth/login', { email, password }),

  refresh: (refreshToken: string) =>
    api.post<SessionPayload>('/auth/refresh', { refreshToken }, { token: null, skipRefresh: true }),

  logout: (refreshToken: string) =>
    api.post<{ loggedOut: boolean }>('/auth/logout', { refreshToken }, { token: null, skipRefresh: true }),

  me: () => api.get<PublicUser>('/auth/me'),
};
