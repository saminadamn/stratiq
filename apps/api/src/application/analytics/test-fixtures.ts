import type { AnalyticsColumns } from './column-detection.js';

const DEFAULT_COLUMNS: AnalyticsColumns = {
  revenue: null,
  cost: null,
  profit: null,
  customerId: null,
  customerName: null,
  orderId: null,
  orderDate: null,
  productId: null,
  productName: null,
  category: null,
  region: null,
  quantity: null,
  unitPrice: null,
  stockLevel: null,
  reorderLevel: null,
};

// Shared by every analytics unit test: start from "no columns detected" and
// override only the ones a given test needs, so each test's fixture reads as
// "this dataset has X and Y" rather than repeating all fifteen fields.
export function columns(overrides: Partial<AnalyticsColumns> = {}): AnalyticsColumns {
  return { ...DEFAULT_COLUMNS, ...overrides };
}
