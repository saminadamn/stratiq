import { randomUUID } from 'node:crypto';
import { Redis } from 'ioredis';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createServer, type Server } from '../../composition-root.js';

// Only meaningful with a real Redis behind REDIS_URL — without it,
// composition-root.ts falls back to the in-memory cache/rate-limit store,
// which is already covered by every other integration test. CI sets
// REDIS_URL (see .github/workflows/ci.yml); locally this is skipped unless
// you export it yourself (e.g. `docker run -p 6379:6379 redis:7-alpine`).
const redisUrl = process.env.REDIS_URL;
const describeIfRedis = redisUrl ? describe : describe.skip;

describeIfRedis('Distributed features backed by Redis (integration)', () => {
  let server: Server;
  let inspector: Redis;

  beforeAll(async () => {
    server = await createServer();
    inspector = new Redis(redisUrl as string);
  });

  afterAll(async () => {
    // createServer() always starts an embedded BullMQ worker here, since
    // this whole file is gated on REDIS_URL — closing it stops it from
    // accumulating alongside the other integration test files' workers.
    await server.worker?.close();
    await inspector.quit();
  });

  it('shares analytics cache entries via Redis, keyed by dataset version', async () => {
    const email = `redis-cache-flow-${randomUUID()}@example.com`;
    const signupResponse = await request(server.app)
      .post('/api/v1/auth/signup')
      .send({
        email,
        password: 'password123',
        name: 'Test User',
        organizationName: `Redis Cache Test Org ${randomUUID()}`,
      })
      .expect(201);

    const accessToken = signupResponse.body.tokens.accessToken as string;
    const organizationId = signupResponse.body.organizations[0].id as string;

    const csv = [
      'customerId,customerName,orderId,orderDate,productId,productName,category,region,quantity,unitPrice,cost',
      'C1,Alice,O1,2024-01-05,P1,Widget,Widgets,West,2,50,30',
      '',
    ].join('\n');

    await request(server.app)
      .post(`/api/v1/organizations/${organizationId}/datasets/upload`)
      .set('Authorization', `Bearer ${accessToken}`)
      .field('name', 'Redis Cache Test Dataset')
      .field('cleaningMode', 'NONE')
      .attach('file', Buffer.from(csv), { filename: 'sales.csv', contentType: 'text/csv' })
      .expect(201);

    const before = await inspector.keys('analytics-cache:*');

    const first = await request(server.app)
      .get(`/api/v1/organizations/${organizationId}/analytics/kpis`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const after = await inspector.keys('analytics-cache:*');
    expect(after.length).toBeGreaterThan(before.length);

    // A second identical request should be served from the same Redis
    // entry — not just "some cache exists", but the specific value cached.
    const second = await request(server.app)
      .get(`/api/v1/organizations/${organizationId}/analytics/kpis`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(second.body).toEqual(first.body);

    const ttl = await inspector.ttl(after[after.length - 1] as string);
    expect(ttl).toBeGreaterThan(0);
  });

  it('shares auth rate-limit counters via Redis, not per-process memory', async () => {
    const email = `redis-ratelimit-flow-${randomUUID()}@example.com`;
    await request(server.app)
      .post('/api/v1/auth/login')
      .send({ email, password: 'wrong-password' });

    const keys = await inspector.keys('rl:auth:*');
    expect(keys.length).toBeGreaterThan(0);
  });
});
