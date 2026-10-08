export const formatBytes = (bytes: number): string => {
  if (!Number.isFinite(bytes) || bytes < 0) return '—';
  if (bytes < 1024) return `${bytes} B`;

  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = bytes;
  let unitIndex = -1;
  do {
    value /= 1024;
    unitIndex += 1;
  } while (value >= 1024 && unitIndex < units.length - 1);

  return `${value >= 10 ? Math.round(value) : Math.round(value * 10) / 10} ${units[unitIndex]}`;
};

const pad = (value: number): string => String(value).padStart(2, '0');

export const formatDate = (value: string | Date): string => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

/** Human-readable remaining time for a share expiry (recipient-facing). */
export const formatRelativeExpiry = (expiresAt: string | null): string => {
  if (!expiresAt) return 'No expiry';
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (Number.isNaN(ms)) return 'No expiry';
  if (ms <= 0) return 'Expired';

  const minutes = Math.ceil(ms / 60_000);
  if (minutes < 60) return `Expires in ${minutes} minute${minutes === 1 ? '' : 's'}`;

  const hours = Math.ceil(minutes / 60);
  if (hours < 48) return `Expires in ${hours} hour${hours === 1 ? '' : 's'}`;

  const days = Math.ceil(hours / 24);
  return `Expires in ${days} day${days === 1 ? '' : 's'}`;
};

/** Activity-feed timestamp: date + clock time in the device timezone. */
export const formatActivityTime = (value: string | Date): string => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return `${formatDate(date)} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};
