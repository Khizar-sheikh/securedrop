import { createHash } from 'node:crypto';
import { HttpStatus, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app/app.module';
import { apiUrl, configureApp } from '../src/app/bootstrap';
import { PrismaService } from '../src/database/prisma.service';

describe('note shares', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  interface Account {
    token: string;
    userId: string;
  }

  interface ShareRecord {
    id: string;
    token: string;
    [key: string]: unknown;
  }

  const NOTE_CONTENT = '# Recipe\n\n- flour\n- water\n\n```js\nconsole.log("bake");\n```';

  const createAccount = async (prefix: string): Promise<Account> => {
    const email = `noteshare-${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}@example.com`;
    await request(app.getHttpServer())
      .post(apiUrl('auth/register'))
      .send({ email, password: 'strong-password-123' })
      .expect(HttpStatus.CREATED);
    const login = await request(app.getHttpServer())
      .post(apiUrl('auth/login'))
      .send({ email, password: 'strong-password-123' })
      .expect(HttpStatus.OK);
    return { token: login.body.data.accessToken, userId: login.body.data.user.id };
  };

  const createNote = async (account: Account, title = 'Shared Recipe', content = NOTE_CONTENT): Promise<{ id: string }> => {
    const res = await request(app.getHttpServer())
      .post(apiUrl('notes'))
      .set('Authorization', `Bearer ${account.token}`)
      .send({ title, content, tags: ['cooking'] })
      .expect(HttpStatus.CREATED);
    return res.body.data;
  };

  const createNoteShare = async (account: Account, noteId: string, body: Record<string, unknown> = {}): Promise<ShareRecord> => {
    const res = await request(app.getHttpServer())
      .post(apiUrl('shares'))
      .set('Authorization', `Bearer ${account.token}`)
      .send({ noteId, ...body })
      .expect(HttpStatus.CREATED);
    return res.body.data;
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = configureApp(moduleRef.createNestApplication());
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('requires exactly one of fileId or noteId', async () => {
    const account = await createAccount('xor');
    const note = await createNote(account);

    await request(app.getHttpServer())
      .post(apiUrl('shares'))
      .set('Authorization', `Bearer ${account.token}`)
      .send({})
      .expect(HttpStatus.BAD_REQUEST);

    await request(app.getHttpServer())
      .post(apiUrl('shares'))
      .set('Authorization', `Bearer ${account.token}`)
      .send({ noteId: note.id, fileId: note.id })
      .expect(HttpStatus.BAD_REQUEST);
  });

  it('rejects sharing a note the caller does not own or that is deleted', async () => {
    const owner = await createAccount('owner');
    const stranger = await createAccount('stranger');
    const note = await createNote(owner, 'Not yours');

    await request(app.getHttpServer())
      .post(apiUrl('shares'))
      .set('Authorization', `Bearer ${stranger.token}`)
      .send({ noteId: note.id })
      .expect(HttpStatus.NOT_FOUND);

    await request(app.getHttpServer())
      .delete(apiUrl(`notes/${note.id}`))
      .set('Authorization', `Bearer ${owner.token}`)
      .expect(HttpStatus.OK);

    await request(app.getHttpServer())
      .post(apiUrl('shares'))
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ noteId: note.id })
      .expect(HttpStatus.NOT_FOUND);
  });

  it('lists note shares with the note title as filename', async () => {
    const account = await createAccount('list');
    const note = await createNote(account, 'Listing Note');
    await createNoteShare(account, note.id);

    const res = await request(app.getHttpServer())
      .get(apiUrl('shares'))
      .set('Authorization', `Bearer ${account.token}`)
      .expect(HttpStatus.OK);

    const item = res.body.data.items.find(
      (entry: { id: string; noteId?: string | null; kind?: string; filename?: string }) => entry.noteId !== null,
    );
    expect(item).toBeDefined();
    expect(item.kind).toBe('note');
    expect(item.filename).toBe('Listing Note');
    expect(item.sizeBytes).toBe(Buffer.byteLength(NOTE_CONTENT, 'utf8'));
    expect(item.fileDeleted).toBe(false);
  });

  it('inspects a note share without exposing content', async () => {
    const account = await createAccount('inspect');
    const note = await createNote(account, 'Secret Note');
    const share = await createNoteShare(account, note.id);

    const res = await request(app.getHttpServer())
      .post(apiUrl('public/shares/open'))
      .send({ token: share.token, inspect: true })
      .expect(HttpStatus.OK);

    expect(res.body.data.note).toEqual({ id: note.id, title: 'Secret Note', tags: ['cooking'] });
    expect(res.body.data.note.content).toBeUndefined();
    expect(res.body.data.file.filename).toBe('Secret Note.md');
    expect(res.body.data.file.mimeType).toBe('text/markdown');
    expect(res.body.data.file.sizeBytes).toBe(Buffer.byteLength(NOTE_CONTENT, 'utf8'));
    expect(res.body.data.file.checksum).toBe(
      createHash('sha256').update(NOTE_CONTENT, 'utf8').digest('hex'),
    );
    expect(res.body.data.requiresPassword).toBe(false);
  });

  it('opens a note share with content and downloads it as markdown', async () => {
    const account = await createAccount('happy');
    const note = await createNote(account, 'Downloadable');
    const share = await createNoteShare(account, note.id);

    const opened = await request(app.getHttpServer())
      .post(apiUrl('public/shares/open'))
      .send({ token: share.token })
      .expect(HttpStatus.OK);
    expect(opened.body.data.note.content).toBe(NOTE_CONTENT);
    expect(opened.body.data.file.filename).toBe('Downloadable.md');
    const sessionSecret = opened.body.data.session.secret;

    const download = await request(app.getHttpServer())
      .post(apiUrl('public/shares/download'))
      .send({ token: share.token, sessionSecret })
      .expect(HttpStatus.OK);

    expect(download.headers['content-type']).toContain('text/markdown');
    expect(download.headers['content-disposition']).toContain('Downloadable.md');
    expect(download.text).toBe(NOTE_CONTENT);

    const refreshed = await prisma.share.findUnique({ where: { id: share.id } });
    expect(refreshed?.downloadCount).toBe(1);

    const feed = await request(app.getHttpServer())
      .get(apiUrl('audit'))
      .query({ limit: 100 })
      .set('Authorization', `Bearer ${account.token}`)
      .expect(HttpStatus.OK);
    const downloaded = feed.body.data.items.find((item: { type: string }) => item.type === 'SHARE_DOWNLOADED');
    expect(downloaded).toBeDefined();
    expect(downloaded.filename).toBe('Downloadable');
    const openedEvent = feed.body.data.items.find(
      (item: { type: string; filename: string | null }) => item.type === 'SHARE_OPENED' && item.filename === 'Downloadable',
    );
    expect(openedEvent).toBeDefined();
  });

  it('rejects expired note shares', async () => {
    const account = await createAccount('expired');
    const note = await createNote(account, 'Old news');
    const share = await createNoteShare(account, note.id);
    await prisma.share.update({ where: { id: share.id }, data: { expiresAt: new Date(Date.now() - 1000) } });

    await request(app.getHttpServer())
      .post(apiUrl('public/shares/open'))
      .send({ token: share.token, inspect: true })
      .expect(HttpStatus.GONE);
    await request(app.getHttpServer())
      .post(apiUrl('public/shares/open'))
      .send({ token: share.token })
      .expect(HttpStatus.GONE);
  });

  it('revocation cuts open, restore and download for note shares', async () => {
    const account = await createAccount('revoke');
    const note = await createNote(account, 'Revoked note');
    const share = await createNoteShare(account, note.id);

    const opened = await request(app.getHttpServer())
      .post(apiUrl('public/shares/open'))
      .send({ token: share.token })
      .expect(HttpStatus.OK);
    const sessionSecret = opened.body.data.session.secret;

    await request(app.getHttpServer())
      .delete(apiUrl(`shares/${share.id}`))
      .set('Authorization', `Bearer ${account.token}`)
      .expect(HttpStatus.OK);

    await request(app.getHttpServer())
      .post(apiUrl('public/shares/open'))
      .send({ token: share.token })
      .expect(HttpStatus.GONE);
    await request(app.getHttpServer())
      .post(apiUrl('public/shares/open'))
      .send({ token: share.token, sessionSecret })
      .expect(HttpStatus.GONE);
    await request(app.getHttpServer())
      .post(apiUrl('public/shares/download'))
      .send({ token: share.token, sessionSecret })
      .expect(HttpStatus.GONE);
  });

  it('enforces one-time note shares', async () => {
    const account = await createAccount('onetime');
    const note = await createNote(account, 'One time only');
    const share = await createNoteShare(account, note.id, { oneTime: true });

    await request(app.getHttpServer())
      .post(apiUrl('public/shares/open'))
      .send({ token: share.token })
      .expect(HttpStatus.OK);

    await request(app.getHttpServer())
      .post(apiUrl('public/shares/open'))
      .send({ token: share.token })
      .expect(HttpStatus.GONE);
    await request(app.getHttpServer())
      .post(apiUrl('public/shares/open'))
      .send({ token: share.token, inspect: true })
      .expect(HttpStatus.GONE);
  });

  it('honors allowDownload=false for note exports', async () => {
    const account = await createAccount('nodl');
    const note = await createNote(account, 'View only');
    const share = await createNoteShare(account, note.id, { allowDownload: false });

    const opened = await request(app.getHttpServer())
      .post(apiUrl('public/shares/open'))
      .send({ token: share.token })
      .expect(HttpStatus.OK);
    expect(opened.body.data.note.content).toBe(NOTE_CONTENT);

    await request(app.getHttpServer())
      .post(apiUrl('public/shares/download'))
      .send({ token: share.token, sessionSecret: opened.body.data.session.secret })
      .expect(HttpStatus.FORBIDDEN);
  });

  it('requires the share password for note shares', async () => {
    const account = await createAccount('password');
    const note = await createNote(account, 'Protected');
    const share = await createNoteShare(account, note.id, { password: 'correct horse' });

    await request(app.getHttpServer())
      .post(apiUrl('public/shares/open'))
      .send({ token: share.token })
      .expect(HttpStatus.FORBIDDEN);
    await request(app.getHttpServer())
      .post(apiUrl('public/shares/open'))
      .send({ token: share.token, password: 'wrong battery' })
      .expect(HttpStatus.FORBIDDEN);

    await request(app.getHttpServer())
      .post(apiUrl('public/shares/open'))
      .send({ token: share.token, password: 'correct horse' })
      .expect(HttpStatus.OK);
  });

  it('closing a note invalidates its open share links', async () => {
    const account = await createAccount('deleted-target');
    const note = await createNote(account, 'Gone soon');
    const share = await createNoteShare(account, note.id);

    await request(app.getHttpServer())
      .delete(apiUrl(`notes/${note.id}`))
      .set('Authorization', `Bearer ${account.token}`)
      .expect(HttpStatus.OK);

    await request(app.getHttpServer())
      .post(apiUrl('public/shares/open'))
      .send({ token: share.token, inspect: true })
      .expect(HttpStatus.NOT_FOUND);
    await request(app.getHttpServer())
      .post(apiUrl('public/shares/open'))
      .send({ token: share.token })
      .expect(HttpStatus.NOT_FOUND);
    await request(app.getHttpServer())
      .post(apiUrl('public/shares/download'))
      .send({ token: share.token, sessionSecret: 'irrelevant' })
      .expect(HttpStatus.NOT_FOUND);
  });
});
