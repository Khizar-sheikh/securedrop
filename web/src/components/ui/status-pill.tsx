import type { AdminShareStatus } from '../../lib/types';

export type ShareStatus = AdminShareStatus | 'ACTIVE_UNLIMITED';

const styles: Record<AdminShareStatus, { dot: string; text: string; label: string }> = {
  ACTIVE: { dot: 'bg-success', text: 'text-success', label: 'Active' },
  EXPIRED: { dot: 'bg-warning', text: 'text-warning', label: 'Expired' },
  REVOKED: { dot: 'bg-danger', text: 'text-danger', label: 'Revoked' },
  CONSUMED: { dot: 'bg-muted', text: 'text-muted', label: 'Used' },
};

export const shareStatusLabel = (status: AdminShareStatus): string => styles[status].label;

/** Status pill: color plus a text label, so state is never color-only. */
export function StatusPill({ status }: { status: AdminShareStatus }) {
  const style = styles[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-0.5 text-xs font-medium ${style.text}`}
    >
      <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
      {style.label}
    </span>
  );
}

/** Derives display status from a share the same way the backend does. */
export function computeShareStatus(share: {
  revokedAt: string | null;
  consumedAt: string | null;
  expiresAt: string | null;
}): AdminShareStatus {
  if (share.revokedAt) return 'REVOKED';
  if (share.consumedAt) return 'CONSUMED';
  if (share.expiresAt && new Date(share.expiresAt).getTime() <= Date.now()) return 'EXPIRED';
  return 'ACTIVE';
}
