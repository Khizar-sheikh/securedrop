'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch, ApiError } from '../../../lib/api';
import { formatExpiry } from '../../../lib/format';
import type { Paged, ShareItem } from '../../../lib/types';
import { Alert } from '../../../components/ui/alert';
import { Button } from '../../../components/ui/button';
import { ConfirmDialog } from '../../../components/ui/confirm-dialog';
import { EmptyState } from '../../../components/ui/empty-state';
import { Skeleton } from '../../../components/ui/spinner';
import { StatusPill, computeShareStatus } from '../../../components/ui/status-pill';

const PAGE_SIZE = 20;

export default function SharesPage() {
  const [data, setData] = useState<Paged<ShareItem> | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<ShareItem | null>(null);
  const [revoking, setRevoking] = useState(false);

  const load = useCallback(async (targetPage: number) => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiFetch<Paged<ShareItem>>(
        `shares?page=${targetPage}&pageSize=${PAGE_SIZE}`,
      );
      setData(result);
      setPage(targetPage);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load your shares.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => { void load(1); }, 0);
    return () => clearTimeout(timer);
  }, [load]);

  const onRevoke = async () => {
    if (!revokeTarget) return;
    setRevoking(true);
    try {
      await apiFetch(`shares/${revokeTarget.id}`, { method: 'DELETE' });
      setRevokeTarget(null);
      await load(page);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not revoke the share.');
      setRevokeTarget(null);
    } finally {
      setRevoking(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-text">Shares</h1>
      <p className="mt-1 text-sm text-muted">
        Every link you have created, with its current status. Revoking takes effect immediately.
      </p>

      {error && (
        <div className="mt-4">
          <Alert tone="error">
            {error}{' '}
            <button type="button" onClick={() => void load(page)} className="font-medium underline">
              Retry
            </button>
          </Alert>
        </div>
      )}

      <div className="mt-6">
        {loading && !data && (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        )}

        {!loading && data && data.items.length === 0 && (
          <EmptyState
            title="No shares yet"
            description="Create a secure link from the Files tab. It will show up here."
          />
        )}

        {data && data.items.length > 0 && (
          <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
            {data.items.map((share) => {
              const status = computeShareStatus(share);
              return (
                <li key={share.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-medium text-text">{share.filename}</p>
                      <StatusPill status={status} />
                      {share.hasPassword && (
                        <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted">
                          Password
                        </span>
                      )}
                      {share.oneTime && (
                        <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted">
                          One-time
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-muted">
                      {formatExpiry(share.expiresAt)} · {share.accessCount}
                      {share.maxAccesses !== null ? ` of ${share.maxAccesses}` : ''} opens ·
                      downloads {share.allowDownload ? 'allowed' : 'blocked'}
                    </p>
                  </div>
                  {status !== 'REVOKED' && (
                    <Button size="sm" variant="secondary" onClick={() => setRevokeTarget(share)}>
                      Revoke
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
            onClick={() => void load(page - 1)}
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
            onClick={() => void load(page + 1)}
          >
            Next
          </Button>
        </nav>
      )}

      <ConfirmDialog
        open={revokeTarget !== null}
        title="Revoke this share?"
        description={
          revokeTarget
            ? `The link for "${revokeTarget.filename}" stops working immediately, including for anyone who already has it open.`
            : ''
        }
        confirmLabel="Revoke link"
        loading={revoking}
        onConfirm={() => void onRevoke()}
        onCancel={() => setRevokeTarget(null)}
      />
    </div>
  );
}
