import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { createHash, randomUUID } from 'node:crypto';
import request from 'supertest';
import { AppModule } from '../src/app/app.module';
import { configureApp, apiUrl } from '../src/app/bootstrap';
import { PrismaService } from '../src/database/prisma.service';
import { StorageService } from '../src/storage/storage.service';

describe('POST /files (upload)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let storage: StorageService;
  let token: string;
  let ownerId: string;
  const createdEmails: string[] = [];

  const uniqueEmail = () => {
    const email = `test-upload-${Date.now()}-${Math.floor(Math.random() * 100000)}@example.com`;
    createdEmails.push(email);
    return email;
  };

  const authenticate = async (): Promise<void> => {
    const email = uniqueEmail();
    await request(app.getHttpServer())
      .post(apiUrl('auth/register'))
      .send({ email, password: 'strong-password-123' })
      .expect(201);
    const login = await request(app.getHttpServer())
      .post(apiUrl('auth/login'))
      .send({ email, password: 'strong-password-123' })
      .expect(200);
    token = login.body.data.accessToken;
    ownerId = login.body.data.user.id;
  };

  beforeAll(async () => {
    // Tight limit so the "too large" case does not need a huge payload.
    process.env.UPLOAD_MAX_BYTES = '1024';
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = configureApp(moduleRef.createNestApplication());
    await app.init();
    prisma = app.get(PrismaService);
    storage = app.get(StorageService);
    await authenticate();
  });

  afterAll(async () => {
    delete process.env.UPLOAD_MAX_BYTES;
    await prisma.user.deleteMany({ where: { email: { in: createdEmails } } });
    await app.close();
  });

  it('stores a file and returns safe metadata only', async () => {
    const content = Buffer.from('hello secure world\n');
    const res = await request(app.getHttpServer())
      .post(apiUrl('files'))
      .set('Authorization', `Bearer ${token}`)
      .attach('file', content, { filename: 'notes.txt', contentType: 'text/plain' })
      .expect(201);

    const data = res.body.data;
    expect(data.filename).toBe('notes.txt');
    expect(data.mimeType).toBe('text/plain');
    expect(data.sizeBytes).toBe(content.length);
    expect(data.checksum).toBe(createHash('sha256').update(content).digest('hex'));
    expect(data.deletedAt).toBeNull();

    // Internal coordinates never leave the service.
    expect(JSON.stringify(res.body)).not.toContain('storageKey');
    expect(JSON.stringify(res.body)).not.toContain(ownerId);
    expect(JSON.stringify(res.body)).not.toContain(storage.getBucket());

    const record = await prisma.file.findUnique({ where: { id: data.id } });
    expect(record).not.toBeNull();
    expect(record?.ownerId).toBe(ownerId);
    expect(record?.storageKey).toBe(`${ownerId}/${data.id}`);

    const object = await storage.headObject(record!.storageKey);
    expect(object).not.toBeNull();
    expect(object?.sizeBytes).toBe(content.length);
  });

  it('never uses the user filename as the storage key', async () => {
    const res = await request(app.getHttpServer())
      .post(apiUrl('files'))
      .set('Authorization', `Bearer ${token}`)
      .attach('file', Buffer.from('payload'), {
        filename: '../../etc/passwd.txt',
        contentType: 'text/plain',
      })
      .expect(201);

    expect(res.body.data.filename).toBe('passwd.txt');

    const record = await prisma.file.findUnique({ where: { id: res.body.data.id } });
    expect(record?.storageKey).toBe(`${ownerId}/${record!.id}`);
    expect(record?.storageKey).not.toContain('passwd');
    expect(record?.storageKey).not.toContain('..');
  });

  it('requires authentication', async () => {
    const res = await request(app.getHttpServer())
      .post(apiUrl('files'))
      .attach('file', Buffer.from('nope'), { filename: 'notes.txt', contentType: 'text/plain' })
      .expect(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('rejects a disallowed MIME type', async () => {
    const res = await request(app.getHttpServer())
      .post(apiUrl('files'))
      .set('Authorization', `Bearer ${token}`)
      .attach('file', Buffer.from('MZ binary'), {
        filename: 'setup.exe',
        contentType: 'application/x-msdownload',
      })
      .expect(415);
    expect(res.body.error.code).toBe('FILE_TYPE_NOT_ALLOWED');
  });

  it('rejects a request without a file part', async () => {
    const res = await request(app.getHttpServer())
      .post(apiUrl('files'))
      .set('Authorization', `Bearer ${token}`)
      .field('note', 'nothing attached')
      .expect(400);
    expect(['VALIDATION_FAILED', 'BAD_REQUEST']).toContain(res.body.error.code);
  });

  it('rejects a file above the configured size limit', async () => {
    const res = await request(app.getHttpServer())
      .post(apiUrl('files'))
      .set('Authorization', `Bearer ${token}`)
      .attach('file', Buffer.alloc(4096, 'a'), {
        filename: 'big.txt',
        contentType: 'text/plain',
      })
      .expect(413);
    expect(res.body.error.code).toBe('FILE_TOO_LARGE');
  });

  it('records a FILE_UPLOADED audit event', async () => {
    const events = await prisma.auditEvent.count({
      where: { type: 'FILE_UPLOADED', actorUserId: ownerId },
    });
    expect(events).toBeGreaterThan(0);
  });

  it('generates a unique storage key per file', async () => {
    const first = await request(app.getHttpServer())
      .post(apiUrl('files'))
      .set('Authorization', `Bearer ${token}`)
      .attach('file', Buffer.from('one'), { filename: 'a.txt', contentType: 'text/plain' })
      .expect(201);
    const second = await request(app.getHttpServer())
      .post(apiUrl('files'))
      .set('Authorization', `Bearer ${token}`)
      .attach('file', Buffer.from('two'), { filename: 'a.txt', contentType: 'text/plain' })
      .expect(201);

    expect(first.body.data.id).not.toBe(second.body.data.id);
    expect(randomUUID()).not.toBe(first.body.data.id);
  });

  it('rejects markup smuggled in as text/plain', async () => {
    const res = await request(app.getHttpServer())
      .post(apiUrl('files'))
      .set('Authorization', `Bearer ${token}`)
      .attach('file', Buffer.from('<!DOCTYPE html><script>alert(1)</script>'), {
        filename: 'payload.txt',
        contentType: 'text/plain',
      })
      .expect(415);
    expect(res.body.error.code).toBe('FILE_TYPE_NOT_ALLOWED');
  });

  it('rejects an image whose bytes do not match the declared type', async () => {
    const res = await request(app.getHttpServer())
      .post(apiUrl('files'))
      .set('Authorization', `Bearer ${token}`)
      .attach('file', Buffer.from('definitely not a png'), {
        filename: 'fake.png',
        contentType: 'image/png',
      })
      .expect(415);
    expect(res.body.error.code).toBe('FILE_TYPE_NOT_ALLOWED');
  });

  it('accepts an image whose magic bytes match the declared type', async () => {
    const png = Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      Buffer.from('truncated-but-signature-correct'),
    ]);
    const res = await request(app.getHttpServer())
      .post(apiUrl('files'))
      .set('Authorization', `Bearer ${token}`)
      .attach('file', png, { filename: 'pixel.png', contentType: 'image/png' })
      .expect(201);
    expect(res.body.data.mimeType).toBe('image/png');
  });

  it('rejects a zip archive whose declared expansion exceeds the cap', async () => {
    // Crafted central directory claims a 2 GB payload in a ~70-byte file
    // (default UPLOAD_MAX_UNCOMPRESSED_BYTES is 1 GB).
    const cd = Buffer.alloc(46 + 5);
    Buffer.from([0x50, 0x4b, 0x01, 0x02]).copy(cd, 0);
    cd.writeUInt32LE(2 * 1024 * 1024 * 1024, 24);
    cd.writeUInt16LE(5, 28);
    cd.write('a.txt', 46, 'ascii');
    const local = Buffer.from('x');
    const eocd = Buffer.alloc(22);
    Buffer.from([0x50, 0x4b, 0x05, 0x06]).copy(eocd, 0);
    eocd.writeUInt16LE(1, 10);
    eocd.writeUInt32LE(cd.length, 12);
    eocd.writeUInt32LE(local.length, 16);
    const zip = Buffer.concat([local, cd, eocd]);

    const res = await request(app.getHttpServer())
      .post(apiUrl('files'))
      .set('Authorization', `Bearer ${token}`)
      .attach('file', zip, { filename: 'bomb.zip', contentType: 'application/zip' })
      .expect(413);
    expect(res.body.error.code).toBe('FILE_TOO_LARGE');
  });
});
