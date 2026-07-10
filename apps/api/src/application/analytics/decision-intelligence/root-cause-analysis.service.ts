import type { BenchmarkResult } from '../intelligence/benchmark-engine.service.js';
import type { Insight } from '../../../domain/entities/insight.entity.js';

export interface RootCause {
  metricKey: string;
  title: string;
  narrative: string;
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

      rootCauses.push({
        metricKey: insight.metricKey,
        title: `Why ${insight.title.replace(/ is trending down$/, '')} declined`,
        narrative: this.composeNarrative(insight, driverMetricKey, benchmarks),
        driverMetricKey,
        severity: insight.severity,
      });
    }

    return rootCauses;
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

  private composeNarrative(
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
}
