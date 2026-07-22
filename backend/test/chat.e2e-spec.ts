import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';

const HEADER = 'X-Session-Id';

describe('Chat CRUD + session isolation (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  // Two unrelated browsers. Everything below is about keeping them apart.
  const sessionA = randomUUID();
  const sessionB = randomUUID();

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    // Mirror main.ts, or the tests would exercise a different app than ships.
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    dataSource = app.get(DataSource);
  });

  afterAll(async () => {
    // Hard delete, so soft-deleted rows from these runs do not accumulate.
    await dataSource.query(
      `DELETE FROM conversations WHERE session_id = ANY($1::varchar[])`,
      [[sessionA, sessionB]],
    );
    await app.close();
  });

  const api = () => request(app.getHttpServer());

  describe('the session header', () => {
    it('rejects a request with no header', async () => {
      await api().get('/api/conversations').expect(400);
    });

    it('rejects a header that is not a UUID', async () => {
      await api()
        .get('/api/conversations')
        .set(HEADER, 'not-a-uuid')
        .expect(400);
    });

    it('treats an upper-cased UUID as the same session', async () => {
      const created = await api()
        .post('/api/conversations')
        .set(HEADER, sessionA)
        .expect(201);

      await api()
        .get(`/api/conversations/${created.body.id}`)
        .set(HEADER, sessionA.toUpperCase())
        .expect(200);
    });
  });

  describe('lifecycle: create -> list -> get -> messages -> delete -> 404', () => {
    let conversationId: string;

    it('creates a conversation', async () => {
      const response = await api()
        .post('/api/conversations')
        .set(HEADER, sessionA)
        .expect(201);

      expect(response.body).toMatchObject({ title: 'New Chat' });
      expect(response.body.id).toEqual(expect.any(String));
      // The session id is the only credential in play — it must not come back.
      expect(response.body).not.toHaveProperty('sessionId');
      expect(response.body).not.toHaveProperty('deletedAt');

      conversationId = response.body.id;
    });

    it('lists it with pagination metadata', async () => {
      const response = await api()
        .get('/api/conversations?page=1&limit=20')
        .set(HEADER, sessionA)
        .expect(200);

      expect(response.body.pagination).toMatchObject({ page: 1, limit: 20 });
      expect(response.body.data.map((c: { id: string }) => c.id)).toContain(
        conversationId,
      );
    });

    it('fetches it by id', async () => {
      await api()
        .get(`/api/conversations/${conversationId}`)
        .set(HEADER, sessionA)
        .expect(200);
    });

    it('returns an empty message list before anything is said', async () => {
      const response = await api()
        .get(`/api/conversations/${conversationId}/messages`)
        .set(HEADER, sessionA)
        .expect(200);

      expect(response.body).toEqual([]);
    });

    it('soft-deletes it', async () => {
      const response = await api()
        .delete(`/api/conversations/${conversationId}`)
        .set(HEADER, sessionA)
        .expect(200);

      expect(response.body).toHaveProperty('message');

      const [row] = await dataSource.query(
        `SELECT deleted_at FROM conversations WHERE id = $1`,
        [conversationId],
      );
      // Still on disk — soft delete, not a DELETE.
      expect(row.deleted_at).not.toBeNull();
    });

    it('behaves as if the deleted conversation never existed', async () => {
      await api()
        .get(`/api/conversations/${conversationId}`)
        .set(HEADER, sessionA)
        .expect(404);
      await api()
        .get(`/api/conversations/${conversationId}/messages`)
        .set(HEADER, sessionA)
        .expect(404);
      await api()
        .delete(`/api/conversations/${conversationId}`)
        .set(HEADER, sessionA)
        .expect(404);

      const list = await api()
        .get('/api/conversations')
        .set(HEADER, sessionA)
        .expect(200);
      expect(list.body.data.map((c: { id: string }) => c.id)).not.toContain(
        conversationId,
      );
    });
  });

  describe('session isolation', () => {
    let ownedByA: string;

    beforeAll(async () => {
      const created = await api()
        .post('/api/conversations')
        .set(HEADER, sessionA)
        .expect(201);
      ownedByA = created.body.id;
    });

    it.each([
      ['GET conversation', 'get', `/api/conversations/:id`],
      ['GET messages', 'get', `/api/conversations/:id/messages`],
      ['DELETE conversation', 'delete', `/api/conversations/:id`],
    ])(
      'gives session B a 404 for %s — never a 403, which would confirm the id is real',
      async (_label, method, path) => {
        await (api() as any)
          [method](path.replace(':id', ownedByA))
          .set(HEADER, sessionB)
          .expect(404);
      },
    );

    it("keeps A's conversation out of B's list", async () => {
      const response = await api()
        .get('/api/conversations')
        .set(HEADER, sessionB)
        .expect(200);

      expect(response.body.data.map((c: { id: string }) => c.id)).not.toContain(
        ownedByA,
      );
    });

    it("leaves A's conversation intact after B's failed delete", async () => {
      await api()
        .get(`/api/conversations/${ownedByA}`)
        .set(HEADER, sessionA)
        .expect(200);
    });
  });

  describe('message ordering', () => {
    it('returns messages oldest-first regardless of insertion order', async () => {
      const created = await api()
        .post('/api/conversations')
        .set(HEADER, sessionA)
        .expect(201);
      const conversationId = created.body.id;

      // Inserted newest-first on purpose, with explicit timestamps, so a missing
      // ORDER BY would show up as the reverse of what we expect rather than
      // passing by luck.
      for (const [offset, content] of [
        [2, 'third'],
        [0, 'first'],
        [1, 'second'],
      ] as const) {
        await dataSource.query(
          `INSERT INTO messages (conversation_id, role, content, created_at)
           VALUES ($1, 'user', $2, now() + ($3 || ' seconds')::interval)`,
          [conversationId, content, offset],
        );
      }

      const response = await api()
        .get(`/api/conversations/${conversationId}/messages`)
        .set(HEADER, sessionA)
        .expect(200);

      expect(
        response.body.map((m: { content: string }) => m.content),
      ).toEqual(['first', 'second', 'third']);
    });

    it('exposes cost as a number, not a decimal string', async () => {
      const created = await api()
        .post('/api/conversations')
        .set(HEADER, sessionA)
        .expect(201);

      await dataSource.query(
        `INSERT INTO messages (conversation_id, role, content, cost, is_partial)
         VALUES ($1, 'assistant', 'hi', 0.001234, true)`,
        [created.body.id],
      );

      const response = await api()
        .get(`/api/conversations/${created.body.id}/messages`)
        .set(HEADER, sessionA)
        .expect(200);

      expect(response.body[0].cost).toBe(0.001234);
      expect(response.body[0].isPartial).toBe(true);
    });
  });
});
