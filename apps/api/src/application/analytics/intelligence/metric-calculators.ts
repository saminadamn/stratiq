import type { AnalyticsColumns } from '../column-detection.js';
import type { InventoryAnalyticsService } from '../inventory-analytics.service.js';
import { calculateActiveCustomers } from '../kpis/active-customers.kpi.js';
import { calculateAverageOrderValue } from '../kpis/average-order-value.kpi.js';
import { calculateCustomerLifetimeValue } from '../kpis/customer-lifetime-value.kpi.js';
import { calculateGrossProfit } from '../kpis/gross-profit.kpi.js';
import { calculateMonthlyGrowthRate } from '../kpis/monthly-growth-rate.kpi.js';
import { calculateTotalOrders } from '../kpis/orders.kpi.js';
import { calculateProfitMargin } from '../kpis/profit-margin.kpi.js';
import { calculateRepeatPurchaseRate } from '../kpis/repeat-purchase-rate.kpi.js';
import { calculateRevenue } from '../kpis/revenue.kpi.js';

export type MetricCalculator = (
  rows: Array<Record<string, unknown>>,
  columns: AnalyticsColumns,
) => number | null;

// The Metrics Registry (MetricDefinition, in Postgres) is metadata only —
// name/description/category/unit/owner. The actual computation for each
// metric key is this map, reusing Sprint 3's KPI calculators directly rather
// than re-implementing "how do we compute revenue" a second time. Only
// inventoryTurnover needs a service instance (it groups by product, which
// InventoryAnalyticsService already owns), so this is a factory rather than
// a static constant.
export function buildMetricCalculators(
  inventoryAnalytics: InventoryAnalyticsService,
): Record<string, MetricCalculator> {
  return {
    revenue: calculateRevenue,
    totalOrders: calculateTotalOrders,
    averageOrderValue: calculateAverageOrderValue,
    grossProfit: calculateGrossProfit,
    profitMargin: calculateProfitMargin,
    repeatPurchaseRate: calculateRepeatPurchaseRate,
    activeCustomers: calculateActiveCustomers,
    customerLifetimeValue: calculateCustomerLifetimeValue,
    monthlyGrowthRate: calculateMonthlyGrowthRate,
    inventoryTurnover: (rows, columns) => inventoryAnalytics.calculateTurnover(rows, columns),
  };
}
