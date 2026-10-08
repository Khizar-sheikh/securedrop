export interface NoteAttachment {
  id: string;
  fileId: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  addedAt: string;
}

export interface NoteSummary {
  id: string;
  title: string;
  tags: string[];
  contentBytes: number;
  attachmentCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Note extends NoteSummary {
  content: string;
  files: NoteAttachment[];
}

export interface CreateNoteInput {
  title: string;
  content?: string;
  tags?: string[];
}

export interface UpdateNoteInput {
  title?: string;
  content?: string;
  tags?: string[];
}
