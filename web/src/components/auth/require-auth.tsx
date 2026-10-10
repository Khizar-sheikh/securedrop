'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './auth-provider';

/** Client-side gate for /app and /admin. The backend enforces authorization
 * on every request; this only avoids flashing protected UI. */
export function RequireAuth({
  children,
  adminOnly = false,
}: {
  children: React.ReactNode;
  adminOnly?: boolean;
}) {
  const { user, status } = useAuth();
  const router = useRouter();

  const blocked =
    status === 'anon' || (status === 'authed' && adminOnly && user?.role !== 'ADMIN');

  useEffect(() => {
    if (status === 'anon') {
      router.replace('/login');
    } else if (status === 'authed' && adminOnly && user?.role !== 'ADMIN') {
      router.replace('/app');
    }
  }, [status, adminOnly, user, router]);

  if (status === 'loading' || (status === 'authed' && adminOnly && user?.role !== 'ADMIN')) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center" aria-busy="true">
        <span className="sr-only">Loading…</span>
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-brand" />
      </div>
    );
  }

  if (blocked) return null;
  return <>{children}</>;
}
