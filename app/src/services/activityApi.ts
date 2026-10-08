import { api } from './api';
import type { ActivityItem } from '../types/activity';

export const activityApi = {
  list: (limit = 50) => api.get<{ items: ActivityItem[]; hasMore: boolean }>('/audit', { query: { limit } }),
};
