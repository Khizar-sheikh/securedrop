'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../../components/auth/auth-provider';
import { RequireAuth } from '../../components/auth/require-auth';

const nav = [
  { href: '/app', label: 'Files' },
  { href: '/app/shares', label: 'Shares' },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <Shell>{children}</Shell>
    </RequireAuth>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  if (!user) return null;

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex w-full max-w-4xl flex-wrap items-center gap-x-6 gap-y-2 px-6 py-3">
          <Link href="/app" className="text-[15px] font-bold tracking-tight text-text">
            SecureDrop
          </Link>
          <nav aria-label="App" className="flex items-center gap-1">
            {nav.map((item) => {
              const active =
                item.href === '/app'
                  ? pathname === '/app' || pathname === '/app/files'
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                    active ? 'bg-surface-variant text-text' : 'text-muted hover:text-text'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
            {user.role === 'ADMIN' && (
              <Link
                href="/admin"
                className="rounded-md px-3 py-1.5 text-sm font-medium text-brand hover:bg-surface-variant"
              >
                Admin
              </Link>
            )}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-sm text-muted sm:inline">{user.email}</span>
            <button
              type="button"
              onClick={() => void logout()}
              className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-text hover:bg-surface-variant"
            >
              Log out
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-8">{children}</main>
    </div>
  );
}
