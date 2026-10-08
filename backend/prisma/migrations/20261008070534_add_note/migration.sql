-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditEventType" ADD VALUE 'NOTE_CREATED';
ALTER TYPE "AuditEventType" ADD VALUE 'NOTE_DELETED';

-- DropForeignKey
ALTER TABLE "AuditEvent" DROP CONSTRAINT "AuditEvent_recipientSessionId_fkey";

-- AlterTable
ALTER TABLE "AuditEvent" ADD COLUMN     "noteId" TEXT;

-- AlterTable
ALTER TABLE "Share" ADD COLUMN     "noteId" TEXT,
ALTER COLUMN "fileId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "Note" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL DEFAULT '',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Note_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NoteFile" (
    "id" TEXT NOT NULL,
    "noteId" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NoteFile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Note_ownerId_updatedAt_idx" ON "Note"("ownerId", "updatedAt");

-- CreateIndex
CREATE INDEX "Note_ownerId_deletedAt_idx" ON "Note"("ownerId", "deletedAt");

-- CreateIndex
CREATE INDEX "Note_tags_idx" ON "Note" USING GIN ("tags");

-- CreateIndex
CREATE INDEX "NoteFile_fileId_idx" ON "NoteFile"("fileId");

-- CreateIndex
CREATE UNIQUE INDEX "NoteFile_noteId_fileId_key" ON "NoteFile"("noteId", "fileId");

-- CreateIndex
CREATE INDEX "AuditEvent_noteId_createdAt_idx" ON "AuditEvent"("noteId", "createdAt");

-- CreateIndex
CREATE INDEX "Share_noteId_idx" ON "Share"("noteId");

-- AddForeignKey
ALTER TABLE "Share" ADD CONSTRAINT "Share_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "Note"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NoteFile" ADD CONSTRAINT "NoteFile_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "Note"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NoteFile" ADD CONSTRAINT "NoteFile_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "File"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "Note"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_recipientSessionId_fkey" FOREIGN KEY ("recipientSessionId") REFERENCES "RecipientSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- A share must target exactly one resource: a file XOR a note.
ALTER TABLE "Share" ADD CONSTRAINT "Share_exactly_one_target"
  CHECK (
    ("fileId" IS NOT NULL AND "noteId" IS NULL)
    OR ("fileId" IS NULL AND "noteId" IS NOT NULL)
  );
