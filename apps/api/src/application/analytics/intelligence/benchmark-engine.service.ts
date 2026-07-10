import type { BenchmarkPeriod } from '@stratiq/shared';
import type { AnalyticsColumns } from '../column-detection.js';
import { rowDate } from '../row-metrics.js';
import { round2 } from '../rounding.js';
import {
  addMonthsUTC,
  addQuartersUTC,
  addYearsUTC,
  endOfMonthUTC,
  endOfQuarterUTC,
  endOfYearUTC,
  monthLabel,
  quarterLabel,
  startOfMonthUTC,
  startOfQuarterUTC,
  startOfYearUTC,
  yearLabel,
  type DateRange,
} from './date-periods.js';
import type { MetricCalculator } from './metric-calculators.js';

type Row = Record<string, unknown>;

export interface BenchmarkResult {
  metricKey: string;
  period: BenchmarkPeriod;
  currentPeriodLabel: string;
  previousPeriodLabel: string;
  currentValue: number | null;
  previousValue: number | null;
  changeAbsolute: number | null;
  changePercent: number | null;
}

interface PeriodPlan {
  currentLabel: string;
  previousLabel: string;
  currentRange: DateRange;
  previousRange: DateRange;
}

// "Current" isn't today's calendar date — it's the most recent period
// actually present in the dataset. Using the system clock would make
// benchmarks silently go empty for any historical/demo dataset whose dates
// don't reach up to "now," which is the common case here.
export class BenchmarkEngineService {
  compare(
    rows: Row[],
    columns: AnalyticsColumns,
    metricKey: string,
    calculator: MetricCalculator,
    period: BenchmarkPeriod,
  ): BenchmarkResult | null {
    if (!columns.orderDate) {
      return null;
    }

    const dated = rows
      .map((row) => ({ row, date: rowDate(row, columns) }))
      .filter((entry): entry is { row: Row; date: Date } => entry.date !== null);
    if (dated.length === 0) {
      return null;
    }

    const latestDate = dated.reduce(
      (latest, entry) => (entry.date > latest ? entry.date : latest),
      dated[0]!.date,
    );
    const plan = this.planPeriods(latestDate, period);

    const currentRows = dated
      .filter(
        (entry) => entry.date >= plan.currentRange.start && entry.date <= plan.currentRange.end,
      )
      .map((entry) => entry.row);
    const previousRows = dated
      .filter(
        (entry) => entry.date >= plan.previousRange.start && entry.date <= plan.previousRange.end,
      )
      .map((entry) => entry.row);

    const currentValue = currentRows.length > 0 ? calculator(currentRows, columns) : null;
    const previousValue = previousRows.length > 0 ? calculator(previousRows, columns) : null;

    const changeAbsolute =
      currentValue !== null && previousValue !== null ? round2(currentValue - previousValue) : null;
    const changePercent =
      currentValue !== null && previousValue !== null && previousValue !== 0
        ? round2(((currentValue - previousValue) / previousValue) * 100)
        : null;

    return {
      metricKey,
      period,
      currentPeriodLabel: plan.currentLabel,
      previousPeriodLabel: plan.previousLabel,
      currentValue,
      previousValue,
      changeAbsolute,
      changePercent,
    };
  }

  private planPeriods(latestDate: Date, period: BenchmarkPeriod): PeriodPlan {
    if (period === 'MONTH') {
      const previousAnchor = addMonthsUTC(latestDate, -1);
      return {
        currentLabel: monthLabel(latestDate),
        previousLabel: monthLabel(previousAnchor),
        currentRange: { start: startOfMonthUTC(latestDate), end: endOfMonthUTC(latestDate) },
        previousRange: {
          start: startOfMonthUTC(previousAnchor),
          end: endOfMonthUTC(previousAnchor),
        },
      };
    }

    if (period === 'QUARTER') {
      const previousAnchor = addQuartersUTC(latestDate, -1);
      return {
        currentLabel: quarterLabel(latestDate),
        previousLabel: quarterLabel(previousAnchor),
        currentRange: { start: startOfQuarterUTC(latestDate), end: endOfQuarterUTC(latestDate) },
        previousRange: {
          start: startOfQuarterUTC(previousAnchor),
          end: endOfQuarterUTC(previousAnchor),
        },
      };
    }

    // YEAR
    const previousAnchor = addYearsUTC(latestDate, -1);
    return {
      currentLabel: yearLabel(latestDate),
      previousLabel: yearLabel(previousAnchor),
      currentRange: { start: startOfYearUTC(latestDate), end: endOfYearUTC(latestDate) },
      previousRange: { start: startOfYearUTC(previousAnchor), end: endOfYearUTC(previousAnchor) },
    };
  }
}
