import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { checkArchiveExpansion } from '../src/security/archive-policy';

const CD_SIG = Buffer.from([0x50, 0x4b, 0x01, 0x02]);
const EOCD_SIG = Buffer.from([0x50, 0x4b, 0x05, 0x06]);

const buildZip = (entries: { name: string; uncompressed: number }[]): Buffer => {
  const local = Buffer.from('local-data-placeholder');
  const cdParts: Buffer[] = [];
  for (const entry of entries) {
    const header = Buffer.alloc(46);
    CD_SIG.copy(header, 0);
    header.writeUInt32LE(entry.uncompressed, 20);
    header.writeUInt32LE(entry.uncompressed, 24);
    const name = Buffer.from(entry.name, 'utf8');
    header.writeUInt16LE(name.length, 28);
    cdParts.push(Buffer.concat([header, name]));
  }
  const central = Buffer.concat(cdParts);
  const eocd = Buffer.alloc(22);
  EOCD_SIG.copy(eocd, 0);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(central.length, 12);
  eocd.writeUInt32LE(local.length, 16);
  return Buffer.concat([local, central, eocd]);
};

const buildTarHeader = (name: string, sizeBytes: number): Buffer => {
  const header = Buffer.alloc(512);
  header.write(name, 0, 'ascii');
  header.write(`${sizeBytes.toString(8).padStart(11, '0')}\0`, 124, 'ascii');
  return header;
};

describe('archive expansion policy', () => {
  let dir: string;

  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), 'sd-archive-'));
  });

  afterAll(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  const withFile = async (name: string, data: Buffer): Promise<string> => {
    const path = join(dir, name);
    await writeFile(path, data);
    return path;
  };

  it('accepts a zip whose uncompressed size is within the cap', async () => {
    const path = await withFile('small.zip', buildZip([{ name: 'a.txt', uncompressed: 100 }]));
    const result = await checkArchiveExpansion(path, 'application/zip', 1024);
    expect(result.ok).toBe(true);
  });

  it('rejects a zip bomb whose declared uncompressed size exceeds the cap', async () => {
    const path = await withFile(
      'bomb.zip',
      buildZip([{ name: 'a.txt', uncompressed: 500 * 1024 * 1024 }]),
    );
    const result = await checkArchiveExpansion(path, 'application/zip', 1024);
    expect(result.ok).toBe(false);
    expect(result.reason).toContain('expands beyond');
  });

  it('sums uncompressed sizes across zip entries', async () => {
    const path = await withFile(
      'multi.zip',
      buildZip([
        { name: 'a.txt', uncompressed: 600 },
        { name: 'b.txt', uncompressed: 600 },
      ]),
    );
    const result = await checkArchiveExpansion(path, 'application/zip', 1024);
    expect(result.ok).toBe(false);
  });

  it('refuses zip64 placeholder sizes it cannot verify', async () => {
    const path = await withFile(
      'zip64.zip',
      buildZip([{ name: 'a.txt', uncompressed: 0xffffffff }]),
    );
    const result = await checkArchiveExpansion(path, 'application/zip', 1024 * 1024);
    expect(result.ok).toBe(false);
    expect(result.reason).toContain('ZIP64');
  });

  it('rejects a zip without an end-of-central-directory record', async () => {
    const path = await withFile('garbage.zip', Buffer.from('not a zip at all'));
    const result = await checkArchiveExpansion(path, 'application/zip', 1024);
    expect(result.ok).toBe(false);
  });

  it('accepts a tar within the cap', async () => {
    const data = Buffer.concat([
      buildTarHeader('a.txt', 100),
      Buffer.alloc(512),
      Buffer.alloc(1024),
    ]);
    const path = await withFile('small.tar', data);
    const result = await checkArchiveExpansion(path, 'application/x-tar', 1024 * 1024);
    expect(result.ok).toBe(true);
  });

  it('rejects a tar whose header declares an oversized payload', async () => {
    const path = await withFile('bomb.tar', buildTarHeader('a.txt', 500 * 1024 * 1024));
    const result = await checkArchiveExpansion(path, 'application/x-tar', 1024);
    expect(result.ok).toBe(false);
    expect(result.reason).toContain('expands beyond');
  });

  it('passes non-archive types through untouched', async () => {
    const path = await withFile('p.txt', Buffer.from('plain text'));
    const result = await checkArchiveExpansion(path, 'text/plain', 1024);
    expect(result.ok).toBe(true);
  });
});
