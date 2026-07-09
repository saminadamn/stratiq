import { describe, expect, it } from 'vitest';
import { calculateQualityScore } from './calculate-quality-score.js';

describe('calculateQualityScore', () => {
  it('returns 100 when there are no issues', () => {
    expect(calculateQualityScore([], 100)).toBe(100);
  });

  it('returns 0 for an empty dataset regardless of issues', () => {
    expect(calculateQualityScore([], 0)).toBe(0);
  });

  it('deducts proportionally to how much of the dataset an issue affects', () => {
    // WARNING weight is 15; affecting 10% of rows costs 1.5 points -> 98.5,
    // which Math.round takes up to 99.
    const score = calculateQualityScore(
      [{ code: 'X', message: 'x', count: 10, severity: 'WARNING' }],
      100,
    );
    expect(score).toBe(99);
  });

  it('never drops below 0 even with many severe issues', () => {
    const issues = Array.from({ length: 10 }, () => ({
      code: 'X',
      message: 'x',
      count: 100,
      severity: 'ERROR' as const,
    }));
    expect(calculateQualityScore(issues, 100)).toBe(0);
  });

  it('weighs ERROR more heavily than WARNING for the same impact ratio', () => {
    const errorScore = calculateQualityScore(
      [{ code: 'X', message: 'x', count: 100, severity: 'ERROR' }],
      100,
    );
    const warningScore = calculateQualityScore(
      [{ code: 'X', message: 'x', count: 100, severity: 'WARNING' }],
      100,
    );
    expect(errorScore).toBeLessThan(warningScore);
  });
});
