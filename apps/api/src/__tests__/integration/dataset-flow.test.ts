import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createServer, type Server } from '../../composition-root.js';

// End-to-end against a real Express app + real Postgres (via Prisma) —
// exercises the full Sprint 2 vertical slice: signup -> upload -> preview ->
// quality -> clean -> history -> delete, through actual HTTP requests and
// RBAC middleware, not just the use cases in isolation (see the co-located
// unit tests for those). Requires DATABASE_URL etc. to point at a reachable
// Postgres — loaded from the repo-root .env by vitest.setup.ts, or provided
// directly by CI.
describe('Dataset ETL flow (integration)', () => {
  let server: Server;
  let accessToken: string;
  let organizationId: string;
  let datasetId: string;

  beforeAll(async () => {
    server = await createServer();

    const email = `dataset-flow-${randomUUID()}@example.com`;
    const signupResponse = await request(server.app)
      .post('/api/v1/auth/signup')
      .send({
        email,
        password: 'password123',
        name: 'Test User',
        organizationName: `Test Org ${randomUUID()}`,
      })
      .expect(201);

    accessToken = signupResponse.body.tokens.accessToken as string;
    organizationId = signupResponse.body.organizations[0].id as string;
  });

  afterAll(async () => {
    // v1.1: createServer() starts an embedded BullMQ worker whenever
    // REDIS_URL is set — closing it here (once per test file) stops
    // multiple test files' workers from accumulating and contending for
    // the same report-generation queue across the whole suite run.
    await server.worker?.close();
    // Best-effort cleanup so repeated local runs against the same dev
    // database don't accumulate test orgs/users indefinitely.
    await server.prisma.membership.deleteMany({ where: { organizationId } });
    await server.prisma.dataset.deleteMany({ where: { organizationId } });
    await server.prisma.organization.deleteMany({ where: { id: organizationId } });
    await server.prisma.user.deleteMany({ where: { email: { contains: 'dataset-flow-' } } });
    await server.prisma.$disconnect();
  });

  it('uploads a CSV and returns a validation report + quality score', async () => {
    const csv = 'name,amount\nAda,100\nGrace,200\nGrace,200\nBad,-5\n';
    const response = await request(server.app)
      .post(`/api/v1/organizations/${organizationId}/datasets/upload`)
      .set('Authorization', `Bearer ${accessToken}`)
      .field('name', 'Integration Test Dataset')
      .field('cleaningMode', 'NONE')
      .attach('file', Buffer.from(csv), { filename: 'test.csv', contentType: 'text/csv' })
      .expect(201);

    datasetId = response.body.dataset.id as string;
    expect(response.body.version.versionNumber).toBe(1);
    expect(response.body.validationReport.rowCount).toBe(4);
    expect(typeof response.body.validationReport.qualityScore).toBe('number');
  });

  it('lists the dataset for the organization', async () => {
    const response = await request(server.app)
      .get(`/api/v1/organizations/${organizationId}/datasets`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body.datasets.some((dataset: { id: string }) => dataset.id === datasetId)).toBe(
      true,
    );
  });

  it('previews the uploaded rows', async () => {
    const response = await request(server.app)
      .get(`/api/v1/organizations/${organizationId}/datasets/${datasetId}/preview`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body.totalRows).toBe(4);
    expect(response.body.rows).toHaveLength(4);
  });

  it('returns the validation report via the quality endpoint', async () => {
    const response = await request(server.app)
      .get(`/api/v1/organizations/${organizationId}/datasets/${datasetId}/quality`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(
      response.body.issues.some((issue: { code: string }) => issue.code === 'DUPLICATE_ROWS'),
    ).toBe(true);
  });

  it('creates a new version when cleaning the dataset', async () => {
    const response = await request(server.app)
      .post(`/api/v1/organizations/${organizationId}/datasets/${datasetId}/clean`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ mode: 'AUTOMATIC' })
      .expect(201);

    expect(response.body.version.versionNumber).toBe(2);
    // Automatic cleaning removes the duplicate Grace/200 row.
    expect(response.body.version.rowCount).toBe(3);
  });

  it('reflects both versions in the history endpoint', async () => {
    const response = await request(server.app)
      .get(`/api/v1/organizations/${organizationId}/datasets/${datasetId}/history`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body.versions).toHaveLength(2);
  });

  it('rejects requests without a valid access token', async () => {
    await request(server.app).get(`/api/v1/organizations/${organizationId}/datasets`).expect(401);
  });

  it('deletes the dataset and it no longer appears afterward', async () => {
    await request(server.app)
      .delete(`/api/v1/organizations/${organizationId}/datasets/${datasetId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(204);

    const response = await request(server.app)
      .get(`/api/v1/organizations/${organizationId}/datasets/${datasetId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(404);

    expect(response.body.error.code).toBe('DATASET_NOT_FOUND');
  });
});
