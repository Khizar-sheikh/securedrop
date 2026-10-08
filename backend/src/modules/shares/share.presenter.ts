import { Share } from '@prisma/client';

export interface PublicShare {
  id: string;
  fileId: string | null;
  noteId: string | null;
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
  noteId: share.noteId,
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
  kind: 'file' | 'note';
  filename: string;
  sizeBytes: number;
  fileDeleted: boolean;
}

export const toPublicShareListItem = (
  share: Share & {
    file: { originalFilename: string; sizeBytes: number; deletedAt: Date | null } | null;
    note: { title: string; content: string; deletedAt: Date | null } | null;
  },
): PublicShareListItem => ({
  ...toPublicShare(share),
  kind: share.noteId !== null ? 'note' : 'file',
  filename: share.note?.title ?? share.file?.originalFilename ?? '',
  sizeBytes:
    share.note !== null && share.note !== undefined
      ? Buffer.byteLength(share.note.content, 'utf8')
      : (share.file?.sizeBytes ?? 0),
  fileDeleted:
    share.noteId !== null
      ? share.note === null || share.note.deletedAt !== null
      : share.file === null || share.file.deletedAt !== null,
});
