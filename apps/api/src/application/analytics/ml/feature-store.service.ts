import type { AnalyticsColumns } from '../column-detection.js';
import { buildCustomerAggregates } from '../customer-analytics.service.js';
import { buildProductAggregates } from '../product-analytics.service.js';
import { rowCustomerId, rowProductId } from '../row-metrics.js';
import { round2 } from '../rounding.js';

type Row = Record<string, unknown>;

export interface CustomerFeatureVector {
  customerId: string;
  customerName: string | null;
  recencyDays: number;
  frequency: number;
  monetary: number;
  avgOrderValue: number;
}

export interface ProductFeatureVector {
  productId: string;
  productName: string | null;
  category: string | null;
  unitsSold: number;
  revenue: number;
}

export interface CustomerPurchaseRecord {
  customerId: string;
  productIds: string[];
}

const MS_PER_DAY = 1000 * 60 * 60 * 24;

// The Feature Store: every ML model that needs customer- or product-level
// features reads from here, built on top of the exact same per-customer/
// per-product aggregates the Customer/Product dashboards already compute
// (buildCustomerAggregates, buildProductAggregates) — not a second
// definition of "what is a customer's total spend." Recomputing these is a
// cheap linear pass over already-loaded rows (no training involved), so
// callers rebuild on every request rather than caching; MlFeatureSnapshot
// persists the result purely as an inspectable audit trail, not a
// performance cache.
export class FeatureStoreService {
  buildCustomerFeatures(rows: Row[], columns: AnalyticsColumns): CustomerFeatureVector[] {
    const aggregates = [...buildCustomerAggregates(rows, columns).values()];
    if (aggregates.length === 0) {
      return [];
    }

    const latestOrderDate = aggregates.reduce<Date | null>((latest, customer) => {
      if (!customer.lastOrderDate) {
        return latest;
      }
      return !latest || customer.lastOrderDate > latest ? customer.lastOrderDate : latest;
    }, null);

    return aggregates.map((customer) => {
      const frequency = customer.orderKeys.size;
      const recencyDays = latestOrderDate && customer.lastOrderDate
        ? Math.max(0, Math.round((latestOrderDate.getTime() - customer.lastOrderDate.getTime()) / MS_PER_DAY))
        : 0;
      return {
        customerId: customer.customerId,
        customerName: customer.customerName,
        recencyDays,
        frequency,
        monetary: round2(customer.totalSpent),
        avgOrderValue: frequency > 0 ? round2(customer.totalSpent / frequency) : 0,
      };
    });
  }

  buildProductCatalog(rows: Row[], columns: AnalyticsColumns): ProductFeatureVector[] {
    return [...buildProductAggregates(rows, columns).values()].map((product) => ({
      productId: product.productId,
      productName: product.productName,
      category: product.category,
      unitsSold: product.unitsSold,
      revenue: round2(product.revenue),
    }));
  }

  buildCustomerPurchases(rows: Row[], columns: AnalyticsColumns): CustomerPurchaseRecord[] {
    if (!columns.customerId || !columns.productId && !columns.productName) {
      return [];
    }
    const purchases = new Map<string, Set<string>>();
    for (const row of rows) {
      const customerId = rowCustomerId(row, columns);
      const productId = rowProductId(row, columns);
      if (!customerId || !productId) {
        continue;
      }
      const products = purchases.get(customerId) ?? new Set<string>();
      products.add(productId);
      purchases.set(customerId, products);
    }
    return [...purchases.entries()].map(([customerId, productIds]) => ({
      customerId,
      productIds: [...productIds],
    }));
  }
}
