import { Share } from '@prisma/client';

export interface PublicShare {
  id: string;
  fileId: string;
  expiresAt: Date | null;
  allowDownload: boolean;
  maxAccesses: number | null;
  accessCount: number;
  hasPassword: boolean;
  oneTime: boolean;
  strict: boolean;
  revokedAt: Date | null;
  consumedAt: Date | null;
  createdAt: Date;
  /** Raw link token — returned only in the response that creates the share. */
  token?: string;
}

/**
 * Shapes a share for the owner. Neither the stored token hash nor the
 * password hash ever leaves the service.
 */
export const toPublicShare = (share: Share, rawToken?: string): PublicShare => ({
  id: share.id,
  fileId: share.fileId,
  expiresAt: share.expiresAt,
  allowDownload: share.allowDownload,
  maxAccesses: share.maxAccesses,
  accessCount: share.accessCount,
  hasPassword: share.passwordHash !== null,
  oneTime: share.oneTime,
  strict: share.strict,
  revokedAt: share.revokedAt,
  consumedAt: share.consumedAt,
  createdAt: share.createdAt,
  ...(rawToken ? { token: rawToken } : {}),
});

export interface PublicShareListItem extends PublicShare {
  filename: string;
  sizeBytes: number;
  fileDeleted: boolean;
}

export const toPublicShareListItem = (
  share: Share & { file: { originalFilename: string; sizeBytes: number; deletedAt: Date | null } },
): PublicShareListItem => ({
  ...toPublicShare(share),
  filename: share.file.originalFilename,
  sizeBytes: share.file.sizeBytes,
  fileDeleted: share.file.deletedAt !== null,
});
