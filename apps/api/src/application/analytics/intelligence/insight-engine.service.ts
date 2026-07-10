import type {
  InsightSeverity,
  MetricUnit,
  TimeSeriesPointDto,
  TrendDirection,
} from '@stratiq/shared';
import type { BusinessRule } from '../../../domain/entities/business-rule.entity.js';
import type { MetricDefinition } from '../../../domain/entities/metric-definition.entity.js';
import type { AnalyticsColumns } from '../column-detection.js';
import type { BenchmarkEngineService, BenchmarkResult } from './benchmark-engine.service.js';
import type { BusinessRulesEngineService, TriggeredRule } from './business-rules-engine.service.js';
import type { MetricCalculator } from './metric-calculators.js';
import type { TrendAnalysisResult, TrendDetectionService } from './trend-detection.service.js';

type Row = Record<string, unknown>;

export interface GeneratedInsight {
  metricKey: string;
  title: string;
  narrative: string;
  trend: TrendDirection | null;
  severity: InsightSeverity;
  currentValue: number | null;
  previousValue: number | null;
  changePercent: number | null;
  triggeredRuleIds: string[];
  outlierPeriods: string[];
}

// Composes Trend Detection + Benchmark Engine + Business Rules into a
// human-readable narrative per metric. Nothing here recomputes a metric
// value itself — that's always delegated to the calculator (Sprint 3's KPI
// engine), so this stays a pure composition/templating layer.
export class InsightEngineService {
  constructor(
    private readonly trendDetection: TrendDetectionService,
    private readonly benchmarkEngine: BenchmarkEngineService,
    private readonly businessRulesEngine: BusinessRulesEngineService,
  ) {}

  generate(
    rows: Row[],
    columns: AnalyticsColumns,
    metrics: MetricDefinition[],
    calculators: Record<string, MetricCalculator>,
    monthlySeriesByMetric: Record<string, TimeSeriesPointDto[]>,
    rules: BusinessRule[],
  ): GeneratedInsight[] {
    const insights: GeneratedInsight[] = [];

    for (const metric of metrics) {
      const calculator = calculators[metric.key];
      if (!calculator) {
        continue;
      }

      const series = monthlySeriesByMetric[metric.key] ?? [];
      const trendResult = this.trendDetection.analyze(series);
      const benchmark = this.benchmarkEngine.compare(
        rows,
        columns,
        metric.key,
        calculator,
        'MONTH',
      );
      // Nothing to report if the metric has no computable value this period
      // (e.g. no date column, or the current month has zero matching rows).
      if (!benchmark || benchmark.currentValue === null) {
        continue;
      }

      const triggeredRules = this.businessRulesEngine.evaluate(rules, metric.key, {
        currentValue: benchmark.currentValue,
        changePercent: benchmark.changePercent,
      });

      insights.push({
        metricKey: metric.key,
        title: `${metric.name} ${this.trendVerb(trendResult.direction)}`,
        narrative: this.composeNarrative(metric, benchmark, trendResult, triggeredRules),
        trend: trendResult.direction,
        severity: this.deriveSeverity(triggeredRules, trendResult.direction),
        currentValue: benchmark.currentValue,
        previousValue: benchmark.previousValue,
        changePercent: benchmark.changePercent,
        triggeredRuleIds: triggeredRules.map((rule) => rule.ruleId),
        outlierPeriods: trendResult.outliers.map((outlier) => outlier.period),
      });
    }

    return insights;
  }

  private trendVerb(direction: TrendDirection): string {
    switch (direction) {
      case 'INCREASING':
        return 'is trending up';
      case 'DECLINING':
        return 'is trending down';
      case 'SEASONAL':
        return 'shows a seasonal pattern';
      default:
        return 'is stable';
    }
  }

  private formatValue(value: number | null, unit: MetricUnit): string {
    if (value === null) {
      return 'an unknown amount';
    }
    if (unit === 'CURRENCY') {
      return `$${value.toLocaleString()}`;
    }
    if (unit === 'PERCENTAGE') {
      return `${value}%`;
    }
    return `${value}`;
  }

  private composeNarrative(
    metric: MetricDefinition,
    benchmark: BenchmarkResult,
    trendResult: TrendAnalysisResult,
    triggeredRules: TriggeredRule[],
  ): string {
    const parts: string[] = [];

    if (benchmark.changePercent === null) {
      parts.push(
        `${metric.name} was ${this.formatValue(benchmark.currentValue, metric.unit)} in ${benchmark.currentPeriodLabel}.`,
      );
    } else {
      const verb = benchmark.changePercent >= 0 ? 'increased' : 'decreased';
      parts.push(
        `${metric.name} ${verb} ${Math.abs(benchmark.changePercent)}% to ${this.formatValue(
          benchmark.currentValue,
          metric.unit,
        )} in ${benchmark.currentPeriodLabel}, compared to ${this.formatValue(
          benchmark.previousValue,
          metric.unit,
        )} in ${benchmark.previousPeriodLabel}.`,
      );
    }

    if (trendResult.outliers.length > 0) {
      parts.push(
        `Unusual activity was detected in ${trendResult.outliers.map((o) => o.period).join(', ')}.`,
      );
    }

    for (const rule of triggeredRules) {
      parts.push(rule.message);
    }

    return parts.join(' ');
  }

  private deriveSeverity(
    triggeredRules: TriggeredRule[],
    direction: TrendDirection,
  ): InsightSeverity {
    if (triggeredRules.some((rule) => rule.severity === 'CRITICAL')) {
      return 'CRITICAL';
    }
    if (triggeredRules.some((rule) => rule.severity === 'WARNING')) {
      return 'WARNING';
    }
    if (direction === 'DECLINING') {
      return 'WARNING';
    }
    return 'INFO';
  }
}
