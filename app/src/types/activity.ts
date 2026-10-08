export interface ActivityItem {
  id: string;
  type: string;
  createdAt: string;
  filename: string | null;
  reason: string | null;
  ip: string | null;
}

const LABELS: Record<string, string> = {
  USER_REGISTERED: 'Account created',
  USER_LOGIN: 'Signed in',
  USER_LOGOUT: 'Signed out',
  LOGIN_FAILED: 'Failed sign-in attempt',
  LOGIN_RATE_LIMITED: 'Sign-in temporarily locked',
  FILE_UPLOADED: 'File uploaded',
  FILE_DELETED: 'File deleted',
  SHARE_CREATED: 'Share created',
  SHARE_OPENED: 'Share opened',
  SHARE_DOWNLOADED: 'File downloaded',
  SHARE_REVOKED: 'Share revoked',
  ACCESS_DENIED: 'Access denied',
  RECIPIENT_SESSION_CREATED: 'Link accessed',
  SESSION_CHANGED: 'Access environment changed',
  NOTE_CREATED: 'Note created',
  NOTE_DELETED: 'Note deleted',
};

/** Events worth highlighting: they signal something the owner should notice. */
const SIGNAL_TYPES = new Set(['ACCESS_DENIED', 'SESSION_CHANGED', 'LOGIN_FAILED', 'LOGIN_RATE_LIMITED']);

const REASON_LABELS: Record<string, string> = {
  ip_change: 'IP address changed',
  strict_environment_change: 'Access environment changed',
  revoked: 'The share was revoked',
  expired: 'The share had expired',
  session_invalid: 'The session was no longer valid',
  session_expired: 'The session had expired',
  download_not_allowed: 'Downloads are disabled for this share',
  file_deleted: 'The file was deleted',
  note_deleted: 'The note was deleted',
  malformed_token: 'The link was not valid',
  unknown_token: 'The link was not valid',
};

export const activityLabel = (type: string): string => LABELS[type] ?? 'Activity recorded';

export const activityReason = (reason: string | null): string | null =>
  reason ? (REASON_LABELS[reason] ?? null) : null;

export const isActivitySignal = (type: string): boolean => SIGNAL_TYPES.has(type);
