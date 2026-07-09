import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createServer, type Server } from '../../composition-root.js';

// End-to-end against a real Express app + real Postgres: signup -> upload a
// dataset with transactional + inventory columns -> exercise every /analytics
// endpoint -> saved views CRUD -> CSV/PDF export. Business-logic correctness
// (the actual KPI math) is covered by the co-located unit tests; this test's
// job is the wiring — RBAC, routing, request/response shapes.
describe('Analytics API (integration)', () => {
  let server: Server;
  let accessToken: string;
  let organizationId: string;
  let datasetId: string;

  beforeAll(async () => {
    server = createServer();

    const email = `analytics-flow-${randomUUID()}@example.com`;
    const signupResponse = await request(server.app)
      .post('/api/v1/auth/signup')
      .send({
        email,
        password: 'password123',
        name: 'Test User',
        organizationName: `Analytics Test Org ${randomUUID()}`,
      })
      .expect(201);

    accessToken = signupResponse.body.tokens.accessToken as string;
    organizationId = signupResponse.body.organizations[0].id as string;

    const csv = [
      'customerId,customerName,orderId,orderDate,productId,productName,category,region,quantity,unitPrice,cost,stockLevel,reorderLevel',
      'C1,Alice,O1,2024-01-05,P1,Widget,Widgets,West,2,50,30,20,10',
      'C1,Alice,O2,2024-02-10,P1,Widget,Widgets,West,1,50,30,20,10',
      'C2,Bob,O3,2024-01-15,P2,Gadget,Gadgets,East,3,20,10,5,10',
      'C3,Carol,O4,2024-02-20,P1,Widget,Widgets,West,1,50,30,20,10',
      '',
    ].join('\n');

    const uploadResponse = await request(server.app)
      .post(`/api/v1/organizations/${organizationId}/datasets/upload`)
      .set('Authorization', `Bearer ${accessToken}`)
      .field('name', 'Analytics Test Dataset')
      .field('cleaningMode', 'NONE')
      .attach('file', Buffer.from(csv), { filename: 'sales.csv', contentType: 'text/csv' })
      .expect(201);

    datasetId = uploadResponse.body.dataset.id as string;
  });

  afterAll(async () => {
    await request(server.app)
      .delete(`/api/v1/organizations/${organizationId}/datasets/${datasetId}`)
      .set('Authorization', `Bearer ${accessToken}`);
    await server.prisma.savedDashboardView.deleteMany({ where: { organizationId } });
    await server.prisma.membership.deleteMany({ where: { organizationId } });
    await server.prisma.organization.deleteMany({ where: { id: organizationId } });
    await server.prisma.user.deleteMany({ where: { email: { contains: 'analytics-flow-' } } });
    await server.prisma.$disconnect();
  });

  it('computes a KPI summary with top products and inventory turnover', async () => {
    const response = await request(server.app)
      .get(`/api/v1/organizations/${organizationId}/analytics/kpis`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body.revenue).toBeGreaterThan(0);
    expect(response.body.totalOrders).toBe(4);
    expect(response.body.activeCustomers).toBe(3);
    expect(response.body.topProducts.length).toBeGreaterThan(0);
  });

  it('returns revenue analytics with a monthly trend and category/region breakdowns', async () => {
    const response = await request(server.app)
      .get(`/api/v1/organizations/${organizationId}/analytics/revenue`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body.monthlyRevenueTrend).toHaveLength(2);
    expect(response.body.revenueByCategory.length).toBeGreaterThan(0);
    expect(response.body.revenueByRegion.length).toBeGreaterThan(0);
  });

  it('serves the executive dashboard as one composite payload', async () => {
    const response = await request(server.app)
      .get(`/api/v1/organizations/${organizationId}/analytics/dashboard/executive`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body.kpis.revenue).toBeGreaterThan(0);
    expect(response.body.topProduct).not.toBeNull();
    expect(response.body.inventoryStatus).not.toBeNull();
  });

  it('serves customer, product, and inventory analytics under both route aliases', async () => {
    const customer = await request(server.app)
      .get(`/api/v1/organizations/${organizationId}/analytics/customers`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(customer.body.topCustomers.length).toBeGreaterThan(0);

    const customerDashboard = await request(server.app)
      .get(`/api/v1/organizations/${organizationId}/analytics/dashboard/customer`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(customerDashboard.body.topCustomers).toEqual(customer.body.topCustomers);

    const product = await request(server.app)
      .get(`/api/v1/organizations/${organizationId}/analytics/products`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(product.body.bestSellers.length).toBeGreaterThan(0);

    const inventory = await request(server.app)
      .get(`/api/v1/organizations/${organizationId}/analytics/inventory`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(inventory.body.totalSkus).toBeGreaterThan(0);
  });

  it('applies category and date filters', async () => {
    const response = await request(server.app)
      .get(
        `/api/v1/organizations/${organizationId}/analytics/kpis?category=Gadgets&dateFrom=2024-01-01&dateTo=2024-01-31`,
      )
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    // Only Bob's single Gadgets order in January should remain.
    expect(response.body.totalOrders).toBe(1);
    expect(response.body.activeCustomers).toBe(1);
  });

  it('creates, lists, updates, and deletes a saved dashboard view', async () => {
    const createResponse = await request(server.app)
      .post(`/api/v1/organizations/${organizationId}/analytics/views`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'My Executive View', dashboardType: 'EXECUTIVE', filters: { region: 'West' } })
      .expect(201);
    const viewId = createResponse.body.id as string;

    const listResponse = await request(server.app)
      .get(`/api/v1/organizations/${organizationId}/analytics/views?dashboardType=EXECUTIVE`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(listResponse.body.views.some((view: { id: string }) => view.id === viewId)).toBe(true);

    const updateResponse = await request(server.app)
      .patch(`/api/v1/organizations/${organizationId}/analytics/views/${viewId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Renamed View' })
      .expect(200);
    expect(updateResponse.body.name).toBe('Renamed View');

    await request(server.app)
      .delete(`/api/v1/organizations/${organizationId}/analytics/views/${viewId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(204);

    await request(server.app)
      .get(`/api/v1/organizations/${organizationId}/analytics/views/${viewId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(404);
  });

  it('exports the executive dashboard as CSV and PDF', async () => {
    const csvResponse = await request(server.app)
      .post(`/api/v1/organizations/${organizationId}/analytics/export`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ dashboardType: 'EXECUTIVE', format: 'CSV' })
      .expect(200);
    expect(csvResponse.headers['content-type']).toContain('text/csv');
    expect(csvResponse.text).toContain('Revenue');

    const pdfResponse = await request(server.app)
      .post(`/api/v1/organizations/${organizationId}/analytics/export`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ dashboardType: 'EXECUTIVE', format: 'PDF' })
      .expect(200);
    expect(pdfResponse.headers['content-type']).toContain('application/pdf');
  });

  it('rejects requests without a valid access token', async () => {
    await request(server.app)
      .get(`/api/v1/organizations/${organizationId}/analytics/kpis`)
      .expect(401);
  });
});
