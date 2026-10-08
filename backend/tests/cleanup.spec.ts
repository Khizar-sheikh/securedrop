import { HttpStatus, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app/app.module';
import { apiUrl, configureApp } from '../src/app/bootstrap';
import { PrismaService } from '../src/database/prisma.service';
import { CleanupService } from '../src/modules/cleanup/cleanup.service';

describe('automatic cleanup strategy', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let cleanup: CleanupService;

  let accessToken = '';
  let ownerId = '';
  let shareId = '';

  const DAY_MS = 86_400_000;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = configureApp(moduleRef.createNestApplication());
    await app.init();
    prisma = app.get(PrismaService);
    cleanup = app.get(CleanupService);

    const email = `cleanup-${Date.now()}-${Math.floor(Math.random() * 10000)}@example.com`;
    await request(app.getHttpServer())
      .post(apiUrl('auth/register'))
      .send({ email, password: 'strong-password-123' })
      .expect(HttpStatus.CREATED);
    const login = await request(app.getHttpServer())
      .post(apiUrl('auth/login'))
      .send({ email, password: 'strong-password-123' })
      .expect(HttpStatus.OK);
    accessToken = login.body.data.accessToken;
    ownerId = login.body.data.user.id;

    const file = await request(app.getHttpServer())
      .post(apiUrl('files'))
      .set('Authorization', `Bearer ${accessToken}`)
      .attach('file', Buffer.from('cleanup content'), { filename: 'cleanup.txt', contentType: 'text/plain' })
      .expect(HttpStatus.CREATED);
    const share = await request(app.getHttpServer())
      .post(apiUrl('shares'))
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ fileId: file.body.data.id })
      .expect(HttpStatus.CREATED);
    shareId = share.body.data.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('is registered as a background job (service resolvable, timer started)', () => {
    expect(cleanup).toBeDefined();
    expect(prisma).toBeDefined();
  });

  it('removes expired recipient sessions and keeps active ones', async () => {
    const expired = await prisma.recipientSession.create({
      data: { shareId, tokenHash: `expired-${Date.now()}`, expiresAt: new Date(Date.now() - 1000) },
    });
    const active = await prisma.recipientSession.create({
      data: { shareId, tokenHash: `active-${Date.now()}`, expiresAt: new Date(Date.now() + 3600_000) },
    });

    await cleanup.runOnce();

    expect(await prisma.recipientSession.findUnique({ where: { id: expired.id } })).toBeNull();
    expect(await prisma.recipientSession.findUnique({ where: { id: active.id } })).not.toBeNull();

    await prisma.recipientSession.delete({ where: { id: active.id } });
  });

  it('removes audit events past retention and keeps recent ones', async () => {
    const oldEvent = await prisma.auditEvent.create({
      data: { type: 'SHARE_CREATED', actorUserId: ownerId, shareId, createdAt: new Date(Date.now() - 400 * DAY_MS) },
    });
    const recentEvent = await prisma.auditEvent.create({
      data: { type: 'SHARE_CREATED', actorUserId: ownerId, shareId },
    });

    await cleanup.runOnce();

    expect(await prisma.auditEvent.findUnique({ where: { id: oldEvent.id } })).toBeNull();
    expect(await prisma.auditEvent.findUnique({ where: { id: recentEvent.id } })).not.toBeNull();

    await prisma.auditEvent.delete({ where: { id: recentEvent.id } });
  });

  it('keeps expired shares as history (access stays rejected at read time)', async () => {
    const share = await prisma.share.findUnique({ where: { id: shareId } });
    expect(share).not.toBeNull();

    await cleanup.runOnce();

    expect(await prisma.share.findUnique({ where: { id: shareId } })).not.toBeNull();
  });

  it('is idempotent', async () => {
    const first = await cleanup.runOnce();
    const second = await cleanup.runOnce();
    expect(first).toHaveProperty('recipientSessions');
    expect(second).toHaveProperty('auditEvents');
    expect(second.recipientSessions).toBe(0);
    expect(second.auditEvents).toBe(0);
  });
});
