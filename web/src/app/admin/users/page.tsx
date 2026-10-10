'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch, ApiError } from '../../../lib/api';
import { formatDate } from '../../../lib/format';
import type { AdminUser, Paged } from '../../../lib/types';
import { useAuth } from '../../../components/auth/auth-provider';
import { Alert } from '../../../components/ui/alert';
import { Button } from '../../../components/ui/button';
import { ConfirmDialog } from '../../../components/ui/confirm-dialog';
import { Input } from '../../../components/ui/input';
import { Skeleton } from '../../../components/ui/spinner';

const PAGE_SIZE = 20;

export default function AdminUsersPage() {
  const { user: me } = useAuth();
  const [data, setData] = useState<Paged<AdminUser> | null>(null);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [target, setTarget] = useState<AdminUser | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (targetPage: number, q: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(targetPage),
        pageSize: String(PAGE_SIZE),
      });
      if (q) params.set('query', q);
      setData(await apiFetch<Paged<AdminUser>>(`admin/users?${params.toString()}`));
      setPage(targetPage);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load users.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => { void load(1, search); }, 0);
    return () => clearTimeout(timer);
  }, [load, search]);

  const onToggleStatus = async () => {
    if (!target) return;
    setBusy(true);
    try {
      await apiFetch(`admin/users/${target.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: target.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE' }),
      });
      setTarget(null);
      await load(page, search);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not update the account.');
      setTarget(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-text">Users</h1>
      <p className="mt-1 text-sm text-muted">
        Accounts on this instance. Suspending blocks sign-in and API access immediately.
      </p>

      <form
        className="mt-5 flex max-w-md gap-2"
        onSubmit={(event: React.FormEvent) => {
          event.preventDefault();
          setSearch(query.trim());
        }}
      >
        <Input
          type="search"
          value={query}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
          placeholder="Search by email"
          aria-label="Search users by email"
        />
        <Button type="submit" variant="secondary">
          Search
        </Button>
      </form>

      {error && (
        <div className="mt-4">
          <Alert tone="error">
            {error}{' '}
            <button
              type="button"
              onClick={() => void load(page, search)}
              className="font-medium underline"
            >
              Retry
            </button>
          </Alert>
        </div>
      )}

      <div className="mt-6">
        {loading && !data && (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-14" />
            ))}
          </div>
        )}

        {data && data.items.length === 0 && (
          <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted">
            No users match this search.
          </p>
        )}

        {data && data.items.length > 0 && (
          <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
            {data.items.map((account) => {
              const isSelf = account.id === me?.id;
              return (
                <li key={account.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-text">
                      {account.email}
                      {isSelf && <span className="ml-2 text-xs text-muted">(you)</span>}
                    </p>
                    <p className="text-xs text-muted">
                      Joined {formatDate(account.createdAt)}
                      {account.role === 'ADMIN' && (
                        <span className="ml-2 rounded-full border border-border px-1.5 py-0.5 text-[11px] font-medium text-brand">
                          Admin
                        </span>
                      )}
                      {account.status === 'DISABLED' && (
                        <span className="ml-2 rounded-full border border-danger/40 bg-danger-surface px-1.5 py-0.5 text-[11px] font-medium text-danger">
                          Suspended
                        </span>
                      )}
                    </p>
                  </div>
                  {!isSelf && (
                    <Button size="sm" variant="secondary" onClick={() => setTarget(account)}>
                      {account.status === 'ACTIVE' ? 'Suspend' : 'Reactivate'}
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {data && (data.total > PAGE_SIZE || page > 1) && (
        <nav aria-label="Pagination" className="mt-4 flex items-center justify-between text-sm">
          <Button
            size="sm"
            variant="secondary"
            disabled={page <= 1 || loading}
            onClick={() => void load(page - 1, search)}
          >
            Previous
          </Button>
          <span className="text-muted">
            Page {data.page} of {Math.max(1, Math.ceil(data.total / data.pageSize))}
          </span>
          <Button
            size="sm"
            variant="secondary"
            disabled={!data.hasMore || loading}
            onClick={() => void load(page + 1, search)}
          >
            Next
          </Button>
        </nav>
      )}

      <ConfirmDialog
        open={target !== null}
        title={target?.status === 'ACTIVE' ? 'Suspend this account?' : 'Reactivate this account?'}
        description={
          target?.status === 'ACTIVE'
            ? `${target.email} will be signed out and blocked until reactivated. Their files and shares stay intact.`
            : `${target?.email} will be able to sign in again.`
        }
        confirmLabel={target?.status === 'ACTIVE' ? 'Suspend' : 'Reactivate'}
        loading={busy}
        onConfirm={() => void onToggleStatus()}
        onCancel={() => setTarget(null)}
      />
    </div>
  );
}
