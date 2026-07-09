import type {
  AnalyticsFiltersDto,
  CustomerDashboardDto,
  DashboardType,
  ExecutiveDashboardDto,
  ExportFormat,
  InventoryDashboardDto,
  ProductDashboardDto,
} from '@stratiq/shared';
import type { ReportGenerator } from '../../ports/report-generator.port.js';
import { buildExportTable } from '../export/build-export-table.js';
import { toCsv } from '../export/csv-exporter.js';
import type { GetCustomerAnalyticsUseCase } from './get-customer-analytics.use-case.js';
import type { GetExecutiveDashboardUseCase } from './get-executive-dashboard.use-case.js';
import type { GetInventoryAnalyticsUseCase } from './get-inventory-analytics.use-case.js';
import type { GetProductAnalyticsUseCase } from './get-product-analytics.use-case.js';

export interface ExportResult {
  contentType: string;
  fileName: string;
  buffer: Buffer;
}

type AnyDashboard =
  ExecutiveDashboardDto | CustomerDashboardDto | ProductDashboardDto | InventoryDashboardDto;

// PNG isn't handled here — see docs/ARCHITECTURE.md ("Export: CSV/PDF
// server-side, PNG client-side"). CSV and PDF both start from the same
// buildExportTable() so the two formats can never show different numbers
// for the same dashboard/filters.
export class ExportDashboardUseCase {
  constructor(
    private readonly getExecutiveDashboard: GetExecutiveDashboardUseCase,
    private readonly getCustomerAnalytics: GetCustomerAnalyticsUseCase,
    private readonly getProductAnalytics: GetProductAnalyticsUseCase,
    private readonly getInventoryAnalytics: GetInventoryAnalyticsUseCase,
    private readonly reportGenerator: ReportGenerator,
  ) {}

  async execute(
    organizationId: string,
    dashboardType: DashboardType,
    format: ExportFormat,
    filters: AnalyticsFiltersDto,
  ): Promise<ExportResult> {
    const dashboard = await this.loadDashboard(organizationId, dashboardType, filters);
    const table = buildExportTable(dashboardType, dashboard);
    const fileBase = `${dashboardType.toLowerCase()}-dashboard-${new Date().toISOString().slice(0, 10)}`;

    if (format === 'CSV') {
      return {
        contentType: 'text/csv',
        fileName: `${fileBase}.csv`,
        buffer: Buffer.from(toCsv(table), 'utf-8'),
      };
    }

    const buffer = await this.reportGenerator.generatePdf({
      title: `${dashboardType} Dashboard Report`,
      generatedAt: dashboard.generatedAt,
      sections: [{ heading: 'Summary', rows: table }],
    });
    return { contentType: 'application/pdf', fileName: `${fileBase}.pdf`, buffer };
  }

  private async loadDashboard(
    organizationId: string,
    dashboardType: DashboardType,
    filters: AnalyticsFiltersDto,
  ): Promise<AnyDashboard> {
    switch (dashboardType) {
      case 'EXECUTIVE':
        return this.getExecutiveDashboard.execute(organizationId, filters);
      case 'CUSTOMER':
        return this.getCustomerAnalytics.execute(organizationId, filters);
      case 'PRODUCT':
        return this.getProductAnalytics.execute(organizationId, filters);
      case 'INVENTORY':
        return this.getInventoryAnalytics.execute(organizationId, filters);
    }
  }
}
