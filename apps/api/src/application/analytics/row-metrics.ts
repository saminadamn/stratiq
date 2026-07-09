import { isBlank, toNumber } from '../datasets/value-helpers.js';
import type { AnalyticsColumns } from './column-detection.js';

type Row = Record<string, unknown>;

// The single place every KPI/service reads a derived value from a row.
// Nothing outside this file should read row[columns.revenue] etc. directly —
// that's what would let "how do we compute revenue" drift between the KPI
// engine, the executive dashboard, and product analytics. This is also
// exactly the seed of the Metrics Registry: one named calculation per
// business concept, reusable everywhere.

export function rowRevenue(row: Row, columns: AnalyticsColumns): number | null {
  if (columns.revenue) {
    return toNumber(row[columns.revenue]);
  }
  // No explicit revenue column: fall back to quantity * unit price, the
  // shape a raw line-items export is more likely to have.
  if (columns.quantity && columns.unitPrice) {
    const quantity = toNumber(row[columns.quantity]);
    const unitPrice = toNumber(row[columns.unitPrice]);
    if (quantity !== null && unitPrice !== null) {
      return quantity * unitPrice;
    }
  }
  return null;
}

export function rowCost(row: Row, columns: AnalyticsColumns): number | null {
  if (!columns.cost) {
    return null;
  }
  return toNumber(row[columns.cost]);
}

export function rowProfit(row: Row, columns: AnalyticsColumns): number | null {
  if (columns.profit) {
    return toNumber(row[columns.profit]);
  }
  const revenue = rowRevenue(row, columns);
  const cost = rowCost(row, columns);
  if (revenue !== null && cost !== null) {
    return revenue - cost;
  }
  return null;
}

export function rowQuantity(row: Row, columns: AnalyticsColumns): number | null {
  if (!columns.quantity) {
    return null;
  }
  return toNumber(row[columns.quantity]);
}

export function rowStockLevel(row: Row, columns: AnalyticsColumns): number | null {
  if (!columns.stockLevel) {
    return null;
  }
  return toNumber(row[columns.stockLevel]);
}

export function rowReorderLevel(row: Row, columns: AnalyticsColumns): number | null {
  if (!columns.reorderLevel) {
    return null;
  }
  return toNumber(row[columns.reorderLevel]);
}

export function rowDate(row: Row, columns: AnalyticsColumns): Date | null {
  if (!columns.orderDate) {
    return null;
  }
  const raw = row[columns.orderDate];
  if (isBlank(raw)) {
    return null;
  }
  const date = raw instanceof Date ? raw : new Date(raw as string | number);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function rowCustomerId(row: Row, columns: AnalyticsColumns): string | null {
  if (!columns.customerId) {
    return null;
  }
  const value = row[columns.customerId];
  return isBlank(value) ? null : String(value);
}

export function rowOrderId(row: Row, columns: AnalyticsColumns): string | null {
  if (!columns.orderId) {
    return null;
  }
  const value = row[columns.orderId];
  return isBlank(value) ? null : String(value);
}

export function rowProductId(row: Row, columns: AnalyticsColumns): string | null {
  // Falls back to product NAME as the identity key when there's no separate
  // id column — a row with a product name but no SKU is still one product.
  const idColumn = columns.productId ?? columns.productName;
  if (!idColumn) {
    return null;
  }
  const value = row[idColumn];
  return isBlank(value) ? null : String(value);
}

export function rowProductName(row: Row, columns: AnalyticsColumns): string | null {
  const nameColumn = columns.productName ?? columns.productId;
  if (!nameColumn) {
    return null;
  }
  const value = row[nameColumn];
  return isBlank(value) ? null : String(value);
}

export function rowCustomerName(row: Row, columns: AnalyticsColumns): string | null {
  const nameColumn = columns.customerName ?? columns.customerId;
  if (!nameColumn) {
    return null;
  }
  const value = row[nameColumn];
  return isBlank(value) ? null : String(value);
}

export function rowCategory(row: Row, columns: AnalyticsColumns): string | null {
  if (!columns.category) {
    return null;
  }
  const value = row[columns.category];
  return isBlank(value) ? null : String(value);
}

export function rowRegion(row: Row, columns: AnalyticsColumns): string | null {
  if (!columns.region) {
    return null;
  }
  const value = row[columns.region];
  return isBlank(value) ? null : String(value);
}
