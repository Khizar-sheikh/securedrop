'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { apiFetch, completeLogin, endSession, setAccessToken } from '../../lib/api';
import type { SessionResponse, User } from '../../lib/types';

type AuthStatus = 'loading' | 'authed' | 'anon';

interface AuthContextValue {
  user: User | null;
  status: AuthStatus;
  login: (email: string, password: string) => Promise<User>;
  register: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  reloadUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // Restore a session from the httpOnly refresh cookie on first load.
  useEffect(() => {
    let cancelled = false;
    const restore = async () => {
      try {
        const res = await fetch('/api/auth/refresh', { method: 'POST', credentials: 'same-origin' });
        if (!res.ok) throw new Error('no session');
        const body = (await res.json()) as { accessToken: string; user: User };
        if (cancelled) return;
        setAccessToken(body.accessToken);
        setUser(body.user);
        setStatus('authed');
      } catch {
        if (cancelled) return;
        setAccessToken(null);
        setUser(null);
        setStatus('anon');
      }
    };
    void restore();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<User> => {
    const data = await apiFetch<SessionResponse>('auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
      retryOn401: false,
      skipAuth: true,
    });
    const signedIn = await completeLogin(data);
    setUser(signedIn);
    setStatus('authed');
    return signedIn;
  }, []);

  const register = useCallback(
    async (email: string, password: string): Promise<User> => {
      await apiFetch<unknown>('auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
        retryOn401: false,
        skipAuth: true,
      });
      return login(email, password);
    },
    [login],
  );

  const logout = useCallback(async (): Promise<void> => {
    await endSession();
    if (mounted.current) {
      setUser(null);
      setStatus('anon');
    }
  }, []);

  const reloadUser = useCallback(async (): Promise<void> => {
    try {
      const me = await apiFetch<User>('auth/me');
      if (mounted.current) {
        setUser(me);
        setStatus('authed');
      }
    } catch {
      if (mounted.current) {
        setUser(null);
        setStatus('anon');
      }
    }
  }, []);

  const value = useMemo(
    () => ({ user, status, login, register, logout, reloadUser }),
    [user, status, login, register, logout, reloadUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
