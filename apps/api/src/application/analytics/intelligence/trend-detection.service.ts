import type { TimeSeriesPointDto, TrendDirection } from '@stratiq/shared';
import { round2 } from '../rounding.js';

export interface TrendOutlier {
  period: string;
  value: number;
  zScore: number;
}

export interface TrendAnalysisResult {
  direction: TrendDirection;
  averageChangePercent: number | null;
  outliers: TrendOutlier[];
}

// Thresholds are judgment calls, not derived facts — documented here rather
// than left as magic numbers so a future tuning pass knows what it's
// adjusting and why.
const STABLE_THRESHOLD_PERCENT = 5;
const OUTLIER_Z_SCORE_THRESHOLD = 2;
const MIN_CHANGES_FOR_SEASONALITY = 4;
// A "zigzag" (up, down, up, down, ...) is the simplest rule-based signal of
// seasonality without historical year-over-year data to correlate against —
// this fraction of consecutive sign flips is what counts as "zigzag enough."
const SEASONALITY_ALTERNATION_RATIO = 0.6;

// Deterministic, rule-based classification — no ML per this sprint's
// explicit requirement. Outlier detection (z-score) is independent of the
// direction classification: a series can be "Increasing" overall and still
// have one anomalous point flagged.
export class TrendDetectionService {
  analyze(series: TimeSeriesPointDto[]): TrendAnalysisResult {
    const outliers = this.detectOutliers(series);

    if (series.length < 2) {
      return { direction: 'STABLE', averageChangePercent: null, outliers };
    }

    const changes: number[] = [];
    for (let i = 1; i < series.length; i += 1) {
      const previous = series[i - 1] as TimeSeriesPointDto;
      const current = series[i] as TimeSeriesPointDto;
      if (previous.value === 0) {
        continue;
      }
      changes.push(((current.value - previous.value) / previous.value) * 100);
    }

    if (changes.length === 0) {
      return { direction: 'STABLE', averageChangePercent: null, outliers };
    }

    const average = changes.reduce((sum, change) => sum + change, 0) / changes.length;

    if (this.isSeasonal(changes)) {
      return { direction: 'SEASONAL', averageChangePercent: round2(average), outliers };
    }

    let direction: TrendDirection = 'STABLE';
    if (average > STABLE_THRESHOLD_PERCENT) {
      direction = 'INCREASING';
    } else if (average < -STABLE_THRESHOLD_PERCENT) {
      direction = 'DECLINING';
    }

    return { direction, averageChangePercent: round2(average), outliers };
  }

  private isSeasonal(changes: number[]): boolean {
    if (changes.length < MIN_CHANGES_FOR_SEASONALITY) {
      return false;
    }
    let alternations = 0;
    for (let i = 1; i < changes.length; i += 1) {
      const previousSign = Math.sign(changes[i - 1] as number);
      const currentSign = Math.sign(changes[i] as number);
      if (previousSign !== 0 && currentSign !== 0 && previousSign !== currentSign) {
        alternations += 1;
      }
    }
    return alternations / (changes.length - 1) >= SEASONALITY_ALTERNATION_RATIO;
  }

  private detectOutliers(series: TimeSeriesPointDto[]): TrendOutlier[] {
    if (series.length === 0) {
      return [];
    }
    const values = series.map((point) => point.value);
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
    const stddev = Math.sqrt(variance);
    if (stddev === 0) {
      return [];
    }

    return series
      .map((point) => ({
        period: point.period,
        value: point.value,
        zScore: round2((point.value - mean) / stddev),
      }))
      .filter((point) => Math.abs(point.zScore) > OUTLIER_Z_SCORE_THRESHOLD);
  }
}
