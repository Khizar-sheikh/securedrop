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
