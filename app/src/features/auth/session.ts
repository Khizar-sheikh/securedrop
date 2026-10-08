import AsyncStorage from '@react-native-async-storage/async-storage';
import type { StoredSession } from '../../types/auth';
import { logger } from '../../utils/logger';

const STORAGE_KEY = 'securedrop.session.v1';

/** Device-local persistence for the owner session (access + refresh token). */
export const sessionStore = {
  async load(): Promise<StoredSession | null> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as StoredSession;
      if (typeof parsed?.accessToken !== 'string' || typeof parsed?.refreshToken !== 'string') {
        return null;
      }
      return { accessToken: parsed.accessToken, refreshToken: parsed.refreshToken, user: parsed.user ?? null };
    } catch (error) {
      logger.warn('Failed to read stored session', error);
      return null;
    }
  },

  async save(session: StoredSession): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } catch (error) {
      logger.warn('Failed to persist session', error);
    }
  },

  async clear(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      logger.warn('Failed to clear session', error);
    }
  },
};
