import type { TimeSeriesPointDto } from '@stratiq/shared';
import { describe, expect, it } from 'vitest';
import { TrendDetectionService } from './trend-detection.service.js';

const service = new TrendDetectionService();

function series(values: number[]): TimeSeriesPointDto[] {
  return values.map((value, index) => ({
    period: `2026-${String(index + 1).padStart(2, '0')}`,
    value,
  }));
}

describe('TrendDetectionService', () => {
  it('classifies a consistently rising series as INCREASING', () => {
    const result = service.analyze(series([100, 120, 140, 160]));
    expect(result.direction).toBe('INCREASING');
  });

  it('classifies a consistently falling series as DECLINING', () => {
    const result = service.analyze(series([160, 140, 120, 100]));
    expect(result.direction).toBe('DECLINING');
  });

  it('classifies a flat series as STABLE', () => {
    const result = service.analyze(series([100, 101, 99, 100]));
    expect(result.direction).toBe('STABLE');
  });

  it('classifies an alternating up/down series as SEASONAL', () => {
    const result = service.analyze(series([100, 150, 100, 150, 100]));
    expect(result.direction).toBe('SEASONAL');
  });

  it('returns STABLE with no outliers for fewer than two points', () => {
    const result = service.analyze(series([100]));
    expect(result.direction).toBe('STABLE');
    expect(result.averageChangePercent).toBeNull();
    expect(result.outliers).toEqual([]);
  });

  it('flags a point far from the mean as an outlier regardless of overall direction', () => {
    const result = service.analyze(series([100, 105, 102, 500, 98, 101]));
    expect(result.outliers.some((outlier) => outlier.value === 500)).toBe(true);
  });
});
