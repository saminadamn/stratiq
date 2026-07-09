import { describe, expect, it } from 'vitest';
import { InventoryAnalyticsService } from './inventory-analytics.service.js';
import { columns } from './test-fixtures.js';

const service = new InventoryAnalyticsService();

describe('InventoryAnalyticsService', () => {
  it('classifies stock levels as LOW/NORMAL/OVERSTOCK relative to reorder level', () => {
    const rows = [
      { productId: 'P1', stock: '2', reorder: '10', category: 'A' },
      { productId: 'P2', stock: '20', reorder: '10', category: 'A' },
      { productId: 'P3', stock: '100', reorder: '10', category: 'A' },
    ];
    const cols = columns({
      productId: 'productId',
      stockLevel: 'stock',
      reorderLevel: 'reorder',
      category: 'category',
    });
    const result = service.build(rows, cols);
    const statusById = Object.fromEntries(
      result.stockLevels.map((level) => [level.productId, level.status]),
    );
    expect(statusById['P1']).toBe('LOW');
    expect(statusById['P2']).toBe('NORMAL');
    expect(statusById['P3']).toBe('OVERSTOCK');
  });

  it('excludes products that never carry a stock reading', () => {
    const rows = [{ productId: 'P1', category: 'A' }];
    const cols = columns({ productId: 'productId', stockLevel: 'stock', category: 'category' });
    const result = service.build(rows, cols);
    expect(result.totalSkus).toBe(0);
  });

  it('estimates inventory value from stock level times an estimated unit price', () => {
    const rows = [{ productId: 'P1', stock: '10', revenue: '100', quantity: '10' }];
    const cols = columns({
      productId: 'productId',
      stockLevel: 'stock',
      revenue: 'revenue',
      quantity: 'quantity',
    });
    const result = service.build(rows, cols);
    // unit price ~ 100/10 = 10; inventory value = 10 stock * 10 = 100
    expect(result.totalInventoryValue).toBe(100);
  });

  it('computes turnover as COGS divided by inventory value', () => {
    const rows = [{ productId: 'P1', stock: '10', cost: '50', revenue: '100', quantity: '10' }];
    const cols = columns({
      productId: 'productId',
      stockLevel: 'stock',
      cost: 'cost',
      revenue: 'revenue',
      quantity: 'quantity',
    });
    const turnover = service.calculateTurnover(rows, cols);
    expect(turnover).toBe(0.5);
  });

  it('returns null turnover without cost/profit data', () => {
    const rows = [{ productId: 'P1', stock: '10', revenue: '100', quantity: '10' }];
    const cols = columns({
      productId: 'productId',
      stockLevel: 'stock',
      revenue: 'revenue',
      quantity: 'quantity',
    });
    expect(service.calculateTurnover(rows, cols)).toBeNull();
  });
});
