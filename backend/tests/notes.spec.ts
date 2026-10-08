import { HttpStatus, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app/app.module';
import { apiUrl, configureApp } from '../src/app/bootstrap';
import { PrismaService } from '../src/database/prisma.service';

describe('notes', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  interface Account {
    token: string;
    userId: string;
  }

  const createAccount = async (prefix: string): Promise<Account> => {
    const email = `notes-${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}@example.com`;
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

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = configureApp(moduleRef.createNestApplication());
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('requires authentication', async () => {
    await request(app.getHttpServer()).get(apiUrl('notes')).expect(HttpStatus.UNAUTHORIZED);
    await request(app.getHttpServer())
      .post(apiUrl('notes'))
      .send({ title: 'nope' })
      .expect(HttpStatus.UNAUTHORIZED);
  });

  it('creates a note: trims the title, normalizes and deduplicates tags', async () => {
    const account = await createAccount('create');
    const res = await request(app.getHttpServer())
      .post(apiUrl('notes'))
      .set('Authorization', `Bearer ${account.token}`)
      .send({ title: '  My Note  ', content: '# Hello', tags: ['Work', ' work ', 'personal'] })
      .expect(HttpStatus.CREATED);

    expect(res.body.data.title).toBe('My Note');
    expect(res.body.data.content).toBe('# Hello');
    expect(res.body.data.tags).toEqual(['work', 'personal']);
    expect(res.body.data.contentBytes).toBe(Buffer.byteLength('# Hello', 'utf8'));
    expect(res.body.data.attachmentCount).toBe(0);
    expect(res.body.data.files).toEqual([]);
  });

  it('validates note input', async () => {
    const account = await createAccount('validation');

    await request(app.getHttpServer())
      .post(apiUrl('notes'))
      .set('Authorization', `Bearer ${account.token}`)
      .send({ content: 'no title' })
      .expect(HttpStatus.BAD_REQUEST);

    await request(app.getHttpServer())
      .post(apiUrl('notes'))
      .set('Authorization', `Bearer ${account.token}`)
      .send({ title: '   ' })
      .expect(HttpStatus.BAD_REQUEST);

    await request(app.getHttpServer())
      .post(apiUrl('notes'))
      .set('Authorization', `Bearer ${account.token}`)
      .send({ title: 'tags', tags: Array.from({ length: 21 }, (_, index) => `t${index}`) })
      .expect(HttpStatus.BAD_REQUEST);

    await request(app.getHttpServer())
      .post(apiUrl('notes'))
      .set('Authorization', `Bearer ${account.token}`)
      .send({ title: 'tags', tags: ['x'.repeat(31)] })
      .expect(HttpStatus.BAD_REQUEST);
  });

  it('lists notes with pagination and hasMore', async () => {
    const account = await createAccount('list');
    for (const title of ['one', 'two', 'three']) {
      await request(app.getHttpServer())
        .post(apiUrl('notes'))
        .set('Authorization', `Bearer ${account.token}`)
        .send({ title })
        .expect(HttpStatus.CREATED);
    }

    const firstPage = await request(app.getHttpServer())
      .get(apiUrl('notes'))
      .query({ page: 1, pageSize: 2 })
      .set('Authorization', `Bearer ${account.token}`)
      .expect(HttpStatus.OK);
    expect(firstPage.body.data.items).toHaveLength(2);
    expect(firstPage.body.data.hasMore).toBe(true);

    const secondPage = await request(app.getHttpServer())
      .get(apiUrl('notes'))
      .query({ page: 2, pageSize: 2 })
      .set('Authorization', `Bearer ${account.token}`)
      .expect(HttpStatus.OK);
    expect(secondPage.body.data.items).toHaveLength(1);
    expect(secondPage.body.data.hasMore).toBe(false);
  });

  it('filters by tag', async () => {
    const account = await createAccount('tag');
    await request(app.getHttpServer())
      .post(apiUrl('notes'))
      .set('Authorization', `Bearer ${account.token}`)
      .send({ title: 'tagged', tags: ['Ideas'] })
      .expect(HttpStatus.CREATED);
    await request(app.getHttpServer())
      .post(apiUrl('notes'))
      .set('Authorization', `Bearer ${account.token}`)
      .send({ title: 'untagged' })
      .expect(HttpStatus.CREATED);

    const res = await request(app.getHttpServer())
      .get(apiUrl('notes'))
      .query({ tag: 'ideas' })
      .set('Authorization', `Bearer ${account.token}`)
      .expect(HttpStatus.OK);

    expect(res.body.data.items).toHaveLength(1);
    expect(res.body.data.items[0].title).toBe('tagged');
    expect(res.body.data.hasMore).toBe(false);
  });

  it('returns full note detail to the owner only', async () => {
    const owner = await createAccount('owner');
    const stranger = await createAccount('stranger');
    const created = await request(app.getHttpServer())
      .post(apiUrl('notes'))
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ title: 'Private note', content: 'secret body' })
      .expect(HttpStatus.CREATED);
    const noteId = created.body.data.id;

    const detail = await request(app.getHttpServer())
      .get(apiUrl(`notes/${noteId}`))
      .set('Authorization', `Bearer ${owner.token}`)
      .expect(HttpStatus.OK);
    expect(detail.body.data.content).toBe('secret body');

    await request(app.getHttpServer())
      .get(apiUrl(`notes/${noteId}`))
      .set('Authorization', `Bearer ${stranger.token}`)
      .expect(HttpStatus.NOT_FOUND);
    await request(app.getHttpServer())
      .patch(apiUrl(`notes/${noteId}`))
      .set('Authorization', `Bearer ${stranger.token}`)
      .send({ title: 'stolen' })
      .expect(HttpStatus.NOT_FOUND);
    await request(app.getHttpServer())
      .delete(apiUrl(`notes/${noteId}`))
      .set('Authorization', `Bearer ${stranger.token}`)
      .expect(HttpStatus.NOT_FOUND);
  });

  it('updates only the provided fields and rejects a blank title', async () => {
    const account = await createAccount('update');
    const created = await request(app.getHttpServer())
      .post(apiUrl('notes'))
      .set('Authorization', `Bearer ${account.token}`)
      .send({ title: 'Before', content: 'keep me', tags: ['old'] })
      .expect(HttpStatus.CREATED);
    const noteId = created.body.data.id;

    const updated = await request(app.getHttpServer())
      .patch(apiUrl(`notes/${noteId}`))
      .set('Authorization', `Bearer ${account.token}`)
      .send({ title: 'After', tags: ['NEW'] })
      .expect(HttpStatus.OK);
    expect(updated.body.data.title).toBe('After');
    expect(updated.body.data.content).toBe('keep me');
    expect(updated.body.data.tags).toEqual(['new']);

    await request(app.getHttpServer())
      .patch(apiUrl(`notes/${noteId}`))
      .set('Authorization', `Bearer ${account.token}`)
      .send({ title: '  ' })
      .expect(HttpStatus.BAD_REQUEST);
  });

  it('soft-deletes a note, hides it, and revokes its shares', async () => {
    const account = await createAccount('delete');
    const created = await request(app.getHttpServer())
      .post(apiUrl('notes'))
      .set('Authorization', `Bearer ${account.token}`)
      .send({ title: 'Doomed' })
      .expect(HttpStatus.CREATED);
    const noteId = created.body.data.id;

    const share = await prisma.share.create({
      data: { noteId, ownerId: account.userId, tokenHash: `note-share-${Date.now()}` },
    });

    const removed = await request(app.getHttpServer())
      .delete(apiUrl(`notes/${noteId}`))
      .set('Authorization', `Bearer ${account.token}`)
      .expect(HttpStatus.OK);
    expect(removed.body.data).toEqual({ id: noteId, deleted: true });

    await request(app.getHttpServer())
      .get(apiUrl(`notes/${noteId}`))
      .set('Authorization', `Bearer ${account.token}`)
      .expect(HttpStatus.NOT_FOUND);

    const list = await request(app.getHttpServer())
      .get(apiUrl('notes'))
      .set('Authorization', `Bearer ${account.token}`)
      .expect(HttpStatus.OK);
    expect(list.body.data.items.map((item: { id: string }) => item.id)).not.toContain(noteId);

    const revokedShare = await prisma.share.findUnique({ where: { id: share.id } });
    expect(revokedShare?.revokedAt).not.toBeNull();

    const keptNote = await prisma.note.findUnique({ where: { id: noteId } });
    expect(keptNote?.deletedAt).not.toBeNull();
  });

  const uploadFile = async (account: Account, name = 'attach.txt'): Promise<{ id: string }> => {
    const res = await request(app.getHttpServer())
      .post(apiUrl('files'))
      .set('Authorization', `Bearer ${account.token}`)
      .attach('file', Buffer.from('attachment content'), { filename: name, contentType: 'text/plain' })
      .expect(HttpStatus.CREATED);
    return res.body.data;
  };

  it('attaches and detaches files owned by the same user', async () => {
    const account = await createAccount('attach');
    const file = await uploadFile(account);
    const created = await request(app.getHttpServer())
      .post(apiUrl('notes'))
      .set('Authorization', `Bearer ${account.token}`)
      .send({ title: 'With files' })
      .expect(HttpStatus.CREATED);
    const noteId = created.body.data.id;

    const attached = await request(app.getHttpServer())
      .post(apiUrl(`notes/${noteId}/files`))
      .set('Authorization', `Bearer ${account.token}`)
      .send({ fileId: file.id })
      .expect(HttpStatus.CREATED);
    expect(attached.body.data).toEqual({ noteId, fileId: file.id, attached: true });

    const detail = await request(app.getHttpServer())
      .get(apiUrl(`notes/${noteId}`))
      .set('Authorization', `Bearer ${account.token}`)
      .expect(HttpStatus.OK);
    expect(detail.body.data.files).toHaveLength(1);
    expect(detail.body.data.files[0].filename).toBe('attach.txt');
    expect(detail.body.data.attachmentCount).toBe(1);

    const again = await request(app.getHttpServer())
      .post(apiUrl(`notes/${noteId}/files`))
      .set('Authorization', `Bearer ${account.token}`)
      .send({ fileId: file.id })
      .expect(HttpStatus.CREATED);
    expect(again.body.data.attached).toBe(true);

    const detailAfter = await request(app.getHttpServer())
      .get(apiUrl(`notes/${noteId}`))
      .set('Authorization', `Bearer ${account.token}`)
      .expect(HttpStatus.OK);
    expect(detailAfter.body.data.files).toHaveLength(1);

    const detached = await request(app.getHttpServer())
      .delete(apiUrl(`notes/${noteId}/files/${file.id}`))
      .set('Authorization', `Bearer ${account.token}`)
      .expect(HttpStatus.OK);
    expect(detached.body.data.detached).toBe(true);

    const empty = await request(app.getHttpServer())
      .get(apiUrl(`notes/${noteId}`))
      .set('Authorization', `Bearer ${account.token}`)
      .expect(HttpStatus.OK);
    expect(empty.body.data.files).toHaveLength(0);

    await request(app.getHttpServer())
      .delete(apiUrl(`notes/${noteId}/files/${file.id}`))
      .set('Authorization', `Bearer ${account.token}`)
      .expect(HttpStatus.NOT_FOUND);
  });

  it('rejects attaching files the caller does not own or that are deleted', async () => {
    const owner = await createAccount('attach-owner');
    const stranger = await createAccount('attach-stranger');
    const strangerFile = await uploadFile(stranger, 'stranger.txt');
    const ownFile = await uploadFile(owner, 'own.txt');

    const created = await request(app.getHttpServer())
      .post(apiUrl('notes'))
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ title: 'Mine' })
      .expect(HttpStatus.CREATED);
    const noteId = created.body.data.id;

    await request(app.getHttpServer())
      .post(apiUrl(`notes/${noteId}/files`))
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ fileId: strangerFile.id })
      .expect(HttpStatus.NOT_FOUND);

    await request(app.getHttpServer())
      .post(apiUrl(`notes/${noteId}/files`))
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ fileId: '00000000-0000-4000-8000-000000000000' })
      .expect(HttpStatus.NOT_FOUND);

    await request(app.getHttpServer())
      .delete(apiUrl(`files/${ownFile.id}`))
      .set('Authorization', `Bearer ${owner.token}`)
      .expect(HttpStatus.OK);

    await request(app.getHttpServer())
      .post(apiUrl(`notes/${noteId}/files`))
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ fileId: ownFile.id })
      .expect(HttpStatus.NOT_FOUND);

    await request(app.getHttpServer())
      .post(apiUrl(`notes/${noteId}/files`))
      .set('Authorization', `Bearer ${stranger.token}`)
      .send({ fileId: strangerFile.id })
      .expect(HttpStatus.NOT_FOUND);
  });

  it('audits note creation and deletion in the activity feed', async () => {
    const account = await createAccount('audit');
    const created = await request(app.getHttpServer())
      .post(apiUrl('notes'))
      .set('Authorization', `Bearer ${account.token}`)
      .send({ title: 'Audited note' })
      .expect(HttpStatus.CREATED);

    const feed = await request(app.getHttpServer())
      .get(apiUrl('audit'))
      .query({ limit: 100 })
      .set('Authorization', `Bearer ${account.token}`)
      .expect(HttpStatus.OK);

    const createdEvent = feed.body.data.items.find(
      (item: { type: string; filename: string | null }) =>
        item.type === 'NOTE_CREATED' && item.filename === 'Audited note',
    );
    expect(createdEvent).toBeDefined();

    await request(app.getHttpServer())
      .delete(apiUrl(`notes/${created.body.data.id}`))
      .set('Authorization', `Bearer ${account.token}`)
      .expect(HttpStatus.OK);

    const afterDelete = await request(app.getHttpServer())
      .get(apiUrl('audit'))
      .query({ limit: 100 })
      .set('Authorization', `Bearer ${account.token}`)
      .expect(HttpStatus.OK);
    const deletedEvent = afterDelete.body.data.items.find((item: { type: string }) => item.type === 'NOTE_DELETED');
    expect(deletedEvent).toBeDefined();
  });
});
