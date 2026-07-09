import { describe, expect, it } from 'vitest';
import { AggregationService } from './aggregation.service.js';
import { columns } from './test-fixtures.js';

const service = new AggregationService();

describe('AggregationService', () => {
  it('sums revenue by category, sorted descending', () => {
    const rows = [
      { category: 'A', revenue: '100' },
      { category: 'B', revenue: '300' },
      { category: 'A', revenue: '50' },
    ];
    const result = service.revenueByCategory(
      rows,
      columns({ category: 'category', revenue: 'revenue' }),
    );
    expect(result).toEqual([
      { label: 'B', value: 300 },
      { label: 'A', value: 150 },
    ]);
  });

  it('returns an empty array when there is no category column', () => {
    expect(
      service.revenueByCategory([{ revenue: '100' }], columns({ revenue: 'revenue' })),
    ).toEqual([]);
  });

  it('sums revenue by region', () => {
    const rows = [
      { region: 'West', revenue: '10' },
      { region: 'East', revenue: '20' },
    ];
    const result = service.revenueByRegion(rows, columns({ region: 'region', revenue: 'revenue' }));
    expect(result).toEqual([
      { label: 'East', value: 20 },
      { label: 'West', value: 10 },
    ]);
  });
});
