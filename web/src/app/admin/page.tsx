'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch, ApiError } from '../../lib/api';
import type { AdminMetrics } from '../../lib/types';
import { Alert } from '../../components/ui/alert';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/spinner';

const metricsMeta: Array<{ key: 'users' | 'files' | 'activeShares' | 'recentEvents' | 'disabledUsers'; label: string }> = [
  { key: 'users', label: 'Registered users' },
  { key: 'files', label: 'Files stored' },
  { key: 'activeShares', label: 'Active shares' },
  { key: 'recentEvents', label: 'Events (24h)' },
  { key: 'disabledUsers', label: 'Disabled accounts' },
];

export default function AdminOverviewPage() {
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setMetrics(await apiFetch<AdminMetrics>('admin/metrics'));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load metrics.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-text">Overview</h1>
      <p className="mt-1 text-sm text-muted">Live counts from the backend. No estimates.</p>

      {error && (
        <div className="mt-4">
          <Alert tone="error">
            {error}{' '}
            <button type="button" onClick={() => void load()} className="font-medium underline">
              Retry
            </button>
          </Alert>
        </div>
      )}

      {loading && !metrics && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {metricsMeta.map((meta) => (
            <Skeleton key={meta.key} className="h-24" />
          ))}
        </div>
      )}

      {metrics && (
        <dl className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {metricsMeta.map((meta) => (
            <div key={meta.key} className="rounded-lg border border-border bg-surface p-5">
              <dt className="text-sm text-muted">{meta.label}</dt>
              <dd className="mt-2 text-3xl font-bold tracking-tight text-text">
                {metrics[meta.key]}
              </dd>
            </div>
          ))}
        </dl>
      )}

      {!loading && !error && metrics && (
        <p className="mt-6 text-sm text-muted">
          Sensitive actions are logged. Review them in the{' '}
          <a href="/admin/audit" className="font-medium text-brand hover:underline">
            audit trail
          </a>
          .
        </p>
      )}

      {!loading && !error && !metrics && (
        <div className="mt-6">
          <EmptyRetry onRetry={() => void load()} />
        </div>
      )}
    </div>
  );
}

function EmptyRetry({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="rounded-lg border border-dashed border-border p-8 text-center">
      <p className="text-sm text-muted">No metrics returned.</p>
      <Button size="sm" variant="secondary" className="mt-3" onClick={onRetry}>
        Retry
      </Button>
    </div>
  );
}
