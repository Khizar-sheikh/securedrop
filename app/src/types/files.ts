export interface PublicFile {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  checksum: string;
  createdAt: string;
  deletedAt: string | null;
}

export interface FileList {
  items: PublicFile[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
}
