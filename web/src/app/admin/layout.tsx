'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { RequireAuth } from '../../components/auth/require-auth';

const nav = [
  { href: '/admin', label: 'Overview' },
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/shares', label: 'Shares' },
  { href: '/admin/audit', label: 'Audit' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth adminOnly>
      <AdminShell>{children}</AdminShell>
    </RequireAuth>
  );
}

function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <div className="bg-surface-variant">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-1.5 text-xs text-muted">
          <span className="font-medium uppercase tracking-wider">Administration</span>
          <Link href="/app" className="hover:text-text">
            ← Back to my files
          </Link>
        </div>
      </div>
      <header className="border-b border-border">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-6 py-3">
          <Link href="/admin" className="text-[15px] font-bold tracking-tight text-text">
            SecureDrop Admin
          </Link>
          <nav aria-label="Admin" className="flex items-center gap-1">
            {nav.map((item) => {
              const active =
                item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href);
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
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">{children}</main>
    </div>
  );
}
