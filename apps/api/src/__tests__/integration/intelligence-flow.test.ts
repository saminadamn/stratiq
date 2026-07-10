import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createServer, type Server } from '../../composition-root.js';

// End-to-end against a real Express app + real Postgres: signup -> upload a
// dataset engineered to show a sharp month-over-month revenue drop -> exercise
// every /metrics, /trends, /benchmarks, /insights, /alerts, /rules endpoint.
// The revenue math itself is covered by the co-located engine unit tests;
// this test's job is the wiring — RBAC, routing, generation/caching, and that
// the default business rules actually fire against real data.
describe('Intelligence API (integration)', () => {
  let server: Server;
  let accessToken: string;
  let organizationId: string;
  let datasetId: string;

  beforeAll(async () => {
    server = await createServer();

    const email = `intelligence-flow-${randomUUID()}@example.com`;
    const signupResponse = await request(server.app)
      .post('/api/v1/auth/signup')
      .send({
        email,
        password: 'password123',
        name: 'Test User',
        organizationName: `Intelligence Test Org ${randomUUID()}`,
      })
      .expect(201);

    accessToken = signupResponse.body.tokens.accessToken as string;
    organizationId = signupResponse.body.organizations[0].id as string;

    // Jan revenue = (10*50) + (10*50) = 1000; Feb revenue = 8*50 = 400 — a
    // 60% month-over-month drop, well past both default revenue-decline
    // rule thresholds (-10% warning, -25% critical).
    const csv = [
      'customerId,customerName,orderId,orderDate,productId,productName,category,region,quantity,unitPrice,cost,stockLevel,reorderLevel',
      'C1,Alice,O1,2024-01-05,P1,Widget,Widgets,West,10,50,30,20,10',
      'C2,Bob,O2,2024-01-20,P1,Widget,Widgets,West,10,50,30,20,10',
      'C1,Alice,O3,2024-02-10,P1,Widget,Widgets,West,8,50,30,20,10',
      '',
    ].join('\n');

    const uploadResponse = await request(server.app)
      .post(`/api/v1/organizations/${organizationId}/datasets/upload`)
      .set('Authorization', `Bearer ${accessToken}`)
      .field('name', 'Intelligence Test Dataset')
      .field('cleaningMode', 'NONE')
      .attach('file', Buffer.from(csv), { filename: 'sales.csv', contentType: 'text/csv' })
      .expect(201);

    datasetId = uploadResponse.body.dataset.id as string;
  });

  afterAll(async () => {
    await request(server.app)
      .delete(`/api/v1/organizations/${organizationId}/datasets/${datasetId}`)
      .set('Authorization', `Bearer ${accessToken}`);
    await server.prisma.alert.deleteMany({ where: { organizationId } });
    await server.prisma.insight.deleteMany({ where: { organizationId } });
    await server.prisma.businessRule.deleteMany({ where: { organizationId } });
    await server.prisma.membership.deleteMany({ where: { organizationId } });
    await server.prisma.organization.deleteMany({ where: { id: organizationId } });
    await server.prisma.user.deleteMany({ where: { email: { contains: 'intelligence-flow-' } } });
    await server.prisma.$disconnect();
  });

  it('serves the metrics registry with the seeded catalog', async () => {
    const list = await request(server.app)
      .get(`/api/v1/organizations/${organizationId}/analytics/metrics`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(list.body.metrics.length).toBeGreaterThanOrEqual(10);
    expect(list.body.metrics.some((m: { key: string }) => m.key === 'revenue')).toBe(true);

    const single = await request(server.app)
      .get(`/api/v1/organizations/${organizationId}/analytics/metrics/revenue`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(single.body.name).toBe('Revenue');

    await request(server.app)
      .get(`/api/v1/organizations/${organizationId}/analytics/metrics/notARealMetric`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(404);
  });

  it('detects a declining trend for revenue', async () => {
    const response = await request(server.app)
      .get(`/api/v1/organizations/${organizationId}/analytics/trends/revenue`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body.direction).toBe('DECLINING');
    expect(response.body.series).toHaveLength(2);
  });

  it('benchmarks the latest month against the prior month', async () => {
    const response = await request(server.app)
      .get(`/api/v1/organizations/${organizationId}/analytics/benchmarks/revenue?period=MONTH`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body.currentValue).toBe(400);
    expect(response.body.previousValue).toBe(1000);
    expect(response.body.changePercent).toBe(-60);
  });

  it('generates a revenue insight the first time it is requested, and reuses it afterward', async () => {
    const first = await request(server.app)
      .get(`/api/v1/organizations/${organizationId}/analytics/insights`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const revenueInsight = first.body.insights.find(
      (i: { metricKey: string }) => i.metricKey === 'revenue',
    );
    expect(revenueInsight).toBeDefined();
    expect(revenueInsight.severity).toBe('CRITICAL');
    expect(revenueInsight.trend).toBe('DECLINING');

    const second = await request(server.app)
      .get(`/api/v1/organizations/${organizationId}/analytics/insights`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    // DatasetVersion-gated generation — a second read must not duplicate rows.
    expect(second.body.insights.length).toBe(first.body.insights.length);
  });

  it('raises both the warning and critical revenue-decline alerts and supports acknowledge/resolve', async () => {
    const list = await request(server.app)
      .get(`/api/v1/organizations/${organizationId}/analytics/alerts`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const revenueAlerts = list.body.alerts.filter(
      (a: { metricKey: string }) => a.metricKey === 'revenue',
    );
    const severities = revenueAlerts.map((a: { severity: string }) => a.severity).sort();
    expect(severities).toEqual(['CRITICAL', 'WARNING']);
    expect(revenueAlerts.every((a: { status: string }) => a.status === 'OPEN')).toBe(true);

    const alertId = revenueAlerts[0].id as string;

    const acknowledged = await request(server.app)
      .post(`/api/v1/organizations/${organizationId}/analytics/alerts/${alertId}/acknowledge`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(acknowledged.body.status).toBe('ACKNOWLEDGED');

    const resolved = await request(server.app)
      .post(`/api/v1/organizations/${organizationId}/analytics/alerts/${alertId}/resolve`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(resolved.body.status).toBe('RESOLVED');
    expect(resolved.body.resolvedAt).not.toBeNull();

    const openOnly = await request(server.app)
      .get(`/api/v1/organizations/${organizationId}/analytics/alerts?status=OPEN`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(openOnly.body.alerts.some((a: { id: string }) => a.id === alertId)).toBe(false);
  });

  it('lazily seeds the four default business rules and supports rule CRUD', async () => {
    const list = await request(server.app)
      .get(`/api/v1/organizations/${organizationId}/analytics/rules`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(list.body.rules.length).toBe(4);
    expect(list.body.rules.every((r: { isDefault: boolean }) => r.isDefault)).toBe(true);

    const created = await request(server.app)
      .post(`/api/v1/organizations/${organizationId}/analytics/rules`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        metricKey: 'totalOrders',
        name: 'Custom low order count',
        comparator: 'VALUE_BELOW',
        thresholdValue: 1,
        severity: 'WARNING',
      })
      .expect(201);
    expect(created.body.isDefault).toBe(false);
    const ruleId = created.body.id as string;

    const updated = await request(server.app)
      .patch(`/api/v1/organizations/${organizationId}/analytics/rules/${ruleId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ thresholdValue: 2 })
      .expect(200);
    expect(updated.body.thresholdValue).toBe(2);

    await request(server.app)
      .delete(`/api/v1/organizations/${organizationId}/analytics/rules/${ruleId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(204);

    const afterDelete = await request(server.app)
      .get(`/api/v1/organizations/${organizationId}/analytics/rules`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(afterDelete.body.rules.some((r: { id: string }) => r.id === ruleId)).toBe(false);
  });

  it('rejects requests without a valid access token', async () => {
    await request(server.app)
      .get(`/api/v1/organizations/${organizationId}/analytics/metrics`)
      .expect(401);
  });
});
