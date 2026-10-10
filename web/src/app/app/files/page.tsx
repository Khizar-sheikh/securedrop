'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { apiFetch, ApiError } from '../../../lib/api';
import { uploadFile } from '../../../lib/files';
import { formatBytes, formatDate } from '../../../lib/format';
import type { FileItem, Paged } from '../../../lib/types';
import { Alert } from '../../../components/ui/alert';
import { Button } from '../../../components/ui/button';
import { ConfirmDialog } from '../../../components/ui/confirm-dialog';
import { EmptyState } from '../../../components/ui/empty-state';
import { Skeleton, Spinner } from '../../../components/ui/spinner';
import { ShareDialog } from '../../../components/app/share-dialog';

const PAGE_SIZE = 20;

export default function FilesPage() {
  const [data, setData] = useState<Paged<FileItem> | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState<{ name: string; fraction: number } | null>(null);
  const [shareTarget, setShareTarget] = useState<FileItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FileItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const load = useCallback(async (targetPage: number) => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiFetch<Paged<FileItem>>(`files?page=${targetPage}&pageSize=${PAGE_SIZE}`);
      setData(result);
      setPage(targetPage);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load your files.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => { void load(1); }, 0);
    return () => clearTimeout(timer);
  }, [load]);

  const onPickFiles = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    setUploading({ name: file.name, fraction: 0 });
    setNotice(null);
    try {
      await uploadFile(file, (fraction) => setUploading({ name: file.name, fraction }));
      setNotice(`Uploaded ${file.name}.`);
      await load(page);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The upload failed.');
    } finally {
      setUploading(null);
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  const onDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiFetch(`files/${deleteTarget.id}`, { method: 'DELETE' });
      setDeleteTarget(null);
      await load(page);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not delete the file.');
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text">Files</h1>
          <p className="mt-1 text-sm text-muted">Upload a file, then create a secure link.</p>
        </div>
        <div>
          <input
            ref={fileInput}
            type="file"
            className="sr-only"
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => void onPickFiles(e.target.files)}
            disabled={uploading !== null}
          />
          <Button
            onClick={() => fileInput.current?.click()}
            loading={uploading !== null}
            aria-describedby="upload-status"
          >
            Upload file
          </Button>
        </div>
      </div>

      <div id="upload-status" aria-live="polite" className="mt-3">
        {uploading && (
          <div className="rounded-md border border-border bg-surface px-4 py-3">
            <div className="flex items-center justify-between text-sm">
              <span className="truncate text-text">Uploading {uploading.name}</span>
              <span className="text-muted">{Math.round(uploading.fraction * 100)}%</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-variant">
              <div
                className="h-full rounded-full bg-brand transition-[width] duration-150"
                style={{ width: `${Math.round(uploading.fraction * 100)}%` }}
              />
            </div>
          </div>
        )}
        {notice && (
          <div className="mt-2">
            <Alert tone="success">{notice}</Alert>
          </div>
        )}
        {error && (
          <div className="mt-2">
            <Alert tone="error">
              {error}{' '}
              <button
                type="button"
                onClick={() => void load(page)}
                className="font-medium underline"
              >
                Retry
              </button>
            </Alert>
          </div>
        )}
      </div>

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
            title="No files yet"
            description="Upload your first file to create a secure link you can manage."
            action={
              <Button size="sm" onClick={() => fileInput.current?.click()}>
                Upload file
              </Button>
            }
          />
        )}

        {data && data.items.length > 0 && (
          <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
            {data.items.map((file) => (
              <li key={file.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <span
                  aria-hidden="true"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-surface-variant text-muted"
                >
                  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                    <path
                      d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinejoin="round"
                    />
                    <path d="M14 3v5h5" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                  </svg>
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-text">{file.filename}</p>
                  <p className="text-xs text-muted">
                    {formatBytes(file.sizeBytes)} · {formatDate(file.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="secondary" onClick={() => setShareTarget(file)}>
                    Create link
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setDeleteTarget(file)}>
                    Delete
                  </Button>
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

      {loading && data && (
        <p className="mt-3">
          <Spinner label="Refreshing…" />
        </p>
      )}

      {shareTarget && (
        <ShareDialog
          fileId={shareTarget.id}
          filename={shareTarget.filename}
          onClose={() => setShareTarget(null)}
          onCreated={() => {
            /* the dialog itself shows the one-time link */
          }}
        />
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete this file?"
        description={
          deleteTarget
            ? `"${deleteTarget.filename}" will be removed. Shares that point at it stop working.`
            : ''
        }
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={() => void onDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
