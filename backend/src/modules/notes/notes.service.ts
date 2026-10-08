import { HttpException, Injectable } from '@nestjs/common';
import type { Note } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { RequestContext } from '../../common/request-context';
import { fail } from '../../common/api-response';
import { ERROR_CODES } from '../../common/error-codes';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { ListNotesQuery } from './dto/list-notes.query';

const TITLE_MAX = 200;
const CONTENT_MAX = 200_000;

export interface NoteAttachment {
  id: string;
  fileId: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  addedAt: Date;
}

export interface PublicNoteSummary {
  id: string;
  title: string;
  tags: string[];
  contentBytes: number;
  attachmentCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface PublicNote extends PublicNoteSummary {
  content: string;
  files: NoteAttachment[];
}

/** Tags are trimmed, lowercased and deduplicated so filtering is stable. */
const normalizeTags = (tags: string[] | undefined): string[] => {
  const seen = new Set<string>();
  for (const raw of tags ?? []) {
    const tag = raw.trim().toLowerCase();
    if (tag.length > 0) seen.add(tag);
  }
  return [...seen];
};

const contentBytes = (content: string): number => Buffer.byteLength(content, 'utf8');

const summaryOf = (note: Note & { _count?: { files: number } }): PublicNoteSummary => ({
  id: note.id,
  title: note.title,
  tags: note.tags,
  contentBytes: contentBytes(note.content),
  attachmentCount: note._count?.files ?? 0,
  createdAt: note.createdAt,
  updatedAt: note.updatedAt,
});

@Injectable()
export class NotesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(ownerId: string, dto: CreateNoteDto, context: RequestContext): Promise<PublicNote> {
    const title = dto.title?.trim() ?? '';
    if (!title || title.length > TITLE_MAX || (dto.content?.length ?? 0) > CONTENT_MAX) {
      throw new HttpException(fail(ERROR_CODES.VALIDATION_FAILED), 400);
    }

    const note = await this.prisma.note.create({
      data: {
        ownerId,
        title,
        content: dto.content ?? '',
        tags: normalizeTags(dto.tags),
      },
      include: { _count: { select: { files: true } } },
    });

    await this.audit.record({
      type: 'NOTE_CREATED',
      actorUserId: ownerId,
      noteId: note.id,
      ip: context.ip,
      userAgent: context.userAgent,
      metadata: { tags: note.tags },
    });

    return { ...summaryOf(note), content: note.content, files: [] };
  }

  async list(ownerId: string, query: ListNotesQuery): Promise<{ items: PublicNoteSummary[]; hasMore: boolean }> {
    const where = {
      ownerId,
      deletedAt: null,
      ...(query.tag ? { tags: { has: query.tag.trim().toLowerCase() } } : {}),
    };
    const skip = (query.page - 1) * query.pageSize;

    const [notes, total] = await Promise.all([
      this.prisma.note.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip,
        take: query.pageSize,
        include: { _count: { select: { files: true } } },
      }),
      this.prisma.note.count({ where }),
    ]);

    return { items: notes.map(summaryOf), hasMore: total > skip + notes.length };
  }

  async getOne(ownerId: string, noteId: string): Promise<PublicNote> {
    const note = await this.findOwned(ownerId, noteId);
    const attachments = await this.prisma.noteFile.findMany({
      where: { noteId: note.id },
      orderBy: { addedAt: 'asc' },
      include: { file: { select: { originalFilename: true, mimeType: true, sizeBytes: true } } },
    });

    return {
      ...summaryOf(note),
      content: note.content,
      files: attachments.map((entry) => ({
        id: entry.id,
        fileId: entry.fileId,
        filename: entry.file.originalFilename,
        mimeType: entry.file.mimeType,
        sizeBytes: entry.file.sizeBytes,
        addedAt: entry.addedAt,
      })),
    };
  }

  async update(ownerId: string, noteId: string, dto: UpdateNoteDto): Promise<PublicNote> {
    const note = await this.findOwned(ownerId, noteId);

    if (dto.title !== undefined) {
      const title = dto.title.trim();
      if (!title || title.length > TITLE_MAX) {
        throw new HttpException(fail(ERROR_CODES.VALIDATION_FAILED), 400);
      }
    }
    if (dto.content !== undefined && dto.content.length > CONTENT_MAX) {
      throw new HttpException(fail(ERROR_CODES.VALIDATION_FAILED), 400);
    }

    const updated = await this.prisma.note.update({
      where: { id: note.id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
        ...(dto.content !== undefined ? { content: dto.content } : {}),
        ...(dto.tags !== undefined ? { tags: normalizeTags(dto.tags) } : {}),
      },
      include: { _count: { select: { files: true } } },
    });

    const attachments = await this.prisma.noteFile.findMany({
      where: { noteId: updated.id },
      orderBy: { addedAt: 'asc' },
      include: { file: { select: { originalFilename: true, mimeType: true, sizeBytes: true } } },
    });

    return {
      ...summaryOf(updated),
      content: updated.content,
      files: attachments.map((entry) => ({
        id: entry.id,
        fileId: entry.fileId,
        filename: entry.file.originalFilename,
        mimeType: entry.file.mimeType,
        sizeBytes: entry.file.sizeBytes,
        addedAt: entry.addedAt,
      })),
    };
  }

  /** Links one of the owner's active files to the note (idempotent). */
  async attach(ownerId: string, noteId: string, fileId: string): Promise<{ noteId: string; fileId: string; attached: boolean }> {
    const note = await this.findOwned(ownerId, noteId);

    const file = await this.prisma.file.findFirst({
      where: { id: fileId, ownerId, deletedAt: null },
      select: { id: true },
    });
    if (!file) {
      throw new HttpException(fail(ERROR_CODES.NOT_FOUND), 404);
    }

    const existing = await this.prisma.noteFile.findUnique({
      where: { noteId_fileId: { noteId: note.id, fileId: file.id } },
    });
    if (existing) {
      return { noteId: note.id, fileId: file.id, attached: true };
    }

    await this.prisma.noteFile.create({ data: { noteId: note.id, fileId: file.id } });
    return { noteId: note.id, fileId: file.id, attached: true };
  }

  /** Removes an attachment link; the file itself is untouched. */
  async detach(ownerId: string, noteId: string, fileId: string): Promise<{ noteId: string; fileId: string; detached: boolean }> {
    const note = await this.findOwned(ownerId, noteId);

    const link = await this.prisma.noteFile.findUnique({
      where: { noteId_fileId: { noteId: note.id, fileId } },
    });
    if (!link) {
      throw new HttpException(fail(ERROR_CODES.NOT_FOUND), 404);
    }

    await this.prisma.noteFile.delete({ where: { id: link.id } });
    return { noteId: note.id, fileId, detached: true };
  }

  /** Soft delete; every active share of the note is revoked in the same transaction. */
  async remove(ownerId: string, noteId: string, context: RequestContext): Promise<{ id: string; deleted: boolean }> {
    const note = await this.findOwned(ownerId, noteId);

    await this.prisma.$transaction([
      this.prisma.note.update({ where: { id: note.id }, data: { deletedAt: new Date() } }),
      this.prisma.share.updateMany({
        where: { noteId: note.id, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    await this.audit.record({
      type: 'NOTE_DELETED',
      actorUserId: ownerId,
      noteId: note.id,
      ip: context.ip,
      userAgent: context.userAgent,
      metadata: { title: note.title },
    });

    return { id: note.id, deleted: true };
  }

  private async findOwned(ownerId: string, noteId: string) {
    const note = await this.prisma.note.findFirst({
      where: { id: noteId, ownerId, deletedAt: null },
      include: { _count: { select: { files: true } } },
    });
    if (!note) {
      throw new HttpException(fail(ERROR_CODES.NOT_FOUND), 404);
    }
    return note;
  }
}
