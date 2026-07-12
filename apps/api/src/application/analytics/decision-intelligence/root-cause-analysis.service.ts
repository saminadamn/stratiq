import type { Confidence } from '@stratiq/shared';
import type { BenchmarkResult } from '../intelligence/benchmark-engine.service.js';
import type { Insight } from '../../../domain/entities/insight.entity.js';

export interface RootCause {
  metricKey: string;
  title: string;
  // Full diagnostic trace (base sentence + outlier note + every triggered
  // business-rule message) — the old flattened "narrative", kept as-is for
  // the Analyst persona's expandable detail view.
  diagnosticDetail: string;
  // Executive-readable headline and consequence sentence, free of rule/
  // threshold jargon — see composeFinding()/composeBusinessImpact() below.
  finding: string;
  businessImpact: string;
  confidence: Confidence;
  changePercent: number | null;
  driverMetricKey: string | null;
  severity: Insight['severity'];
}

// Which sub-metrics drive each top-level metric — a fixed, documented
// assumption (revenue ≈ orders × average order value; gross profit moves
// with revenue and margin), not something inferred. This is what lets
// composeNarrative say *why* a metric moved, not just that it moved.
const METRIC_DRIVERS: Record<string, string[]> = {
  revenue: ['totalOrders', 'averageOrderValue'],
  grossProfit: ['revenue', 'profitMargin'],
  customerLifetimeValue: ['revenue', 'activeCustomers'],
};

// Display labels for the fixed set of driver metric keys above — not a
// general metric-name registry, just enough to phrase composeFinding().
const DRIVER_LABELS: Record<string, string> = {
  totalOrders: 'Total Orders',
  averageOrderValue: 'Average Order Value',
  revenue: 'Revenue',
  profitMargin: 'Profit Margin',
  activeCustomers: 'Active Customers',
};

// Practical business consequence per top-level metric, keyed the same way
// as METRIC_DRIVERS. Generic fallback covers any metric without a bespoke
// sentence (e.g. one added later without updating this map).
const BUSINESS_IMPACT_BY_METRIC: Record<string, string> = {
  revenue: 'This reduces cash flow and pressures the organization\'s ability to fund operations and growth.',
  grossProfit: 'Margins are compressing faster than the top line, directly reducing what the business retains after costs.',
  customerLifetimeValue: 'Each customer is now worth less to the business over time, weakening long-term profitability.',
};
const DEFAULT_BUSINESS_IMPACT =
  'This may materially affect overall business performance if the trend continues.';

// Deterministic root-cause attribution: for a metric that's declining, find
// which of its known drivers moved in the same direction with the largest
// magnitude, and name that driver as the cause. No inference beyond
// "biggest concurrent negative mover among known drivers" — reproducible
// from the same benchmark inputs every time.
export class RootCauseAnalysisService {
  analyze(insights: Insight[], benchmarks: Record<string, BenchmarkResult>): RootCause[] {
    const rootCauses: RootCause[] = [];

    for (const insight of insights) {
      if (insight.trend !== 'DECLINING') {
        continue;
      }

      const drivers = METRIC_DRIVERS[insight.metricKey];
      const driverMetricKey = drivers ? this.findPrimaryDriver(drivers, benchmarks) : null;
      const metricLabel = this.metricLabel(insight);

      rootCauses.push({
        metricKey: insight.metricKey,
        title: `Why ${metricLabel} declined`,
        diagnosticDetail: this.composeDiagnosticDetail(insight, driverMetricKey, benchmarks),
        finding: this.composeFinding(metricLabel, insight, driverMetricKey, benchmarks),
        businessImpact: BUSINESS_IMPACT_BY_METRIC[insight.metricKey] ?? DEFAULT_BUSINESS_IMPACT,
        confidence: this.deriveConfidence(driverMetricKey, insight.severity),
        changePercent: insight.changePercent,
        driverMetricKey,
        severity: insight.severity,
      });
    }

    return rootCauses;
  }

  private metricLabel(insight: Insight): string {
    return insight.title.replace(
      / (is trending (up|down)|shows a seasonal pattern|is stable)$/,
      '',
    );
  }

  private findPrimaryDriver(
    drivers: string[],
    benchmarks: Record<string, BenchmarkResult>,
  ): string | null {
    let primary: string | null = null;
    let mostNegativeChange = 0;

    for (const driver of drivers) {
      const benchmark = benchmarks[driver];
      if (!benchmark || benchmark.changePercent === null) {
        continue;
      }
      if (benchmark.changePercent < mostNegativeChange) {
        mostNegativeChange = benchmark.changePercent;
        primary = driver;
      }
    }

    return primary;
  }

  private composeDiagnosticDetail(
    insight: Insight,
    driverMetricKey: string | null,
    benchmarks: Record<string, BenchmarkResult>,
  ): string {
    if (!driverMetricKey) {
      return insight.narrative;
    }
    const driverBenchmark = benchmarks[driverMetricKey];
    if (!driverBenchmark || driverBenchmark.changePercent === null) {
      return insight.narrative;
    }
    return `${insight.narrative} The primary driver was ${driverMetricKey}, which changed ${driverBenchmark.changePercent}% over the same period.`;
  }

  // Driver-aware headline with no threshold/rule jargon — this is what the
  // Executive persona reads instead of the raw rule-engine trace above.
  private composeFinding(
    metricLabel: string,
    insight: Insight,
    driverMetricKey: string | null,
    benchmarks: Record<string, BenchmarkResult>,
  ): string {
    if (insight.changePercent === null) {
      return `${metricLabel} declined compared to the prior period.`;
    }
    const magnitude = Math.abs(insight.changePercent).toFixed(1);
    const driverBenchmark = driverMetricKey ? benchmarks[driverMetricKey] : null;
    if (!driverMetricKey || !driverBenchmark || driverBenchmark.changePercent === null) {
      return `${metricLabel} declined by ${magnitude}%.`;
    }
    const driverLabel = DRIVER_LABELS[driverMetricKey] ?? driverMetricKey;
    const driverChange = driverBenchmark.changePercent.toFixed(1);
    return `${metricLabel} declined by ${magnitude}%, driven primarily by ${driverLabel} (${driverChange}%).`;
  }

  // HIGH: a specific driver was identified *and* the decline was severe
  // enough to trip a business-rule threshold (CRITICAL). MEDIUM: only one of
  // those holds. LOW: a decline was observed but neither corroborating
  // signal is present (e.g. WARNING severity can come from trend direction
  // alone, with no rule fired — see InsightEngineService.deriveSeverity).
  private deriveConfidence(
    driverMetricKey: string | null,
    severity: Insight['severity'],
  ): Confidence {
    const hasDriver = driverMetricKey !== null;
    const isCritical = severity === 'CRITICAL';
    if (hasDriver && isCritical) {
      return 'HIGH';
    }
    if (hasDriver || severity !== 'INFO') {
      return 'MEDIUM';
    }
    return 'LOW';
  }
}
