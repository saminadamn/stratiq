import { describe, expect, it } from 'vitest';
import { columns } from '../test-fixtures.js';
import { FeatureStoreService } from './feature-store.service.js';

const service = new FeatureStoreService();

describe('FeatureStoreService', () => {
  describe('buildCustomerFeatures', () => {
    it('computes recency relative to the latest order date in the data, not the system clock', () => {
      const rows = [
        { customerId: 'C1', date: '2024-01-01', revenue: 100 },
        { customerId: 'C2', date: '2024-01-31', revenue: 100 },
      ];
      const cols = columns({ customerId: 'customerId', orderDate: 'date', revenue: 'revenue' });

      const features = service.buildCustomerFeatures(rows, cols);
      const c1 = features.find((f) => f.customerId === 'C1');
      const c2 = features.find((f) => f.customerId === 'C2');

      expect(c2?.recencyDays).toBe(0);
      expect(c1?.recencyDays).toBe(30);
    });

    it('computes frequency, monetary, and average order value per customer', () => {
      const rows = [
        { customerId: 'C1', date: '2024-01-01', orderId: 'O1', revenue: 100 },
        { customerId: 'C1', date: '2024-01-15', orderId: 'O2', revenue: 200 },
      ];
      const cols = columns({
        customerId: 'customerId',
        orderDate: 'date',
        orderId: 'orderId',
        revenue: 'revenue',
      });

      const [feature] = service.buildCustomerFeatures(rows, cols);
      expect(feature?.frequency).toBe(2);
      expect(feature?.monetary).toBe(300);
      expect(feature?.avgOrderValue).toBe(150);
    });

    it('returns an empty array when there is no customer id column', () => {
      const rows = [{ revenue: 100 }];
      const cols = columns({ revenue: 'revenue' });
      expect(service.buildCustomerFeatures(rows, cols)).toEqual([]);
    });
  });

  describe('buildProductCatalog', () => {
    it('aggregates units sold and revenue per product', () => {
      const rows = [
        { productId: 'P1', quantity: 2, revenue: 100 },
        { productId: 'P1', quantity: 3, revenue: 150 },
      ];
      const cols = columns({ productId: 'productId', quantity: 'quantity', revenue: 'revenue' });

      const [product] = service.buildProductCatalog(rows, cols);
      expect(product?.unitsSold).toBe(5);
      expect(product?.revenue).toBe(250);
    });
  });

  describe('buildCustomerPurchases', () => {
    it('groups distinct purchased product ids per customer', () => {
      const rows = [
        { customerId: 'C1', productId: 'P1' },
        { customerId: 'C1', productId: 'P1' },
        { customerId: 'C1', productId: 'P2' },
      ];
      const cols = columns({ customerId: 'customerId', productId: 'productId' });

      const [purchases] = service.buildCustomerPurchases(rows, cols);
      expect(purchases?.customerId).toBe('C1');
      expect(purchases?.productIds.sort()).toEqual(['P1', 'P2']);
    });

    it('returns an empty array without both a customer and a product column', () => {
      const rows = [{ customerId: 'C1' }];
      const cols = columns({ customerId: 'customerId' });
      expect(service.buildCustomerPurchases(rows, cols)).toEqual([]);
    });
  });
});
