import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app/app.module';
import { configureApp, apiUrl } from '../src/app/bootstrap';
import { PrismaService } from '../src/database/prisma.service';
import { StorageService } from '../src/storage/storage.service';

describe('file management (list / details / delete)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let storage: StorageService;
  const createdEmails: string[] = [];

  interface Account {
    token: string;
    userId: string;
    email: string;
  }

  const uniqueEmail = () => {
    const email = `test-files-${Date.now()}-${Math.floor(Math.random() * 100000)}@example.com`;
    createdEmails.push(email);
    return email;
  };

  const createAccount = async (): Promise<Account> => {
    const email = uniqueEmail();
    await request(app.getHttpServer())
      .post(apiUrl('auth/register'))
      .send({ email, password: 'strong-password-123' })
      .expect(201);
    const login = await request(app.getHttpServer())
      .post(apiUrl('auth/login'))
      .send({ email, password: 'strong-password-123' })
      .expect(200);
    return { token: login.body.data.accessToken, userId: login.body.data.user.id, email };
  };

  const upload = async (account: Account, name: string, content: string) => {
    const res = await request(app.getHttpServer())
      .post(apiUrl('files'))
      .set('Authorization', `Bearer ${account.token}`)
      .attach('file', Buffer.from(content), { filename: name, contentType: 'text/plain' })
      .expect(201);
    return res.body.data;
  };

  let alice: Account;
  let bob: Account;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = configureApp(moduleRef.createNestApplication());
    await app.init();
    prisma = app.get(PrismaService);
    storage = app.get(StorageService);
    alice = await createAccount();
    bob = await createAccount();
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { in: createdEmails } } });
    await app.close();
  });

  it('lists only the caller files, newest first', async () => {
    await upload(alice, 'a.txt', 'first');
    await upload(alice, 'b.txt', 'second');
    await upload(bob, 'secret.txt', 'bobs file');

    const res = await request(app.getHttpServer())
      .get(apiUrl('files'))
      .set('Authorization', `Bearer ${alice.token}`)
      .expect(200);

    expect(res.body.data.total).toBe(2);
    expect(res.body.data.items).toHaveLength(2);
    expect(res.body.data.items.every((item: { filename: string }) => item.filename !== 'secret.txt')).toBe(true);
    expect(res.body.data.items[0].filename).toBe('b.txt');
    expect(JSON.stringify(res.body.data.items[0])).not.toContain('storageKey');
  });

  it('paginates with total and hasMore', async () => {
    const res = await request(app.getHttpServer())
      .get(apiUrl('files') + '?page=1&pageSize=2')
      .set('Authorization', `Bearer ${alice.token}`)
      .expect(200);

    expect(res.body.data.page).toBe(1);
    expect(res.body.data.pageSize).toBe(2);
    expect(res.body.data.items).toHaveLength(2);
    expect(res.body.data.hasMore).toBe(false);

    const invalid = await request(app.getHttpServer())
      .get(apiUrl('files') + '?page=0')
      .set('Authorization', `Bearer ${alice.token}`)
      .expect(400);
    expect(invalid.body.error.code).toBe('VALIDATION_FAILED');
  });

  it('returns file details to the owner only', async () => {
    const file = await upload(alice, 'mine.txt', 'content');

    const owner = await request(app.getHttpServer())
      .get(apiUrl(`files/${file.id}`))
      .set('Authorization', `Bearer ${alice.token}`)
      .expect(200);
    expect(owner.body.data.id).toBe(file.id);

    const other = await request(app.getHttpServer())
      .get(apiUrl(`files/${file.id}`))
      .set('Authorization', `Bearer ${bob.token}`)
      .expect(404);
    expect(other.body.error.code).toBe('NOT_FOUND');

    await request(app.getHttpServer())
      .get(apiUrl('files/11111111-1111-1111-1111-111111111111'))
      .set('Authorization', `Bearer ${alice.token}`)
      .expect(404);
  });

  it('requires authentication for listing', async () => {
    const res = await request(app.getHttpServer()).get(apiUrl('files')).expect(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('deletes a file: soft delete, revoked shares, removed object, audit', async () => {
    const file = await upload(alice, 'doomed.txt', 'delete me');
    const record = await prisma.file.findUnique({ where: { id: file.id } });
    const share = await prisma.share.create({
      data: {
        fileId: file.id,
        ownerId: alice.userId,
        tokenHash: 'a'.repeat(64),
      },
    });

    const res = await request(app.getHttpServer())
      .delete(apiUrl(`files/${file.id}`))
      .set('Authorization', `Bearer ${alice.token}`)
      .expect(200);
    expect(res.body.data).toEqual({ id: file.id, deleted: true });

    const after = await prisma.file.findUnique({ where: { id: file.id } });
    expect(after?.deletedAt).not.toBeNull();

    const shareAfter = await prisma.share.findUnique({ where: { id: share.id } });
    expect(shareAfter?.revokedAt).not.toBeNull();

    const object = await storage.headObject(record!.storageKey);
    expect(object).toBeNull();

    const list = await request(app.getHttpServer())
      .get(apiUrl('files'))
      .set('Authorization', `Bearer ${alice.token}`)
      .expect(200);
    expect(list.body.data.items.some((item: { id: string }) => item.id === file.id)).toBe(false);

    await request(app.getHttpServer())
      .get(apiUrl(`files/${file.id}`))
      .set('Authorization', `Bearer ${alice.token}`)
      .expect(404);

    const audits = await prisma.auditEvent.count({
      where: { type: 'FILE_DELETED', fileId: file.id, actorUserId: alice.userId },
    });
    expect(audits).toBe(1);
  });

  it('does not let another user delete a file', async () => {
    const file = await upload(alice, 'protected.txt', 'still here');

    await request(app.getHttpServer())
      .delete(apiUrl(`files/${file.id}`))
      .set('Authorization', `Bearer ${bob.token}`)
      .expect(404);

    const record = await prisma.file.findUnique({ where: { id: file.id } });
    expect(record?.deletedAt).toBeNull();

    const object = await storage.headObject(record!.storageKey);
    expect(object).not.toBeNull();
  });
});
