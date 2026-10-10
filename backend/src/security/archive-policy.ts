/**
 * Archive expansion checks: reject archives whose declared uncompressed size
 * exceeds a ratio or absolute cap (zip-bomb mitigation without decompressing).
 *
 * Parsed without extraction:
 * - ZIP: End-of-Central-Directory + central directory entries (uncompressed
 *   sizes are declared per entry; Zip64 placeholder sizes are refused).
 * - TAR: 512-byte header blocks (octal size field).
 * - GZIP / 7z: no cheap header-only size total — skipped; downloads are never
 *   extracted server-side and are served as octet-stream attachments.
 */
import { open } from 'node:fs/promises';

const EOCD_SIGNATURE = Buffer.from([0x50, 0x4b, 0x05, 0x06]);
const CD_SIGNATURE = Buffer.from([0x50, 0x4b, 0x01, 0x02]);
const TAR_BLOCK = 512;
const MAX_EOCD_SEARCH = 65_557; // 22-byte record + 65535-byte comment
const MAX_ARCHIVE_ENTRIES = 100_000;

export interface ArchiveCheckResult {
  ok: boolean;
  reason?: string;
}

const reject = (reason: string): ArchiveCheckResult => ({ ok: false, reason });

const parseZip = async (filePath: string, maxUncompressedBytes: number): Promise<ArchiveCheckResult> => {
  const handle = await open(filePath, 'r');
  try {
    const { size } = await handle.stat();
    const tailLength = Math.min(size, MAX_EOCD_SEARCH);
    const tail = Buffer.alloc(tailLength);
    await handle.read(tail, 0, tailLength, size - tailLength);

    const eocdAt = tail.lastIndexOf(EOCD_SIGNATURE);
    if (eocdAt < 0 || eocdAt + 22 > tail.length) {
      return reject('ZIP archive is missing its end-of-central-directory record.');
    }
    const entryCount = tail.readUInt16LE(eocdAt + 10);
    const centralOffset = tail.readUInt32LE(eocdAt + 16);
    if (entryCount > MAX_ARCHIVE_ENTRIES) {
      return reject('ZIP archive declares too many entries to verify.');
    }

    let total = 0;
    const entryHeader = Buffer.alloc(46);
    let offset = centralOffset;
    for (let index = 0; index < entryCount; index += 1) {
      const { bytesRead } = await handle.read(entryHeader, 0, 46, offset);
      if (bytesRead < 46 || !entryHeader.subarray(0, 4).equals(CD_SIGNATURE)) {
        return reject('ZIP central directory is malformed.');
      }
      const uncompressed = entryHeader.readUInt32LE(24);
      if (uncompressed === 0xffffffff) {
        return reject('ZIP64 sizes cannot be verified safely.');
      }
      total += uncompressed;
      if (total > maxUncompressedBytes) {
        return reject('ZIP archive expands beyond the allowed uncompressed size.');
      }
      const nameLength = entryHeader.readUInt16LE(28);
      const extraLength = entryHeader.readUInt16LE(30);
      const commentLength = entryHeader.readUInt16LE(32);
      offset += 46 + nameLength + extraLength + commentLength;
    }
    return { ok: true };
  } finally {
    await handle.close();
  }
};

const parseTar = async (filePath: string, maxUncompressedBytes: number): Promise<ArchiveCheckResult> => {
  const handle = await open(filePath, 'r');
  try {
    let total = 0;
    let offset = 0;
    let entries = 0;
    const block = Buffer.alloc(TAR_BLOCK);

    for (;;) {
      const { bytesRead } = await handle.read(block, 0, TAR_BLOCK, offset);
      if (bytesRead < TAR_BLOCK) {
        return reject('TAR archive is truncated.');
      }
      if (block.every((byte) => byte === 0)) {
        return { ok: true }; // end-of-archive marker
      }

      const sizeField = block.subarray(124, 136);
      if ((sizeField[0] ?? 0) & 0x80) {
        return reject('TAR base-256 sizes cannot be verified safely.');
      }
      const sizeText = sizeField.toString('ascii').replace(/\0.*$/, '').trim();
      const size = sizeText ? Number.parseInt(sizeText, 8) : 0;
      if (!Number.isFinite(size) || size < 0) {
        return reject('TAR archive has a malformed size field.');
      }
      total += Math.ceil(size / TAR_BLOCK) * TAR_BLOCK;
      if (total > maxUncompressedBytes) {
        return reject('TAR archive expands beyond the allowed uncompressed size.');
      }

      entries += 1;
      if (entries > MAX_ARCHIVE_ENTRIES) {
        return reject('TAR archive declares too many entries to verify.');
      }
      offset += TAR_BLOCK + Math.ceil(size / TAR_BLOCK) * TAR_BLOCK;
    }
  } finally {
    await handle.close();
  }
};

const ARCHIVE_CHECKS: Record<string, (filePath: string, max: number) => Promise<ArchiveCheckResult>> = {
  'application/zip': parseZip,
  'application/x-tar': parseTar,
};

/** Header-only expansion check for zip/tar; other types pass through. */
export const checkArchiveExpansion = async (
  filePath: string,
  mimeType: string,
  maxUncompressedBytes: number,
): Promise<ArchiveCheckResult> => {
  const check = ARCHIVE_CHECKS[mimeType];
  if (!check) return { ok: true };
  return check(filePath, maxUncompressedBytes);
};
