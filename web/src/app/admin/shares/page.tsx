'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch, ApiError } from '../../../lib/api';
import { formatDateTime, formatExpiry } from '../../../lib/format';
import type { AdminShare, AdminShareStatus, Paged } from '../../../lib/types';
import { Alert } from '../../../components/ui/alert';
import { Button } from '../../../components/ui/button';
import { ConfirmDialog } from '../../../components/ui/confirm-dialog';
import { Skeleton } from '../../../components/ui/spinner';
import { StatusPill } from '../../../components/ui/status-pill';

const PAGE_SIZE = 20;

const statusFilters: Array<{ value: '' | AdminShareStatus; label: string }> = [
  { value: '', label: 'All' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'EXPIRED', label: 'Expired' },
  { value: 'REVOKED', label: 'Revoked' },
  { value: 'CONSUMED', label: 'Used' },
];

export default function AdminSharesPage() {
  const [data, setData] = useState<Paged<AdminShare> | null>(null);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<'' | AdminShareStatus>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [target, setTarget] = useState<AdminShare | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (targetPage: number, filter: '' | AdminShareStatus) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(targetPage),
        pageSize: String(PAGE_SIZE),
      });
      if (filter) params.set('status', filter);
      setData(await apiFetch<Paged<AdminShare>>(`admin/shares?${params.toString()}`));
      setPage(targetPage);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load shares.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => { void load(1, status); }, 0);
    return () => clearTimeout(timer);
  }, [load, status]);

  const onRevoke = async () => {
    if (!target) return;
    setBusy(true);
    try {
      await apiFetch(`admin/shares/${target.id}`, { method: 'DELETE' });
      setTarget(null);
      await load(page, status);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not revoke the share.');
      setTarget(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-text">Shares</h1>
      <p className="mt-1 text-sm text-muted">
        Metadata only: content, link tokens, and passwords are never exposed here.
      </p>

      <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="Filter by status">
        {statusFilters.map((filter) => (
          <button
            key={filter.value || 'all'}
            type="button"
            aria-pressed={status === filter.value}
            onClick={() => setStatus(filter.value)}
            className={`rounded-md border px-3 py-1.5 text-sm ${
              status === filter.value
                ? 'border-brand bg-brand/10 text-text'
                : 'border-border text-muted hover:text-text'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="mt-4">
          <Alert tone="error">
            {error}{' '}
            <button
              type="button"
              onClick={() => void load(page, status)}
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
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        )}

        {data && data.items.length === 0 && (
          <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted">
            No shares match this filter.
          </p>
        )}

        {data && data.items.length > 0 && (
          <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
            {data.items.map((share) => (
              <li key={share.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-medium text-text">
                      {share.label ?? `(${share.kind})`}
                    </p>
                    <StatusPill status={share.status} />
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted">
                    {share.ownerEmail} · created {formatDateTime(share.createdAt)} ·{' '}
                    {formatExpiry(share.expiresAt)} · {share.accessCount}
                    {share.maxAccesses !== null ? ` of ${share.maxAccesses}` : ''} opens ·{' '}
                    {share.downloadCount} downloads
                  </p>
                </div>
                {share.status === 'ACTIVE' && (
                  <Button size="sm" variant="secondary" onClick={() => setTarget(share)}>
                    Revoke
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {data && (data.total > PAGE_SIZE || page > 1) && (
        <nav aria-label="Pagination" className="mt-4 flex items-center justify-between text-sm">
          <Button
            size="sm"
            variant="secondary"
            disabled={page <= 1 || loading}
            onClick={() => void load(page - 1, status)}
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
            onClick={() => void load(page + 1, status)}
          >
            Next
          </Button>
        </nav>
      )}

      <ConfirmDialog
        open={target !== null}
        title="Revoke this share?"
        description={
          target
            ? `The link owned by ${target.ownerEmail} stops working immediately, including active recipient sessions.`
            : ''
        }
        confirmLabel="Revoke link"
        loading={busy}
        onConfirm={() => void onRevoke()}
        onCancel={() => setTarget(null)}
      />
    </div>
  );
}
