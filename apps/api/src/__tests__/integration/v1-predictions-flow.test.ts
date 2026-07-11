import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createServer, type Server } from '../../composition-root.js';

// End-to-end against a real Express app + real Postgres + the real Python
// ML service (must be running on ML_SERVICE_URL, default localhost:8000) —
// signup -> upload a dataset with 8 customers/3 products across two months
// -> exercise every /predictions, /decisions, and /reports endpoint.
// 8 customers clears churn.py's MIN_CUSTOMERS_FOR_TRAINING threshold, so
// this also proves the trained-classifier path (not just the heuristic
// fallback already covered by the Python unit tests).
describe('v1.0 Predictions/Decisions/Reports API (integration)', () => {
  let server: Server;
  let accessToken: string;
  let organizationId: string;
  let datasetId: string;

  beforeAll(async () => {
    server = await createServer();

    const email = `v1-predictions-flow-${randomUUID()}@example.com`;
    const signupResponse = await request(server.app)
      .post('/api/v1/auth/signup')
      .send({
        email,
        password: 'password123',
        name: 'Test User',
        organizationName: `V1 Predictions Test Org ${randomUUID()}`,
      })
      .expect(201);

    accessToken = signupResponse.body.tokens.accessToken as string;
    organizationId = signupResponse.body.organizations[0].id as string;

    const rows = [
      'C1,Alice,O1,2024-01-05,P1,Widget,Widgets,West,10,50,30',
      'C1,Alice,O2,2024-01-20,P1,Widget,Widgets,West,5,50,30',
      'C1,Alice,O3,2024-02-01,P2,Gadget,Gadgets,West,4,40,20',
      'C2,Bob,O4,2024-01-10,P2,Gadget,Gadgets,East,3,40,20',
      'C3,Carol,O5,2024-01-15,P1,Widget,Widgets,East,2,50,30',
      'C4,Dave,O6,2024-02-05,P3,Gizmo,Gizmos,North,6,30,15',
      'C5,Erin,O7,2024-01-01,P2,Gadget,Gadgets,North,1,40,20',
      'C6,Frank,O8,2024-02-10,P1,Widget,Widgets,South,8,50,30',
      'C7,Grace,O9,2024-01-25,P3,Gizmo,Gizmos,South,3,30,15',
      'C7,Grace,O10,2024-02-15,P1,Widget,Widgets,South,4,50,30',
      'C8,Heidi,O11,2024-01-03,P3,Gizmo,Gizmos,West,2,30,15',
    ];
    const csv = [
      'customerId,customerName,orderId,orderDate,productId,productName,category,region,quantity,unitPrice,cost',
      ...rows,
      '',
    ].join('\n');

    const uploadResponse = await request(server.app)
      .post(`/api/v1/organizations/${organizationId}/datasets/upload`)
      .set('Authorization', `Bearer ${accessToken}`)
      .field('name', 'V1 Predictions Test Dataset')
      .field('cleaningMode', 'NONE')
      .attach('file', Buffer.from(csv), { filename: 'sales.csv', contentType: 'text/csv' })
      .expect(201);

    datasetId = uploadResponse.body.dataset.id as string;
  }, 30000);

  afterAll(async () => {
    // v1.1: createServer() starts an embedded BullMQ worker whenever
    // REDIS_URL is set — closing it here (once per test file) stops
    // multiple test files' workers from accumulating and contending for
    // the same report-generation queue across the whole suite run.
    await server.worker?.close();
    await request(server.app)
      .delete(`/api/v1/organizations/${organizationId}/datasets/${datasetId}`)
      .set('Authorization', `Bearer ${accessToken}`);
    await server.prisma.report.deleteMany({ where: { organizationId } });
    await server.prisma.decisionRecommendation.deleteMany({ where: { organizationId } });
    await server.prisma.prediction.deleteMany({ where: { organizationId } });
    await server.prisma.mlModel.deleteMany({ where: { organizationId } });
    await server.prisma.mlFeatureSnapshot.deleteMany({ where: { organizationId } });
    await server.prisma.alert.deleteMany({ where: { organizationId } });
    await server.prisma.insight.deleteMany({ where: { organizationId } });
    await server.prisma.businessRule.deleteMany({ where: { organizationId } });
    await server.prisma.membership.deleteMany({ where: { organizationId } });
    await server.prisma.organization.deleteMany({ where: { id: organizationId } });
    await server.prisma.user.deleteMany({ where: { email: { contains: 'v1-predictions-flow-' } } });
    await server.prisma.$disconnect();
  });

  it('predicts churn with a trained classifier and reuses the cached result', async () => {
    const first = await request(server.app)
      .get(`/api/v1/organizations/${organizationId}/analytics/predictions/churn`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(first.body.predictions.length).toBe(8);
    for (const prediction of first.body.predictions) {
      expect(prediction.churnProbability).toBeGreaterThanOrEqual(0);
      expect(prediction.churnProbability).toBeLessThanOrEqual(1);
      expect(prediction.explanation.topFeatures.length).toBeGreaterThan(0);
    }
    // 8 customers clears the training threshold, so this should be the
    // learned classifier, not the recency-percentile heuristic fallback.
    expect(first.body.predictions[0].explanation.method).toBe('logistic_regression_coefficients');

    const second = await request(server.app)
      .get(`/api/v1/organizations/${organizationId}/analytics/predictions/churn`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(second.body.predictions).toEqual(first.body.predictions);

    const models = await server.prisma.mlModel.findMany({
      where: { organizationId, modelKey: 'CHURN' },
    });
    expect(models).toHaveLength(1);
  });

  it('forecasts future revenue periods from the existing monthly series', async () => {
    const response = await request(server.app)
      .get(`/api/v1/organizations/${organizationId}/analytics/predictions/forecast`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body.history.length).toBe(2);
    expect(response.body.forecast.length).toBeGreaterThan(0);
    expect(response.body.forecast[0].isForecast).toBe(true);
  });

  it('segments customers and assigns every customer to a segment', async () => {
    const response = await request(server.app)
      .get(`/api/v1/organizations/${organizationId}/analytics/predictions/segments`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body.segments.length).toBeGreaterThan(0);
    expect(response.body.assignments.length).toBe(8);
  });

  it('recommends products a customer has not already purchased', async () => {
    const response = await request(server.app)
      .get(`/api/v1/organizations/${organizationId}/analytics/predictions/recommendations`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body.recommendations.length).toBeGreaterThan(0);
    const c1Recommendations = response.body.recommendations.filter(
      (r: { customerId: string }) => r.customerId === 'C1',
    );
    // C1 already bought P1 and P2 — should never be recommended either.
    expect(
      c1Recommendations.every(
        (r: { recommendedProductId: string }) => r.recommendedProductId === 'P3',
      ),
    ).toBe(true);
  });

  it('serves deterministic root causes and recommendations from the Decision Intelligence Engine', async () => {
    const response = await request(server.app)
      .get(`/api/v1/organizations/${organizationId}/analytics/decisions`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(Array.isArray(response.body.rootCauses)).toBe(true);
    expect(Array.isArray(response.body.recommendations)).toBe(true);
    for (const recommendation of response.body.recommendations) {
      expect(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).toContain(recommendation.priority);
    }
  });

  // v1.1: report generation is queued (see EnqueueReportUseCase /
  // ProcessReportJobService), not synchronous, so the request returns
  // PENDING immediately and the test has to poll until a worker (embedded
  // in createServer(), see composition-root.ts) flips it to COMPLETE.
  it('generates, lists, and downloads all four report types', async () => {
    for (const type of ['EXECUTIVE_SUMMARY', 'KPI', 'PREDICTION', 'RECOMMENDATION']) {
      const generateResponse = await request(server.app)
        .post(`/api/v1/organizations/${organizationId}/reports/generate`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ type })
        .expect(202);
      expect(generateResponse.body.type).toBe(type);
      expect(generateResponse.body.status).toBe('PENDING');

      let status = generateResponse.body.status;
      for (let attempt = 0; attempt < 80 && status !== 'COMPLETE'; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        const listResponse = await request(server.app)
          .get(`/api/v1/organizations/${organizationId}/reports`)
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);
        const report = listResponse.body.reports.find(
          (r: { id: string }) => r.id === generateResponse.body.id,
        );
        status = report?.status;
        if (status === 'FAILED') {
          throw new Error(`Report generation failed: ${report?.errorMessage}`);
        }
      }
      expect(status).toBe('COMPLETE');

      const downloadResponse = await request(server.app)
        .get(`/api/v1/organizations/${organizationId}/reports/${generateResponse.body.id}/download`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      expect(downloadResponse.headers['content-type']).toContain('application/pdf');
      expect(downloadResponse.body.length).toBeGreaterThan(0);
    }

    const listResponse = await request(server.app)
      .get(`/api/v1/organizations/${organizationId}/reports`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(listResponse.body.reports.length).toBe(4);
  }, 40000);

  it('rejects requests without a valid access token', async () => {
    await request(server.app)
      .get(`/api/v1/organizations/${organizationId}/analytics/predictions/churn`)
      .expect(401);
  });
});
