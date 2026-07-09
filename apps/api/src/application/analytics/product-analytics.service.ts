import type {
  CategoryValueDto,
  ProductDashboardDto,
  ProductPerformanceDto,
  TopProductDto,
} from '@stratiq/shared';
import type { AnalyticsColumns } from './column-detection.js';
import {
  rowCategory,
  rowProductId,
  rowProductName,
  rowProfit,
  rowQuantity,
  rowRevenue,
} from './row-metrics.js';
import { round2 } from './rounding.js';

type Row = Record<string, unknown>;

interface ProductAggregate {
  productId: string;
  productName: string;
  category: string | null;
  revenue: number;
  profit: number;
  hasProfitData: boolean;
  unitsSold: number;
}

const BEST_WORST_LIMIT = 10;
const CONTRIBUTION_TOP_N = 8;

function buildProductAggregates(
  rows: Row[],
  columns: AnalyticsColumns,
): Map<string, ProductAggregate> {
  const aggregates = new Map<string, ProductAggregate>();

  for (const row of rows) {
    const productId = rowProductId(row, columns);
    if (!productId) {
      continue;
    }

    const aggregate = aggregates.get(productId) ?? {
      productId,
      productName: rowProductName(row, columns) ?? productId,
      category: rowCategory(row, columns),
      revenue: 0,
      profit: 0,
      hasProfitData: false,
      unitsSold: 0,
    };

    const revenue = rowRevenue(row, columns);
    if (revenue !== null) {
      aggregate.revenue += revenue;
    }

    const profit = rowProfit(row, columns);
    if (profit !== null) {
      aggregate.profit += profit;
      aggregate.hasProfitData = true;
    }

    // Falls back to counting the row itself as one unit when there's no
    // quantity column — same "no column, assume 1 per row" proxy used
    // throughout (Sprint 2 feature engineering, orders.kpi.ts).
    aggregate.unitsSold += rowQuantity(row, columns) ?? 1;

    aggregates.set(productId, aggregate);
  }

  return aggregates;
}

export type ProductAnalyticsResult = Omit<
  ProductDashboardDto,
  'generatedAt' | 'datasetId' | 'datasetVersionId'
>;

export class ProductAnalyticsService {
  // Reused by GetKpiSummaryUseCase for the KPI engine's "Top Products" entry
  // — one place owns product grouping/ranking, not two.
  getTopProducts(rows: Row[], columns: AnalyticsColumns, limit: number): TopProductDto[] {
    const aggregates = [...buildProductAggregates(rows, columns).values()];
    return aggregates
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit)
      .map((product) => ({
        productId: product.productId,
        productName: product.productName,
        revenue: round2(product.revenue),
        unitsSold: product.unitsSold,
      }));
  }

  build(rows: Row[], columns: AnalyticsColumns): ProductAnalyticsResult {
    const aggregates = [...buildProductAggregates(rows, columns).values()];
    const sortedByRevenue = aggregates.slice().sort((a, b) => b.revenue - a.revenue);
    const totalRevenue = aggregates.reduce((sum, product) => sum + product.revenue, 0);

    const toPerformanceDto = (product: ProductAggregate): ProductPerformanceDto => ({
      productId: product.productId,
      productName: product.productName,
      revenue: round2(product.revenue),
      profit: product.hasProfitData ? round2(product.profit) : null,
      unitsSold: product.unitsSold,
    });

    return {
      bestSellers: sortedByRevenue.slice(0, BEST_WORST_LIMIT).map(toPerformanceDto),
      worstSellers: sortedByRevenue.slice(-BEST_WORST_LIMIT).reverse().map(toPerformanceDto),
      categoryPerformance: this.getCategoryPerformance(aggregates),
      productContribution: this.getProductContribution(sortedByRevenue, totalRevenue),
    };
  }

  private getCategoryPerformance(aggregates: ProductAggregate[]): CategoryValueDto[] {
    const totals = new Map<string, number>();
    for (const product of aggregates) {
      if (!product.category) {
        continue;
      }
      totals.set(product.category, (totals.get(product.category) ?? 0) + product.revenue);
    }
    return [...totals.entries()]
      .map(([label, value]) => ({ label, value: round2(value) }))
      .sort((a, b) => b.value - a.value);
  }

  private getProductContribution(
    sortedByRevenue: ProductAggregate[],
    totalRevenue: number,
  ): CategoryValueDto[] {
    if (totalRevenue === 0) {
      return [];
    }
    const top = sortedByRevenue.slice(0, CONTRIBUTION_TOP_N);
    const rest = sortedByRevenue.slice(CONTRIBUTION_TOP_N);
    const restRevenue = rest.reduce((sum, product) => sum + product.revenue, 0);

    const contribution: CategoryValueDto[] = top.map((product) => ({
      label: product.productName,
      value: round2((product.revenue / totalRevenue) * 100),
    }));
    if (restRevenue > 0) {
      contribution.push({ label: 'Other', value: round2((restRevenue / totalRevenue) * 100) });
    }
    return contribution;
  }
}
