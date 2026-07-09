import { describe, expect, it } from 'vitest';
import { ProductAnalyticsService } from './product-analytics.service.js';
import { columns } from './test-fixtures.js';

const service = new ProductAnalyticsService();

describe('ProductAnalyticsService', () => {
  it('ranks best and worst sellers by revenue', () => {
    const rows = [
      { productId: 'P1', revenue: '500', profit: '100', category: 'A' },
      { productId: 'P2', revenue: '50', profit: '10', category: 'B' },
    ];
    const cols = columns({
      productId: 'productId',
      revenue: 'revenue',
      profit: 'profit',
      category: 'category',
    });
    const result = service.build(rows, cols);
    expect(result.bestSellers[0]?.productId).toBe('P1');
    expect(result.worstSellers[0]?.productId).toBe('P2');
  });

  it('aggregates category performance by summed revenue', () => {
    const rows = [
      { productId: 'P1', revenue: '100', category: 'A' },
      { productId: 'P2', revenue: '200', category: 'A' },
      { productId: 'P3', revenue: '50', category: 'B' },
    ];
    const cols = columns({ productId: 'productId', revenue: 'revenue', category: 'category' });
    const result = service.build(rows, cols);
    expect(result.categoryPerformance).toEqual([
      { label: 'A', value: 300 },
      { label: 'B', value: 50 },
    ]);
  });

  it('computes product contribution as a percentage of total revenue', () => {
    const rows = [
      { productId: 'P1', revenue: '75' },
      { productId: 'P2', revenue: '25' },
    ];
    const cols = columns({ productId: 'productId', revenue: 'revenue' });
    const result = service.build(rows, cols);
    expect(result.productContribution).toEqual([
      { label: 'P1', value: 75 },
      { label: 'P2', value: 25 },
    ]);
  });

  it('exposes getTopProducts for reuse by the KPI engine', () => {
    const rows = [
      { productId: 'P1', revenue: '500' },
      { productId: 'P2', revenue: '50' },
    ];
    const cols = columns({ productId: 'productId', revenue: 'revenue' });
    const top = service.getTopProducts(rows, cols, 1);
    expect(top).toHaveLength(1);
    expect(top[0]?.productId).toBe('P1');
  });
});
