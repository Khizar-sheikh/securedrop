'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ApiError, apiFetch, downloadShareFile } from '../../lib/api';
import { formatBytes, formatExpiry } from '../../lib/format';
import type { AdminShareStatus, OpenedShare, ShareInspection } from '../../lib/types';
import { Wordmark } from '../site/wordmark';
import { Alert } from '../ui/alert';
import { Button } from '../ui/button';
import { Label, PasswordInput } from '../ui/input';
import { Spinner } from '../ui/spinner';
import { StatusPill } from '../ui/status-pill';

const sessionKey = (token: string): string => `sd-share-session:${token}`;

const readCachedSession = (token: string): string | null => {
  try {
    const raw = sessionStorage.getItem(sessionKey(token));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { secret: string; expiresAt: string };
    if (new Date(parsed.expiresAt).getTime() <= Date.now()) return null;
    return parsed.secret;
  } catch {
    return null;
  }
};

const cacheSession = (token: string, session: OpenedShare['session']): void => {
  try {
    sessionStorage.setItem(sessionKey(token), JSON.stringify(session));
  } catch {
    // storage unavailable — session simply won't be reused
  }
};

const clearCachedSession = (token: string): void => {
  try {
    sessionStorage.removeItem(sessionKey(token));
  } catch {
    // ignore
  }
};

const errorStatus = (code: string): AdminShareStatus | null => {
  if (code === 'SHARE_REVOKED') return 'REVOKED';
  if (code === 'SHARE_EXPIRED') return 'EXPIRED';
  if (code === 'SHARE_CONSUMED') return 'CONSUMED';
  return null;
};

type OpenOutcome =
  | { kind: 'opened'; data: OpenedShare }
  | { kind: 'inspection'; data: ShareInspection }
  | { kind: 'error'; code: string; message: string };

export function ShareView({ token }: { token: string }) {
  const [phase, setPhase] = useState<'loading' | 'password' | 'ready' | 'error'>('loading');
  const [inspection, setInspection] = useState<ShareInspection | null>(null);
  const [opened, setOpened] = useState<OpenedShare | null>(null);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [error, setError] = useState<{ code: string; message: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [now] = useState(() => Date.now());

  const requestOpen = useCallback(
    async (params: {
      password?: string;
      sessionSecret?: string;
      inspect?: boolean;
    }): Promise<OpenOutcome> => {
      try {
        const result = await apiFetch<OpenedShare | ShareInspection>('public/shares/open', {
          method: 'POST',
          body: JSON.stringify({ token, ...params }),
          retryOn401: false,
          skipAuth: true,
        });
        return 'session' in result
          ? { kind: 'opened', data: result }
          : { kind: 'inspection', data: result };
      } catch (err) {
        if (err instanceof ApiError) {
          return { kind: 'error', code: err.code, message: err.message };
        }
        return {
          kind: 'error',
          code: 'NETWORK',
          message: 'Could not reach the server. Try again shortly.',
        };
      }
    },
    [token],
  );

  const applyOutcome = useCallback((outcome: OpenOutcome): void => {
    if (outcome.kind === 'opened') {
      setOpened(outcome.data);
      setInspection(null);
      cacheSession(token, outcome.data.session);
      setPhase('ready');
      return;
    }
    if (outcome.kind === 'inspection') {
      setInspection(outcome.data);
      setOpened(null);
      if (outcome.data.requiresPassword) {
        setPhase('password');
      } else {
        setPhase('ready');
      }
      return;
    }
    if (outcome.code === 'SHARE_PASSWORD_REQUIRED' || outcome.code === 'SHARE_PASSWORD_INVALID') {
      setPasswordError(
        outcome.code === 'SHARE_PASSWORD_REQUIRED'
          ? 'This link requires a password.'
          : 'Incorrect password. Try again.',
      );
      setPhase('password');
      return;
    }
    setError({ code: outcome.code, message: outcome.message });
    setPhase('error');
  }, [token]);

  /** Restores a cached recipient session, inspects, then opens for real. */
  const bootstrap = useCallback(async (): Promise<void> => {
    setBusy(true);
    setPasswordError(null);

    const cached = readCachedSession(token);
    if (cached) {
      const restored = await requestOpen({ sessionSecret: cached });
      if (restored.kind === 'opened') {
        applyOutcome(restored);
        setBusy(false);
        return;
      }
      if (
        restored.kind === 'error' &&
        (restored.code === 'RECIPIENT_SESSION_INVALID' ||
          restored.code === 'RECIPIENT_SESSION_EXPIRED')
      ) {
        clearCachedSession(token);
      } else if (restored.kind !== 'error') {
        applyOutcome(restored);
        setBusy(false);
        return;
      }
    }

    const inspected = await requestOpen({ inspect: true });
    if (inspected.kind === 'error') {
      applyOutcome(inspected);
      setBusy(false);
      return;
    }
    if (inspected.kind === 'inspection' && inspected.data.requiresPassword) {
      applyOutcome(inspected);
      setBusy(false);
      return;
    }

    // No password needed — perform a real open to obtain a recipient session.
    const openedResult = await requestOpen({});
    applyOutcome(openedResult);
    setBusy(false);
  }, [applyOutcome, requestOpen, token]);

  const submitPassword = useCallback(
    async (value: string): Promise<void> => {
      setBusy(true);
      setPasswordError(null);
      const outcome = await requestOpen({ password: value });
      applyOutcome(outcome);
      setBusy(false);
    },
    [applyOutcome, requestOpen],
  );

  useEffect(() => {
    const timer = setTimeout(() => void bootstrap(), 0);
    return () => clearTimeout(timer);
  }, [bootstrap]);

  const onDownload = async () => {
    if (!opened) return;
    setDownloading(true);
    setDownloadError(null);
    try {
      const { blob, filename } = await downloadShareFile(token, opened.session.secret);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'The download failed.';
      setDownloadError(message);
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        clearCachedSession(token);
      }
    } finally {
      setDownloading(false);
    }
  };

  const details = opened ?? inspection;
  const status: AdminShareStatus =
    details?.share.expiresAt && new Date(details.share.expiresAt).getTime() <= now
      ? 'EXPIRED'
      : 'ACTIVE';

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex w-full max-w-2xl items-center px-6 py-4">
          <Link href="/" aria-label="SecureDrop home" className="rounded-md">
            <Wordmark />
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
        {phase === 'loading' && (
          <div className="flex justify-center py-16">
            <Spinner label="Opening the secure link…" />
          </div>
        )}

        {phase === 'error' && error && (
          <div className="rounded-lg border border-border bg-surface p-8 text-center">
            {errorStatus(error.code) && (
              <div className="mb-4 flex justify-center">
                <StatusPill status={errorStatus(error.code)!} />
              </div>
            )}
            <h1 className="text-xl font-semibold text-text">
              {error.code === 'SHARE_INVALID'
                ? 'This link is not valid'
                : error.code === 'SHARE_EXPIRED'
                  ? 'This link has expired'
                  : error.code === 'SHARE_REVOKED'
                    ? 'This link was revoked'
                    : error.code === 'SHARE_CONSUMED' || error.code === 'SHARE_ACCESS_LIMIT_REACHED'
                      ? 'This link is no longer available'
                      : 'This link cannot be opened'}
            </h1>
            <p className="mt-2 text-sm text-muted">{error.message}</p>
          </div>
        )}

        {phase === 'password' && inspection && (
          <div className="rounded-lg border border-border bg-surface p-8">
            <h1 className="text-xl font-semibold text-text">Password required</h1>
            <p className="mt-2 text-sm text-muted">
              Enter the password the sender shared with you to open{' '}
              <span className="font-medium text-text">
                {inspection.file?.filename ?? inspection.note?.title ?? 'this item'}
              </span>
              .
            </p>
            <form
              className="mt-6 space-y-4"
              onSubmit={(event: React.FormEvent) => {
                event.preventDefault();
                void submitPassword(password);
              }}
            >
              <div>
                <Label htmlFor="share-password">Password</Label>
                <div className="mt-1.5">
                  <PasswordInput
                    id="share-password"
                    value={password}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setPassword(e.target.value)
                    }
                    invalid={Boolean(passwordError)}
                    autoComplete="off"
                    required
                  />
                </div>
                {passwordError && (
                  <p role="alert" className="mt-1.5 text-sm text-danger">
                    {passwordError}
                  </p>
                )}
              </div>
              <Button type="submit" loading={busy} className="w-full">
                Open link
              </Button>
            </form>
          </div>
        )}

        {phase === 'ready' && opened && (
          <div className="rounded-lg border border-border bg-surface p-8">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold break-all text-text">
                {opened.file?.filename ?? opened.note?.title ?? 'Shared item'}
              </h1>
              <StatusPill status={status} />
            </div>

            <dl className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-md border border-border bg-background px-4 py-3">
                <dt className="text-xs text-muted">Size</dt>
                <dd className="mt-0.5 text-sm font-medium text-text">
                  {opened.file ? formatBytes(opened.file.sizeBytes) : 'Not a file'}
                </dd>
              </div>
              <div className="rounded-md border border-border bg-background px-4 py-3">
                <dt className="text-xs text-muted">Expires</dt>
                <dd className="mt-0.5 text-sm font-medium text-text">
                  {formatExpiry(opened.share.expiresAt)}
                </dd>
              </div>
              <div className="rounded-md border border-border bg-background px-4 py-3">
                <dt className="text-xs text-muted">Downloads</dt>
                <dd className="mt-0.5 text-sm font-medium text-text">
                  {opened.share.allowDownload ? 'Allowed' : 'Blocked by the sender'}
                </dd>
              </div>
              <div className="rounded-md border border-border bg-background px-4 py-3">
                <dt className="text-xs text-muted">Opens used</dt>
                <dd className="mt-0.5 text-sm font-medium text-text">
                  {opened.share.accessCount}
                  {opened.share.maxAccesses !== null ? ` of ${opened.share.maxAccesses}` : ''}
                </dd>
              </div>
            </dl>

            {opened.note && (
              <div className="mt-6">
                <h2 className="text-sm font-semibold text-text">Note</h2>
                <pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap rounded-md border border-border bg-background p-4 text-sm text-text">
                  {opened.note.content}
                </pre>
              </div>
            )}

            {downloadError && (
              <div className="mt-6">
                <Alert tone="error">{downloadError}</Alert>
              </div>
            )}

            <div className="mt-8">
              {opened.share.allowDownload && opened.file ? (
                <Button
                  size="lg"
                  className="w-full"
                  loading={downloading}
                  onClick={() => void onDownload()}
                >
                  Download file
                </Button>
              ) : (
                <p className="rounded-md border border-border bg-background px-4 py-3 text-center text-sm text-muted">
                  The sender has disabled downloads for this link.
                </p>
              )}
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-border">
        <p className="mx-auto w-full max-w-2xl px-6 py-4 text-xs text-muted">
          Powered by SecureDrop. Links are checked on the server every time.
        </p>
      </footer>
    </div>
  );
}
