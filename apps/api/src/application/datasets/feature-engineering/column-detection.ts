import type { ColumnSchema } from '../../../domain/entities/column-schema.entity.js';
import { findColumnByPattern } from '../column-matching.js';

export interface DetectedColumns {
  revenue: string | null;
  profit: string | null;
  customerId: string | null;
  orderId: string | null;
  orderDate: string | null;
}

// Heuristic, name-based detection — there's no fixed schema for uploaded
// business data, so feature engineering has to guess which column plays
// which business role from naming conventions. Each metric downstream only
// computes if the columns it needs were actually found (see
// feature-engineering.service.ts), so a wrong guess just means a metric is
// skipped, never a wrong value silently computed from the wrong column.
const PATTERNS = {
  revenue: /revenue|sales|total.?amount|order.?value|amount/i,
  profit: /profit|margin/i,
  customerId: /customer.?id|client.?id/i,
  orderId: /order.?id|transaction.?id|invoice.?id/i,
  orderDate: /order.?date|transaction.?date|purchase.?date|^date$/i,
} as const;

export function detectColumns(schema: ColumnSchema[]): DetectedColumns {
  return {
    revenue: findColumnByPattern(schema, PATTERNS.revenue, 'NUMBER'),
    profit: findColumnByPattern(schema, PATTERNS.profit, 'NUMBER'),
    customerId: findColumnByPattern(schema, PATTERNS.customerId),
    orderId: findColumnByPattern(schema, PATTERNS.orderId),
    orderDate: findColumnByPattern(schema, PATTERNS.orderDate, 'DATE'),
  };
}
