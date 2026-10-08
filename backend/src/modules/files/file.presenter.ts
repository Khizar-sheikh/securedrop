import { File } from '@prisma/client';

export interface PublicFile {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  checksum: string;
  createdAt: Date;
  deletedAt: Date | null;
}

/**
 * Shapes a file for API responses. `storageKey` is internal and never leaves
 * the service — clients get ids, not storage coordinates.
 */
export const toPublicFile = (file: File): PublicFile => ({
  id: file.id,
  filename: file.originalFilename,
  mimeType: file.mimeType,
  sizeBytes: file.sizeBytes,
  checksum: file.checksum,
  createdAt: file.createdAt,
  deletedAt: file.deletedAt,
});
