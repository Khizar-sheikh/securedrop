'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch, ApiError } from '../../../lib/api';
import { formatDateTime } from '../../../lib/format';
import type { AdminAuditEvent, Paged } from '../../../lib/types';
import { Alert } from '../../../components/ui/alert';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Skeleton } from '../../../components/ui/spinner';

const PAGE_SIZE = 25;

const eventTypes = [
  'USER_REGISTERED',
  'USER_LOGIN',
  'LOGIN_FAILED',
  'LOGIN_RATE_LIMITED',
  'USER_LOGOUT',
  'FILE_UPLOADED',
  'FILE_DELETED',
  'SHARE_CREATED',
  'SHARE_OPENED',
  'SHARE_DOWNLOADED',
  'SHARE_REVOKED',
  'ACCESS_DENIED',
  'RECIPIENT_SESSION_CREATED',
  'SESSION_CHANGED',
  'NOTE_CREATED',
  'NOTE_DELETED',
  'USER_SUSPENDED',
  'USER_REACTIVATED',
  'SHARE_REVOKED_BY_ADMIN',
] as const;

export default function AdminAuditPage() {
  const [data, setData] = useState<Paged<AdminAuditEvent> | null>(null);
  const [page, setPage] = useState(1);
  const [type, setType] = useState('');
  const [queryInput, setQueryInput] = useState('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (targetPage: number, eventType: string, actorQuery: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(targetPage),
        pageSize: String(PAGE_SIZE),
      });
      if (eventType) params.set('type', eventType);
      if (actorQuery) params.set('query', actorQuery);
      setData(await apiFetch<Paged<AdminAuditEvent>>(`admin/audit?${params.toString()}`));
      setPage(targetPage);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load the audit trail.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => { void load(1, type, query); }, 0);
    return () => clearTimeout(timer);
  }, [load, type, query]);

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-text">Audit trail</h1>
      <p className="mt-1 text-sm text-muted">
        Authentication, share, and administrator events. Filtered server-side.
      </p>

      <div className="mt-5 flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="audit-type" className="block text-sm font-medium text-text">
            Event type
          </label>
          <select
            id="audit-type"
            value={type}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
              setType(e.target.value);
            }}
            className="mt-1.5 h-11 rounded-md border border-border bg-surface px-3 text-sm text-text"
          >
            <option value="">All events</option>
            {eventTypes.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>
        <form
          className="flex items-end gap-2"
          onSubmit={(event: React.FormEvent) => {
            event.preventDefault();
            setQuery(queryInput.trim());
          }}
        >
          <div>
            <label htmlFor="audit-actor" className="block text-sm font-medium text-text">
              Actor email
            </label>
            <Input
              id="audit-actor"
              type="search"
              value={queryInput}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQueryInput(e.target.value)}
              placeholder="search@example.com"
              className="mt-1.5 w-64"
            />
          </div>
          <Button type="submit" variant="secondary">
            Search
          </Button>
        </form>
      </div>

      {error && (
        <div className="mt-4">
          <Alert tone="error">
            {error}{' '}
            <button
              type="button"
              onClick={() => void load(page, type, query)}
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
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        )}

        {data && data.items.length === 0 && (
          <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted">
            No events match this filter.
          </p>
        )}

        {data && data.items.length > 0 && (
          <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
            {data.items.map((event) => (
              <li key={event.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-text">{event.type}</p>
                  <p className="truncate text-xs text-muted">
                    {event.actorEmail ?? 'system'} · {event.ip ?? 'no ip'} ·{' '}
                    {formatDateTime(event.createdAt)}
                  </p>
                </div>
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
            onClick={() => void load(page - 1, type, query)}
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
            onClick={() => void load(page + 1, type, query)}
          >
            Next
          </Button>
        </nav>
      )}
    </div>
  );
}
