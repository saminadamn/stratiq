// Mirrors apps/api/prisma/schema.prisma's Sprint 3 additions, same reasoning
// as roles.ts/dataset.ts: plain unions here so the frontend never depends on
// @prisma/client.
export const DASHBOARD_TYPES = ['EXECUTIVE', 'CUSTOMER', 'PRODUCT', 'INVENTORY'] as const;
export type DashboardType = (typeof DASHBOARD_TYPES)[number];

// Rule-based only for this sprint (Sprint 3 spec: "Customer Segmentation
// Preview — rules only for now"). Thresholds live in
// customer-analytics.service.ts, not here — this is just the vocabulary.
export const CUSTOMER_SEGMENTS = ['NEW', 'RETURNING', 'LOYAL'] as const;
export type CustomerSegment = (typeof CUSTOMER_SEGMENTS)[number];

export const EXPORT_FORMATS = ['CSV', 'PDF'] as const;
// PNG is deliberately not a backend export format — chart images are
// captured client-side from the already-rendered SVG (see
// docs/ARCHITECTURE.md, "Export: CSV/PDF server-side, PNG client-side").
export type ExportFormat = (typeof EXPORT_FORMATS)[number];

export const STOCK_STATUSES = ['LOW', 'NORMAL', 'OVERSTOCK'] as const;
export type StockStatus = (typeof STOCK_STATUSES)[number];

export interface AnalyticsFiltersDto {
  datasetId?: string | undefined;
  dateFrom?: string | undefined;
  dateTo?: string | undefined;
  category?: string | undefined;
  region?: string | undefined;
  productId?: string | undefined;
  customerSegment?: CustomerSegment | undefined;
}

export interface TimeSeriesPointDto {
  period: string;
  value: number;
}

export interface CategoryValueDto {
  label: string;
  value: number;
}

export interface TopProductDto {
  productId: string;
  productName: string;
  revenue: number;
  unitsSold: number;
}

export interface TopCustomerDto {
  customerId: string;
  customerName: string;
  totalSpent: number;
  orderCount: number;
}

export interface KpiSummaryDto {
  revenue: number;
  totalOrders: number;
  averageOrderValue: number;
  grossProfit: number | null;
  profitMargin: number | null;
  repeatPurchaseRate: number | null;
  activeCustomers: number;
  customerLifetimeValue: number | null;
  inventoryTurnover: number | null;
  monthlyGrowthRate: number | null;
  topProducts: TopProductDto[];
}

export interface LowStockProductDto {
  productId: string;
  productName: string;
  stockLevel: number;
  reorderLevel: number | null;
}

export interface InventoryStatusSummaryDto {
  totalSkus: number;
  lowStockCount: number;
  overstockCount: number;
  totalInventoryValue: number | null;
}

export interface DashboardMeta {
  generatedAt: string;
  datasetId: string;
  datasetVersionId: string;
}

export interface RevenueAnalyticsDto extends DashboardMeta {
  totalRevenue: number;
  monthlyRevenueTrend: TimeSeriesPointDto[];
  revenueByCategory: CategoryValueDto[];
  revenueByRegion: CategoryValueDto[];
}

export interface ExecutiveDashboardDto extends DashboardMeta {
  kpis: KpiSummaryDto;
  monthlyRevenueTrend: TimeSeriesPointDto[];
  ordersOverTime: TimeSeriesPointDto[];
  revenueByCategory: CategoryValueDto[];
  revenueByRegion: CategoryValueDto[];
  topProduct: TopProductDto | null;
  inventoryStatus: InventoryStatusSummaryDto | null;
  lowStockAlerts: LowStockProductDto[];
}

export interface CustomerSegmentBreakdownDto {
  segment: CustomerSegment;
  customerCount: number;
}

export interface CohortRowDto {
  cohortPeriod: string;
  // Index 0 = the cohort's first period (always 100%), index N = customers
  // from that cohort still active N periods later.
  retainedCustomersByPeriod: number[];
}

export interface PurchaseFrequencyBucketDto {
  bucket: string;
  customerCount: number;
}

export interface CustomerDashboardDto extends DashboardMeta {
  newCustomers: number;
  returningCustomers: number;
  retentionRate: number | null;
  averagePurchaseFrequency: number | null;
  customerLifetimeValue: number | null;
  repeatPurchaseRate: number | null;
  topCustomers: TopCustomerDto[];
  customerDistributionByRegion: CategoryValueDto[];
  segmentBreakdown: CustomerSegmentBreakdownDto[];
  cohortAnalysis: CohortRowDto[];
  purchaseFrequencyHistogram: PurchaseFrequencyBucketDto[];
}

export interface ProductPerformanceDto {
  productId: string;
  productName: string;
  revenue: number;
  profit: number | null;
  unitsSold: number;
}

export interface ProductDashboardDto extends DashboardMeta {
  bestSellers: ProductPerformanceDto[];
  worstSellers: ProductPerformanceDto[];
  categoryPerformance: CategoryValueDto[];
  productContribution: CategoryValueDto[];
}

export interface StockLevelDto {
  productId: string;
  productName: string;
  category: string | null;
  stockLevel: number;
  reorderLevel: number | null;
  status: StockStatus;
}

export interface InventoryDashboardDto extends DashboardMeta {
  totalSkus: number;
  totalInventoryValue: number | null;
  inventoryTurnover: number | null;
  lowStockProducts: StockLevelDto[];
  overstockProducts: StockLevelDto[];
  stockLevels: StockLevelDto[];
  categoryDistribution: CategoryValueDto[];
  inventoryTrend: TimeSeriesPointDto[] | null;
}

export interface SavedDashboardViewDto {
  id: string;
  name: string;
  dashboardType: DashboardType;
  filters: AnalyticsFiltersDto;
  createdAt: string;
  updatedAt: string;
  createdBy: { id: string; name: string };
}

export interface CreateSavedDashboardViewRequestDto {
  name: string;
  dashboardType: DashboardType;
  filters: AnalyticsFiltersDto;
}

export interface UpdateSavedDashboardViewRequestDto {
  name?: string | undefined;
  filters?: AnalyticsFiltersDto | undefined;
}

export interface ExportDashboardRequestDto {
  dashboardType: DashboardType;
  format: ExportFormat;
  filters?: AnalyticsFiltersDto;
}
