export interface PublicShare {
  id: string;
  fileId: string | null;
  noteId: string | null;
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
  token?: string;
}

export interface PublicShareListItem extends PublicShare {
  kind: 'file' | 'note';
  filename: string;
  sizeBytes: number;
  fileDeleted: boolean;
}

export interface CreateShareInput {
  fileId?: string;
  noteId?: string;
  expiresInSeconds?: number | null;
  maxAccesses?: number | null;
  allowDownload?: boolean;
  password?: string | null;
  strict?: boolean;
  oneTime?: boolean;
}

export type ShareStatus = 'active' | 'revoked' | 'expired' | 'consumed' | 'unavailable';

export interface ShareFile {
  filename: string;
  mimeType: string;
  sizeBytes: number;
  checksum: string;
}

export interface ShareRules {
  expiresAt: string | null;
  allowDownload: boolean;
  maxAccesses: number | null;
  accessCount: number;
  strict: boolean;
  oneTime: boolean;
  hasPassword: boolean;
}

/** Metadata-only preview returned before any access is consumed. */
export interface ShareInspection {
  file: ShareFile;
  note?: { id: string; title: string; tags: string[] };
  share: ShareRules;
  requiresPassword: boolean;
}

export interface OpenedShare {
  file: ShareFile;
  note?: { id: string; title: string; tags: string[]; content: string };
  share: ShareRules;
  session: { secret: string; expiresAt: string };
}

export const shareStatus = (share: PublicShare, fileDeleted = false): ShareStatus => {
  if (share.revokedAt) return 'revoked';
  if (share.consumedAt) return 'consumed';
  if (share.expiresAt && new Date(share.expiresAt).getTime() <= Date.now()) return 'expired';
  if (fileDeleted) return 'unavailable';
  return 'active';
};
