import type { Request, Response } from 'express';
import { z } from 'zod';
import { CUSTOMER_SEGMENTS, DASHBOARD_TYPES, EXPORT_FORMATS } from '@stratiq/shared';
import type { GetKpiSummaryUseCase } from '../../../application/analytics/use-cases/get-kpi-summary.use-case.js';
import type { GetRevenueAnalyticsUseCase } from '../../../application/analytics/use-cases/get-revenue-analytics.use-case.js';
import type { GetCustomerAnalyticsUseCase } from '../../../application/analytics/use-cases/get-customer-analytics.use-case.js';
import type { GetProductAnalyticsUseCase } from '../../../application/analytics/use-cases/get-product-analytics.use-case.js';
import type { GetInventoryAnalyticsUseCase } from '../../../application/analytics/use-cases/get-inventory-analytics.use-case.js';
import type { GetExecutiveDashboardUseCase } from '../../../application/analytics/use-cases/get-executive-dashboard.use-case.js';
import type { ExportDashboardUseCase } from '../../../application/analytics/use-cases/export-dashboard.use-case.js';
import type { CreateSavedDashboardViewUseCase } from '../../../application/analytics/use-cases/create-saved-dashboard-view.use-case.js';
import type { ListSavedDashboardViewsUseCase } from '../../../application/analytics/use-cases/list-saved-dashboard-views.use-case.js';
import type { GetSavedDashboardViewUseCase } from '../../../application/analytics/use-cases/get-saved-dashboard-view.use-case.js';
import type { UpdateSavedDashboardViewUseCase } from '../../../application/analytics/use-cases/update-saved-dashboard-view.use-case.js';
import type { DeleteSavedDashboardViewUseCase } from '../../../application/analytics/use-cases/delete-saved-dashboard-view.use-case.js';
import { asyncHandler } from '../utils/async-handler.js';

const filtersQuerySchema = z.object({
  datasetId: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  category: z.string().optional(),
  region: z.string().optional(),
  productId: z.string().optional(),
  customerSegment: z.enum(CUSTOMER_SEGMENTS).optional(),
});

const exportBodySchema = z.object({
  dashboardType: z.enum(DASHBOARD_TYPES),
  format: z.enum(EXPORT_FORMATS),
  filters: filtersQuerySchema.optional(),
});

const createViewBodySchema = z.object({
  name: z.string().min(1),
  dashboardType: z.enum(DASHBOARD_TYPES),
  filters: filtersQuerySchema,
});

const updateViewBodySchema = z.object({
  name: z.string().min(1).optional(),
  filters: filtersQuerySchema.optional(),
});

const listViewsQuerySchema = z.object({
  dashboardType: z.enum(DASHBOARD_TYPES).optional(),
});

export interface AnalyticsControllerDeps {
  getKpiSummary: GetKpiSummaryUseCase;
  getRevenueAnalytics: GetRevenueAnalyticsUseCase;
  getCustomerAnalytics: GetCustomerAnalyticsUseCase;
  getProductAnalytics: GetProductAnalyticsUseCase;
  getInventoryAnalytics: GetInventoryAnalyticsUseCase;
  getExecutiveDashboard: GetExecutiveDashboardUseCase;
  exportDashboard: ExportDashboardUseCase;
  createSavedView: CreateSavedDashboardViewUseCase;
  listSavedViews: ListSavedDashboardViewsUseCase;
  getSavedView: GetSavedDashboardViewUseCase;
  updateSavedView: UpdateSavedDashboardViewUseCase;
  deleteSavedView: DeleteSavedDashboardViewUseCase;
}

// /analytics/dashboard/{customer,product,inventory} intentionally call the
// exact same use cases as /analytics/{customers,products,inventory} — see
// get-customer-analytics.use-case.ts for why they're not separate
// computations. Only /analytics/dashboard/executive is genuinely composite.
export function createAnalyticsController(deps: AnalyticsControllerDeps) {
  return {
    getKpis: asyncHandler(async (req: Request, res: Response) => {
      const filters = filtersQuerySchema.parse(req.query);
      const result = await deps.getKpiSummary.execute(
        req.params['organizationId'] as string,
        filters,
      );
      res.status(200).json(result);
    }),

    getRevenue: asyncHandler(async (req: Request, res: Response) => {
      const filters = filtersQuerySchema.parse(req.query);
      const result = await deps.getRevenueAnalytics.execute(
        req.params['organizationId'] as string,
        filters,
      );
      res.status(200).json(result);
    }),

    getCustomers: asyncHandler(async (req: Request, res: Response) => {
      const filters = filtersQuerySchema.parse(req.query);
      const result = await deps.getCustomerAnalytics.execute(
        req.params['organizationId'] as string,
        filters,
      );
      res.status(200).json(result);
    }),

    getProducts: asyncHandler(async (req: Request, res: Response) => {
      const filters = filtersQuerySchema.parse(req.query);
      const result = await deps.getProductAnalytics.execute(
        req.params['organizationId'] as string,
        filters,
      );
      res.status(200).json(result);
    }),

    getInventory: asyncHandler(async (req: Request, res: Response) => {
      const filters = filtersQuerySchema.parse(req.query);
      const result = await deps.getInventoryAnalytics.execute(
        req.params['organizationId'] as string,
        filters,
      );
      res.status(200).json(result);
    }),

    getExecutiveDashboard: asyncHandler(async (req: Request, res: Response) => {
      const filters = filtersQuerySchema.parse(req.query);
      const result = await deps.getExecutiveDashboard.execute(
        req.params['organizationId'] as string,
        filters,
      );
      res.status(200).json(result);
    }),

    exportDashboard: asyncHandler(async (req: Request, res: Response) => {
      const body = exportBodySchema.parse(req.body);
      const result = await deps.exportDashboard.execute(
        req.params['organizationId'] as string,
        body.dashboardType,
        body.format,
        body.filters ?? {},
      );
      res
        .status(200)
        .setHeader('Content-Type', result.contentType)
        .setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`)
        .send(result.buffer);
    }),

    createSavedView: asyncHandler(async (req: Request, res: Response) => {
      const body = createViewBodySchema.parse(req.body);
      const result = await deps.createSavedView.execute({
        organizationId: req.params['organizationId'] as string,
        userId: req.userId as string,
        ...body,
      });
      res.status(201).json(result);
    }),

    listSavedViews: asyncHandler(async (req: Request, res: Response) => {
      const query = listViewsQuerySchema.parse(req.query);
      const result = await deps.listSavedViews.execute(
        req.params['organizationId'] as string,
        query.dashboardType,
      );
      res.status(200).json({ views: result });
    }),

    getSavedView: asyncHandler(async (req: Request, res: Response) => {
      const result = await deps.getSavedView.execute(
        req.params['organizationId'] as string,
        req.params['viewId'] as string,
      );
      res.status(200).json(result);
    }),

    updateSavedView: asyncHandler(async (req: Request, res: Response) => {
      const body = updateViewBodySchema.parse(req.body);
      const result = await deps.updateSavedView.execute(
        req.params['organizationId'] as string,
        req.params['viewId'] as string,
        body,
      );
      res.status(200).json(result);
    }),

    deleteSavedView: asyncHandler(async (req: Request, res: Response) => {
      await deps.deleteSavedView.execute(
        req.params['organizationId'] as string,
        req.params['viewId'] as string,
      );
      res.status(204).send();
    }),
  };
}
