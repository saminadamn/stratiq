import type {
  CategoryValueDto,
  InventoryDashboardDto,
  StockLevelDto,
  StockStatus,
  TimeSeriesPointDto,
} from '@stratiq/shared';
import type { AnalyticsColumns } from './column-detection.js';
import {
  rowCategory,
  rowCost,
  rowDate,
  rowProductId,
  rowProductName,
  rowProfit,
  rowQuantity,
  rowReorderLevel,
  rowRevenue,
  rowStockLevel,
} from './row-metrics.js';
import { round2 } from './rounding.js';
import { monthKey } from './time-series.service.js';
import { toNumber } from '../datasets/value-helpers.js';

type Row = Record<string, unknown>;

// No universal definition of "low"/"overstock" exists without a
// reorder-point column — these are the fallback thresholds used when a
// dataset doesn't carry one. Documented here rather than left as magic
// numbers, since they're a judgment call, not a derived fact.
const LOW_STOCK_DEFAULT_THRESHOLD = 10;
const OVERSTOCK_MULTIPLIER = 3;
const OVERSTOCK_DEFAULT_THRESHOLD = 200;

interface InventorySnapshot {
  productId: string;
  productName: string;
  category: string | null;
  stockLevel: number;
  reorderLevel: number | null;
  revenueSum: number;
  quantitySum: number;
  unitPriceSum: number;
  unitPriceCount: number;
  hasStockReading: boolean;
}

// One row per distinct product carrying the most recent stock reading found
// for it — later rows for the same product OVERWRITE stockLevel rather than
// summing it, since summing repeated snapshots of the same SKU would count
// inventory that doesn't exist. Revenue/quantity/unit-price ARE summed
// across ALL of a product's rows regardless of whether that particular row
// carried a stock reading (a sales row without a stock column still
// contributes to that product's revenue) — `hasStockReading` is tracked
// separately and used only at the end to drop products with no stock data
// at all, so those accumulated totals are never lost along the way.
function buildInventorySnapshots(
  rows: Row[],
  columns: AnalyticsColumns,
): Map<string, InventorySnapshot> {
  const snapshots = new Map<string, InventorySnapshot>();

  for (const row of rows) {
    const productId = rowProductId(row, columns);
    if (!productId) {
      continue;
    }
    const stockLevel = rowStockLevel(row, columns);

    const snapshot = snapshots.get(productId) ?? {
      productId,
      productName: rowProductName(row, columns) ?? productId,
      category: rowCategory(row, columns),
      stockLevel: 0,
      reorderLevel: null,
      revenueSum: 0,
      quantitySum: 0,
      unitPriceSum: 0,
      unitPriceCount: 0,
      hasStockReading: false,
    };

    if (stockLevel !== null) {
      snapshot.stockLevel = stockLevel;
      snapshot.hasStockReading = true;
    }
    const reorderLevel = rowReorderLevel(row, columns);
    if (reorderLevel !== null) {
      snapshot.reorderLevel = reorderLevel;
    }

    const revenue = rowRevenue(row, columns);
    const quantity = rowQuantity(row, columns);
    if (revenue !== null) {
      snapshot.revenueSum += revenue;
    }
    if (quantity !== null) {
      snapshot.quantitySum += quantity;
    }
    if (columns.unitPrice) {
      const unitPrice = toNumber(row[columns.unitPrice]);
      if (unitPrice !== null) {
        snapshot.unitPriceSum += unitPrice;
        snapshot.unitPriceCount += 1;
      }
    }

    snapshots.set(productId, snapshot);
  }

  // A product that only ever appears in sales rows (no stock column ever
  // populated for it) isn't part of the inventory view at all.
  for (const [productId, snapshot] of snapshots) {
    if (!snapshot.hasStockReading) {
      snapshots.delete(productId);
    }
  }

  return snapshots;
}

function estimatedUnitValue(snapshot: InventorySnapshot): number | null {
  if (snapshot.unitPriceCount > 0) {
    return snapshot.unitPriceSum / snapshot.unitPriceCount;
  }
  if (snapshot.quantitySum > 0) {
    return snapshot.revenueSum / snapshot.quantitySum;
  }
  return null;
}

function classifyStatus(stockLevel: number, reorderLevel: number | null): StockStatus {
  const lowThreshold = reorderLevel ?? LOW_STOCK_DEFAULT_THRESHOLD;
  if (stockLevel <= lowThreshold) {
    return 'LOW';
  }
  const overstockThreshold =
    reorderLevel !== null ? reorderLevel * OVERSTOCK_MULTIPLIER : OVERSTOCK_DEFAULT_THRESHOLD;
  if (stockLevel >= overstockThreshold) {
    return 'OVERSTOCK';
  }
  return 'NORMAL';
}

export type InventoryAnalyticsResult = Omit<
  InventoryDashboardDto,
  'generatedAt' | 'datasetId' | 'datasetVersionId'
>;

export class InventoryAnalyticsService {
  // Simplified turnover: COGS over the *current* inventory value snapshot,
  // rather than an average-over-the-period inventory value — the latter
  // needs historical stock snapshots most single-export datasets won't
  // have. Documented in docs/ARCHITECTURE.md.
  calculateTurnover(rows: Row[], columns: AnalyticsColumns): number | null {
    const snapshots = [...buildInventorySnapshots(rows, columns).values()];
    if (snapshots.length === 0) {
      return null;
    }
    const inventoryValue = this.totalInventoryValue(snapshots);
    if (inventoryValue === null || inventoryValue === 0) {
      return null;
    }
    const cogs = this.calculateCogs(rows, columns);
    if (cogs === null) {
      return null;
    }
    return round2(cogs / inventoryValue);
  }

  build(rows: Row[], columns: AnalyticsColumns): InventoryAnalyticsResult {
    const snapshots = [...buildInventorySnapshots(rows, columns).values()];

    const stockLevels: StockLevelDto[] = snapshots
      .map((snapshot) => ({
        productId: snapshot.productId,
        productName: snapshot.productName,
        category: snapshot.category,
        stockLevel: snapshot.stockLevel,
        reorderLevel: snapshot.reorderLevel,
        status: classifyStatus(snapshot.stockLevel, snapshot.reorderLevel),
      }))
      .sort((a, b) => a.stockLevel - b.stockLevel);

    return {
      totalSkus: snapshots.length,
      totalInventoryValue: this.totalInventoryValue(snapshots),
      inventoryTurnover: this.calculateTurnover(rows, columns),
      lowStockProducts: stockLevels.filter((level) => level.status === 'LOW'),
      overstockProducts: stockLevels.filter((level) => level.status === 'OVERSTOCK'),
      stockLevels,
      categoryDistribution: this.getCategoryDistribution(snapshots),
      inventoryTrend: this.getInventoryTrend(rows, columns),
    };
  }

  private totalInventoryValue(snapshots: InventorySnapshot[]): number | null {
    let total = 0;
    let any = false;
    for (const snapshot of snapshots) {
      const unitValue = estimatedUnitValue(snapshot);
      if (unitValue === null) {
        continue;
      }
      total += snapshot.stockLevel * unitValue;
      any = true;
    }
    return any ? round2(total) : null;
  }

  private calculateCogs(rows: Row[], columns: AnalyticsColumns): number | null {
    if (columns.cost) {
      const costs = rows
        .map((row) => rowCost(row, columns))
        .filter((cost): cost is number => cost !== null);
      if (costs.length === 0) {
        return null;
      }
      return costs.reduce((sum, cost) => sum + cost, 0);
    }

    let total = 0;
    let found = false;
    for (const row of rows) {
      const revenue = rowRevenue(row, columns);
      const profit = rowProfit(row, columns);
      if (revenue !== null && profit !== null) {
        total += revenue - profit;
        found = true;
      }
    }
    return found ? total : null;
  }

  private getCategoryDistribution(snapshots: InventorySnapshot[]): CategoryValueDto[] {
    const totals = new Map<string, number>();
    for (const snapshot of snapshots) {
      if (!snapshot.category) {
        continue;
      }
      totals.set(snapshot.category, (totals.get(snapshot.category) ?? 0) + snapshot.stockLevel);
    }
    return [...totals.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);
  }

  private getInventoryTrend(rows: Row[], columns: AnalyticsColumns): TimeSeriesPointDto[] | null {
    if (!columns.stockLevel || !columns.orderDate) {
      return null;
    }
    const totals = new Map<string, number>();
    for (const row of rows) {
      const date = rowDate(row, columns);
      const stock = rowStockLevel(row, columns);
      if (!date || stock === null) {
        continue;
      }
      const key = monthKey(date);
      totals.set(key, (totals.get(key) ?? 0) + stock);
    }
    if (totals.size === 0) {
      return null;
    }
    return [...totals.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([period, value]) => ({ period, value: round2(value) }));
  }
}
