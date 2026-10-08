export interface PublicShare {
  id: string;
  fileId: string;
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
  filename: string;
  sizeBytes: number;
  fileDeleted: boolean;
}

export interface CreateShareInput {
  fileId: string;
  expiresInSeconds?: number | null;
  maxAccesses?: number | null;
  allowDownload?: boolean;
  password?: string | null;
  strict?: boolean;
  oneTime?: boolean;
}

export type ShareStatus = 'active' | 'revoked' | 'expired' | 'consumed' | 'unavailable';

export const shareStatus = (share: PublicShare, fileDeleted = false): ShareStatus => {
  if (share.revokedAt) return 'revoked';
  if (share.consumedAt) return 'consumed';
  if (share.expiresAt && new Date(share.expiresAt).getTime() <= Date.now()) return 'expired';
  if (fileDeleted) return 'unavailable';
  return 'active';
};
