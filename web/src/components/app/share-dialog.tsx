'use client';

import { useState } from 'react';
import { apiFetch, ApiError } from '../../lib/api';
import type { CreatedShare } from '../../lib/types';
import { Alert } from '../ui/alert';
import { Button } from '../ui/button';
import { Label, PasswordInput } from '../ui/input';

const expiryOptions = [
  { label: '1 hour', seconds: 3600 },
  { label: '24 hours', seconds: 86_400 },
  { label: '7 days', seconds: 604_800 },
  { label: 'No expiry', seconds: null },
];

const shareUrl = (token: string): string =>
  `${window.location.origin}/share/${encodeURIComponent(token)}`;

/** Create-a-share flow: rules first, then the link (returned exactly once). */
export function ShareDialog({
  fileId,
  filename,
  onClose,
  onCreated,
}: {
  fileId: string;
  filename: string;
  onClose: () => void;
  onCreated: (share: CreatedShare) => void;
}) {
  const [expiresIn, setExpiresIn] = useState<number | null>(86_400);
  const [allowDownload, setAllowDownload] = useState(true);
  const [maxAccesses, setMaxAccesses] = useState('');
  const [password, setPassword] = useState('');
  const [oneTime, setOneTime] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<CreatedShare | null>(null);
  const [copied, setCopied] = useState(false);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const share = await apiFetch<CreatedShare>('shares', {
        method: 'POST',
        body: JSON.stringify({
          fileId,
          expiresInSeconds: expiresIn,
          allowDownload,
          maxAccesses: maxAccesses ? Number(maxAccesses) : undefined,
          password: password || undefined,
          oneTime,
        }),
        retryOn401: false,
      });
      setCreated(share);
      onCreated(share);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create the share.');
      setSubmitting(false);
    }
  };

  const copy = async () => {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(shareUrl(created.token));
      setCopied(true);
    } catch {
      setError('Could not copy automatically. Select the link and copy it.');
    }
  };

  if (created) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="share-created-title"
          className="w-full max-w-md rounded-lg border border-border bg-surface p-6"
        >
          <h2 id="share-created-title" className="text-lg font-semibold text-text">
            Share created
          </h2>
          <p className="mt-1 text-sm text-muted">
            This link is shown once. Copy it now. You can revoke it later from Shares.
          </p>
          <div className="mt-4 rounded-md border border-border bg-background px-3 py-2 text-sm break-all text-text">
            {shareUrl(created.token)}
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button onClick={() => void copy()} variant={copied ? 'secondary' : 'primary'}>
              {copied ? 'Copied' : 'Copy link'}
            </Button>
            <Button variant="ghost" onClick={onClose}>
              Done
            </Button>
          </div>
          {error && (
            <div className="mt-4">
              <Alert tone="error">{error}</Alert>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-dialog-title"
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg border border-border bg-surface p-6"
      >
        <h2 id="share-dialog-title" className="text-lg font-semibold text-text">
          Create a secure link
        </h2>
        <p className="mt-1 truncate text-sm text-muted">{filename}</p>

        <form onSubmit={onSubmit} className="mt-5 space-y-5">
          {error && <Alert tone="error">{error}</Alert>}

          <fieldset>
            <legend className="text-sm font-medium text-text">Expires after</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {expiryOptions.map((option) => (
                <label
                  key={option.label}
                  className={`cursor-pointer rounded-md border px-3 py-1.5 text-sm ${
                    expiresIn === option.seconds
                      ? 'border-brand bg-brand/10 text-text'
                      : 'border-border text-muted hover:text-text'
                  }`}
                >
                  <input
                    type="radio"
                    name="expiry"
                    className="sr-only"
                    checked={expiresIn === option.seconds}
                    onChange={() => setExpiresIn(option.seconds)}
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </fieldset>

          <label className="flex items-center justify-between rounded-md border border-border px-4 py-3">
            <span className="text-sm text-text">Allow downloads</span>
            <input
              type="checkbox"
              checked={allowDownload}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setAllowDownload(e.target.checked)
              }
              className="h-4 w-4 accent-[var(--color-brand)]"
            />
          </label>

          <div>
            <Label htmlFor="max-accesses">Access limit (optional)</Label>
            <input
              id="max-accesses"
              type="number"
              min={1}
              max={1000}
              value={maxAccesses}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMaxAccesses(e.target.value)}
              placeholder="Unlimited"
              className="mt-1.5 h-11 w-full rounded-md border border-border bg-surface px-3 text-sm text-text placeholder:text-muted"
            />
          </div>

          <div>
            <Label htmlFor="share-password">Password (optional)</Label>
            <div className="mt-1.5">
              <PasswordInput
                id="share-password"
                value={password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                placeholder="Leave empty for no password"
              />
            </div>
          </div>

          <label className="flex items-center justify-between rounded-md border border-border px-4 py-3">
            <span className="text-sm text-text">One-time link</span>
            <input
              type="checkbox"
              checked={oneTime}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOneTime(e.target.checked)}
              className="h-4 w-4 accent-[var(--color-brand)]"
            />
          </label>

          <div className="flex gap-3 pt-1">
            <Button type="submit" loading={submitting} className="flex-1">
              Create link
            </Button>
            <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
