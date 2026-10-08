import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { ApiError, NETWORK_ERROR_CODE, TIMEOUT_ERROR_CODE, setAccessToken, setRefreshHandler } from '../../services/api';
import { authApi } from '../../services/authApi';
import { sessionStore } from './session';
import type { PublicUser, SessionPayload, StoredSession } from '../../types/auth';
import { logger } from '../../utils/logger';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthContextValue {
  status: AuthStatus;
  user: PublicUser | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const SESSION_ERROR_CODES = new Set(['SESSION_EXPIRED', 'SESSION_INVALID', 'UNAUTHORIZED']);

const isSessionError = (error: unknown): error is ApiError =>
  error instanceof ApiError && SESSION_ERROR_CODES.has(error.code);

const isOffline = (error: unknown): error is ApiError =>
  error instanceof ApiError && (error.code === NETWORK_ERROR_CODE || error.code === TIMEOUT_ERROR_CODE);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<PublicUser | null>(null);
  // Single-flight refresh so token rotation is never raced by parallel requests.
  const refreshInFlight = useRef<Promise<boolean> | null>(null);

  const persist = useCallback(async (payload: SessionPayload) => {
    setAccessToken(payload.accessToken);
    setUser(payload.user);
    const stored: StoredSession = {
      accessToken: payload.accessToken,
      refreshToken: payload.refreshToken,
      user: payload.user,
    };
    await sessionStore.save(stored);
    setStatus('authenticated');
  }, []);

  const clearSession = useCallback(async () => {
    setAccessToken(null);
    setUser(null);
    await sessionStore.clear();
    setStatus('unauthenticated');
  }, []);

  const refreshSession = useCallback(async (): Promise<boolean> => {
    refreshInFlight.current ??= (async () => {
      try {
        const stored = await sessionStore.load();
        if (!stored) return false;
        const payload = await authApi.refresh(stored.refreshToken);
        await persist(payload);
        return true;
      } catch (error) {
        if (isSessionError(error)) {
          await clearSession();
        } else if (isOffline(error)) {
          logger.warn('Refresh while offline; keeping stored session');
        } else {
          logger.warn('Token refresh failed', error);
        }
        return false;
      } finally {
        refreshInFlight.current = null;
      }
    })();
    return refreshInFlight.current;
  }, [clearSession, persist]);

  const bootstrap = useCallback(async () => {
    const stored = await sessionStore.load();
    if (!stored) {
      setStatus('unauthenticated');
      return;
    }

    setAccessToken(stored.accessToken);
    setUser(stored.user);

    try {
      const me = await authApi.me();
      await sessionStore.save({ ...stored, user: me });
      setUser(me);
      setStatus('authenticated');
    } catch (error) {
      if (isOffline(error)) {
        // Keep the stored session: connectivity, not credentials, is the problem.
        setStatus(stored.user ? 'authenticated' : 'unauthenticated');
        return;
      }
      await clearSession();
    }
  }, [clearSession]);

  useEffect(() => {
    setRefreshHandler(refreshSession);
    // Deferred so the effect itself only schedules work.
    const timer = setTimeout(() => void bootstrap(), 0);
    return () => {
      clearTimeout(timer);
      setRefreshHandler(null);
    };
  }, [bootstrap, refreshSession]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const payload = await authApi.login(email, password);
      await persist(payload);
    },
    [persist],
  );

  const signUp = useCallback(
    async (email: string, password: string) => {
      await authApi.register(email, password);
      const payload = await authApi.login(email, password);
      await persist(payload);
    },
    [persist],
  );

  const signOut = useCallback(async () => {
    const stored = await sessionStore.load();
    if (stored) {
      try {
        await authApi.logout(stored.refreshToken);
      } catch (error) {
        logger.warn('Logout request failed; clearing session locally anyway', error);
      }
    }
    await clearSession();
  }, [clearSession]);

  const value = useMemo<AuthContextValue>(
    () => ({ status, user, signIn, signUp, signOut }),
    [status, user, signIn, signUp, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
};
