import type { AnalyticsColumns } from '../column-detection.js';
import { calculateActiveCustomers } from './active-customers.kpi.js';
import { calculateAverageOrderValue } from './average-order-value.kpi.js';
import { calculateCustomerLifetimeValue } from './customer-lifetime-value.kpi.js';
import { calculateGrossProfit } from './gross-profit.kpi.js';
import { calculateMonthlyGrowthRate } from './monthly-growth-rate.kpi.js';
import { calculateTotalOrders } from './orders.kpi.js';
import { calculateProfitMargin } from './profit-margin.kpi.js';
import { calculateRepeatPurchaseRate } from './repeat-purchase-rate.kpi.js';
import { calculateRevenue } from './revenue.kpi.js';

export type KpiUnit = 'CURRENCY' | 'PERCENTAGE' | 'COUNT';

// One entry per KPI: name, description, and unit alongside the calculation
// itself — everything a future Metrics Registry (name/description/formula/
// SQL source/unit/refresh policy, per the roadmap note) would need to wrap,
// without this sprint building the SQL-source/refresh-policy machinery that
// doesn't have a consumer yet. Top Products and Inventory Turnover aren't
// listed here even though they're "KPIs" conceptually — they're computed by
// ProductAnalyticsService/InventoryAnalyticsService (which already own the
// per-product grouping logic those need) and merged in by
// GetKpiSummaryUseCase, rather than duplicating that grouping here.
export interface KpiDefinition {
  key: string;
  label: string;
  description: string;
  unit: KpiUnit;
  calculate: (rows: Array<Record<string, unknown>>, columns: AnalyticsColumns) => number | null;
}

export const KPI_REGISTRY: KpiDefinition[] = [
  {
    key: 'revenue',
    label: 'Revenue',
    description: 'Sum of revenue (or quantity × unit price) across all rows.',
    unit: 'CURRENCY',
    calculate: calculateRevenue,
  },
  {
    key: 'totalOrders',
    label: 'Total Orders',
    description: 'Count of distinct orders, or rows if no order id column exists.',
    unit: 'COUNT',
    calculate: calculateTotalOrders,
  },
  {
    key: 'averageOrderValue',
    label: 'Average Order Value',
    description: 'Revenue divided by total orders.',
    unit: 'CURRENCY',
    calculate: calculateAverageOrderValue,
  },
  {
    key: 'grossProfit',
    label: 'Gross Profit',
    description: 'Sum of profit (or revenue − cost) across all rows.',
    unit: 'CURRENCY',
    calculate: calculateGrossProfit,
  },
  {
    key: 'profitMargin',
    label: 'Profit Margin',
    description: 'Gross profit as a percentage of revenue.',
    unit: 'PERCENTAGE',
    calculate: calculateProfitMargin,
  },
  {
    key: 'repeatPurchaseRate',
    label: 'Repeat Purchase Rate',
    description: 'Percentage of customers with more than one order.',
    unit: 'PERCENTAGE',
    calculate: calculateRepeatPurchaseRate,
  },
  {
    key: 'activeCustomers',
    label: 'Active Customers',
    description: 'Count of distinct customers appearing in the (filtered) data.',
    unit: 'COUNT',
    calculate: calculateActiveCustomers,
  },
  {
    key: 'customerLifetimeValue',
    label: 'Customer Lifetime Value',
    description: 'Revenue divided by the number of distinct customers.',
    unit: 'CURRENCY',
    calculate: calculateCustomerLifetimeValue,
  },
  {
    key: 'monthlyGrowthRate',
    label: 'Monthly Growth Rate',
    description:
      'Percentage revenue change between the two most recent months present in the data.',
    unit: 'PERCENTAGE',
    calculate: calculateMonthlyGrowthRate,
  },
];
