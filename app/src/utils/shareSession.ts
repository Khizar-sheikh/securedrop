import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from './logger';

const STORAGE_KEY = 'securedrop.shareSessions.v1';

type SessionMap = Record<string, string>;

const readAll = async (): Promise<SessionMap> => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as SessionMap;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (error) {
    logger.warn('Failed to read share sessions', error);
    return {};
  }
};

const writeAll = async (map: SessionMap): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch (error) {
    logger.warn('Failed to persist share session', error);
  }
};

/** Device-local recipient session secrets, keyed by share token. */
export const shareSessionStore = {
  async load(token: string): Promise<string | null> {
    const map = await readAll();
    return map[token] ?? null;
  },

  async save(token: string, secret: string): Promise<void> {
    const map = await readAll();
    map[token] = secret;
    await writeAll(map);
  },

  async clear(token: string): Promise<void> {
    const map = await readAll();
    if (!(token in map)) return;
    delete map[token];
    await writeAll(map);
  },
};
