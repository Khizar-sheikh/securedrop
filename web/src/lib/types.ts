/** Shared API types mirroring the backend presenters (backend is the source of truth). */

export interface User {
  id: string;
  email: string;
  status: string;
  role: string;
  createdAt: string;
}

export interface FileItem {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  checksum: string;
  createdAt: string;
  deletedAt: string | null;
}

export interface ShareItem {
  id: string;
  fileId: string | null;
  noteId: string | null;
  kind: 'file' | 'note';
  filename: string;
  sizeBytes: number;
  fileDeleted: boolean;
  expiresAt: string | null;
  allowDownload: boolean;
  maxAccesses: number | null;
  accessCount: number;
  hasPassword: boolean;
  oneTime: boolean;
  strict: boolean;
  revokedAt: string | null;
  consumedAt: string | null;
  createdAt: string;
}

export interface CreatedShare extends Omit<ShareItem, 'kind' | 'filename' | 'sizeBytes' | 'fileDeleted'> {
  token: string;
}

export interface Paged<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
}

export interface ShareInspection {
  file: { filename: string; mimeType: string; sizeBytes: number; checksum: string } | null;
  note?: { id: string; title: string; tags: string[] };
  share: {
    expiresAt: string | null;
    allowDownload: boolean;
    maxAccesses: number | null;
    accessCount: number;
    strict: boolean;
    oneTime: boolean;
    hasPassword: boolean;
  };
  requiresPassword: boolean;
}

export interface OpenedShare {
  file: { filename: string; mimeType: string; sizeBytes: number; checksum: string } | null;
  note?: { id: string; title: string; tags: string[]; content: string };
  share: ShareInspection['share'];
  session: { secret: string; expiresAt: string };
}

export interface AdminMetrics {
  users: number;
  disabledUsers: number;
  files: number;
  activeShares: number;
  recentEvents: number;
}

export interface AdminUser {
  id: string;
  email: string;
  status: string;
  role: string;
  createdAt: string;
}

export type AdminShareStatus = 'ACTIVE' | 'REVOKED' | 'EXPIRED' | 'CONSUMED';

export interface AdminShare {
  id: string;
  kind: 'file' | 'note';
  label: string | null;
  ownerEmail: string;
  status: AdminShareStatus;
  expiresAt: string | null;
  maxAccesses: number | null;
  accessCount: number;
  downloadCount: number;
  allowDownload: boolean;
  hasPassword: boolean;
  oneTime: boolean;
  createdAt: string;
}

export interface AdminAuditEvent {
  id: string;
  type: string;
  actorEmail: string | null;
  ip: string | null;
  metadata: unknown;
  createdAt: string;
}

export interface SessionResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  refreshExpiresIn: number;
}
