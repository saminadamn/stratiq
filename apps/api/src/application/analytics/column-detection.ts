import type { ColumnSchema } from '../../domain/entities/column-schema.entity.js';
import { findColumnByPattern } from '../datasets/column-matching.js';

// The full set of business-data column roles the analytics engine can use.
// Every downstream KPI/service treats each field as optional — a null here
// just means that particular calculation gracefully returns null/empty
// instead of guessing from the wrong column (same philosophy as Sprint 2's
// feature engineering column-detection.ts, extended with product/inventory
// roles this sprint needs).
export interface AnalyticsColumns {
  revenue: string | null;
  cost: string | null;
  profit: string | null;
  customerId: string | null;
  customerName: string | null;
  orderId: string | null;
  orderDate: string | null;
  productId: string | null;
  productName: string | null;
  category: string | null;
  region: string | null;
  quantity: string | null;
  unitPrice: string | null;
  stockLevel: string | null;
  reorderLevel: string | null;
}

const PATTERNS = {
  revenue: /revenue|sales|total.?amount|order.?value|^amount$/i,
  cost: /^cost$|cogs|cost.?of.?goods/i,
  profit: /^profit$|gross.?profit|net.?profit/i,
  customerId: /customer.?id|client.?id/i,
  customerName: /customer.?name|client.?name/i,
  orderId: /order.?id|transaction.?id|invoice.?id/i,
  orderDate: /order.?date|transaction.?date|purchase.?date|^date$/i,
  productId: /product.?id|^sku$|item.?id/i,
  productName: /product.?name|item.?name|^product$/i,
  category: /category/i,
  region: /region|^state$|^country$|location/i,
  quantity: /quantity|^qty$|units.?sold/i,
  unitPrice: /unit.?price|^price$/i,
  stockLevel: /stock.?level|stock.?on.?hand|inventory.?level|quantity.?on.?hand|^stock$|on.?hand/i,
  reorderLevel: /reorder|min.?stock|reorder.?point|safety.?stock/i,
} as const;

export function detectAnalyticsColumns(schema: ColumnSchema[]): AnalyticsColumns {
  return {
    revenue: findColumnByPattern(schema, PATTERNS.revenue, 'NUMBER'),
    cost: findColumnByPattern(schema, PATTERNS.cost, 'NUMBER'),
    profit: findColumnByPattern(schema, PATTERNS.profit, 'NUMBER'),
    customerId: findColumnByPattern(schema, PATTERNS.customerId),
    customerName: findColumnByPattern(schema, PATTERNS.customerName),
    orderId: findColumnByPattern(schema, PATTERNS.orderId),
    orderDate: findColumnByPattern(schema, PATTERNS.orderDate, 'DATE'),
    productId: findColumnByPattern(schema, PATTERNS.productId),
    productName: findColumnByPattern(schema, PATTERNS.productName),
    category: findColumnByPattern(schema, PATTERNS.category),
    region: findColumnByPattern(schema, PATTERNS.region),
    quantity: findColumnByPattern(schema, PATTERNS.quantity, 'NUMBER'),
    unitPrice: findColumnByPattern(schema, PATTERNS.unitPrice, 'NUMBER'),
    stockLevel: findColumnByPattern(schema, PATTERNS.stockLevel, 'NUMBER'),
    reorderLevel: findColumnByPattern(schema, PATTERNS.reorderLevel, 'NUMBER'),
  };
}
