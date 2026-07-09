import { toNumber } from '../value-helpers.js';
import type { DetectedColumns } from './column-detection.js';

export interface ComputedFeature {
  name: string;
  label: string;
  value: unknown;
}

type Row = Record<string, unknown>;

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function numericValues(rows: Row[], column: string): number[] {
  return rows
    .map((row) => toNumber(row[column]))
    .filter((value): value is number => value !== null);
}

export function computeTotalRevenue(
  rows: Row[],
  detected: DetectedColumns,
): ComputedFeature | null {
  if (!detected.revenue) {
    return null;
  }
  const values = numericValues(rows, detected.revenue);
  if (values.length === 0) {
    return null;
  }
  return { name: 'total_revenue', label: 'Total Revenue', value: round2(sum(values)) };
}

export function computeAverageOrderValue(
  rows: Row[],
  detected: DetectedColumns,
): ComputedFeature | null {
  if (!detected.revenue) {
    return null;
  }
  const values = numericValues(rows, detected.revenue);
  if (values.length === 0) {
    return null;
  }

  // Without an order id, each row is treated as one order — the closest
  // available proxy for "number of orders" in a flat transactions table.
  const orderCount = detected.orderId
    ? new Set(rows.map((row) => row[detected.orderId as string])).size
    : values.length;
  if (orderCount === 0) {
    return null;
  }

  return {
    name: 'average_order_value',
    label: 'Average Order Value',
    value: round2(sum(values) / orderCount),
  };
}

export function computeCustomerLifetimeValue(
  rows: Row[],
  detected: DetectedColumns,
): ComputedFeature | null {
  if (!detected.revenue || !detected.customerId) {
    return null;
  }
  const values = numericValues(rows, detected.revenue);
  if (values.length === 0) {
    return null;
  }

  const customerCount = new Set(rows.map((row) => row[detected.customerId as string])).size;
  if (customerCount === 0) {
    return null;
  }

  return {
    name: 'customer_lifetime_value',
    label: 'Customer Lifetime Value',
    value: round2(sum(values) / customerCount),
  };
}

export function computeRepeatPurchaseRate(
  rows: Row[],
  detected: DetectedColumns,
): ComputedFeature | null {
  if (!detected.customerId) {
    return null;
  }

  // Each customer maps to the set of distinct "orders" they made. With no
  // order id column, each row object itself stands in for one order — since
  // every row is a distinct object reference, this still counts row-per-
  // customer correctly as a fallback proxy for order count.
  const ordersByCustomer = new Map<unknown, Set<unknown>>();
  for (const row of rows) {
    const customerId = row[detected.customerId];
    if (customerId === null || customerId === undefined) {
      continue;
    }
    const orderKey = detected.orderId ? row[detected.orderId] : row;
    const orders = ordersByCustomer.get(customerId) ?? new Set<unknown>();
    orders.add(orderKey);
    ordersByCustomer.set(customerId, orders);
  }

  const totalCustomers = ordersByCustomer.size;
  if (totalCustomers === 0) {
    return null;
  }

  const repeatCustomers = [...ordersByCustomer.values()].filter((orders) => orders.size > 1).length;

  return {
    name: 'repeat_purchase_rate',
    label: 'Repeat Purchase Rate',
    value: round2((repeatCustomers / totalCustomers) * 100),
  };
}

export function computeProfitMargin(
  rows: Row[],
  detected: DetectedColumns,
): ComputedFeature | null {
  if (!detected.revenue || !detected.profit) {
    return null;
  }

  const totalRevenue = sum(numericValues(rows, detected.revenue));
  if (totalRevenue === 0) {
    return null;
  }
  const totalProfit = sum(numericValues(rows, detected.profit));

  return {
    name: 'profit_margin',
    label: 'Profit Margin',
    value: round2((totalProfit / totalRevenue) * 100),
  };
}

function parseRowDate(row: Row, column: string): Date | null {
  const raw = row[column];
  if (typeof raw !== 'string' && !(raw instanceof Date)) {
    return null;
  }
  const date = raw instanceof Date ? raw : new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function quarterKey(date: Date): string {
  const quarter = Math.floor(date.getUTCMonth() / 3) + 1;
  return `${date.getUTCFullYear()}-Q${quarter}`;
}

function revenueByPeriod(
  rows: Row[],
  detected: DetectedColumns,
  keyFor: (date: Date) => string,
): Map<string, number> {
  const totals = new Map<string, number>();
  if (!detected.revenue || !detected.orderDate) {
    return totals;
  }

  for (const row of rows) {
    const revenue = toNumber(row[detected.revenue]);
    const date = parseRowDate(row, detected.orderDate);
    if (revenue === null || date === null) {
      continue;
    }
    const key = keyFor(date);
    totals.set(key, (totals.get(key) ?? 0) + revenue);
  }
  return totals;
}

export function computeMonthlyRevenue(
  rows: Row[],
  detected: DetectedColumns,
): ComputedFeature | null {
  const totals = revenueByPeriod(rows, detected, monthKey);
  if (totals.size === 0) {
    return null;
  }

  const series = [...totals.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, revenue]) => ({ month, revenue: round2(revenue) }));

  return { name: 'monthly_revenue', label: 'Monthly Revenue', value: series };
}

export function computeQuarterlyGrowth(
  rows: Row[],
  detected: DetectedColumns,
): ComputedFeature | null {
  const totals = revenueByPeriod(rows, detected, quarterKey);
  const quarters = [...totals.entries()].sort(([a], [b]) => a.localeCompare(b));
  // Growth is a period-over-period comparison — meaningless with fewer than
  // two periods of data.
  if (quarters.length < 2) {
    return null;
  }

  const series = quarters.map(([quarter, revenue], index) => {
    const previousEntry = index > 0 ? quarters[index - 1] : undefined;
    const previousRevenue = previousEntry ? previousEntry[1] : null;
    const growthPercent =
      previousRevenue !== null && previousRevenue !== 0
        ? round2(((revenue - previousRevenue) / previousRevenue) * 100)
        : null;
    return { quarter, revenue: round2(revenue), growthPercent };
  });

  return { name: 'quarterly_growth', label: 'Quarterly Growth', value: series };
}
