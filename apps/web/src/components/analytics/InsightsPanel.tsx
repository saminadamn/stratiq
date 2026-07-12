import { useEffect, useState } from 'react';
import type { InsightDto, InsightSeverity, TrendDirection } from '@stratiq/shared';
import { ApiError } from '../../lib/api-client';
import { getDecisionIntelligence } from '../../lib/decisions-api';
import { formatPercent } from '../../lib/format';
import { getInsights } from '../../lib/intelligence-api';
import { metricLabel } from '../../lib/metric-label';

interface InsightsPanelProps {
  organizationId: string;
}

const SEVERITY_STYLE: Record<InsightSeverity, string> = {
  CRITICAL: 'border-red-200 bg-red-50 text-red-900',
  WARNING: 'border-amber-200 bg-amber-50 text-amber-900',
  INFO: 'border-slate-200 bg-slate-50 text-slate-900',
};

// A short headline phrase from severity + trend — "Critical decline
// detected," not a rule-engine sentence. Business rules in this codebase are
// all decline/threshold-oriented (see default-business-rules.ts), so
// WARNING/CRITICAL severity is realistically always paired with a decline;
// the INCREASING/SEASONAL branches exist so the phrase never reads wrong if
// that assumption changes.
function severityPhrase(severity: InsightSeverity, trend: TrendDirection | null): string {
  const trendWord =
    trend === 'DECLINING' ? 'decline' : trend === 'INCREASING' ? 'increase' : 'change';
  if (severity === 'CRITICAL') {
    return `Critical ${trendWord} detected`;
  }
  if (severity === 'WARNING') {
    return trend === 'INCREASING' ? 'Notable increase detected' : 'Decline detected';
  }
  if (trend === 'INCREASING') return 'Trending up';
  if (trend === 'DECLINING') return 'Trending down';
  if (trend === 'SEASONAL') return 'Seasonal pattern';
  return 'Stable';
}

// The Insight Timeline: rule-based insights generated once per dataset
// version (see generate-intelligence.service.ts), condensed to a short
// headline + change + (when a matching Decision Intelligence root cause
// exists) its driver and business impact — never the raw concatenated
// rule-engine narrative.
export function InsightsPanel({ organizationId }: InsightsPanelProps): JSX.Element {
  const [insights, setInsights] = useState<InsightDto[] | null>(null);
  const [driverByMetric, setDriverByMetric] = useState<Record<string, string | null>>({});
  const [impactByMetric, setImpactByMetric] = useState<Record<string, string | null>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    getInsights(organizationId)
      .then((result) => {
        if (!cancelled) setInsights(result);
      })
      .catch((err) => {
        if (!cancelled)
          setError(err instanceof ApiError ? err.message : 'Unable to load insights.');
      });
    // Root causes carry the driver/business-impact detail insights alone
    // don't have — best-effort enrichment, never blocking the insight list.
    getDecisionIntelligence(organizationId)
      .then((result) => {
        if (cancelled) return;
        const drivers: Record<string, string | null> = {};
        const impacts: Record<string, string | null> = {};
        for (const cause of result.rootCauses) {
          if (!cause.metricKey) continue;
          drivers[cause.metricKey] = cause.driverMetricKey;
          impacts[cause.metricKey] = cause.businessImpact;
        }
        setDriverByMetric(drivers);
        setImpactByMetric(impacts);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [organizationId]);

  return (
    <div className="rounded-xl border border-slate-200/70 bg-white shadow-card p-4">
      <h3 className="mb-3 text-sm font-semibold text-slate-900">Insights</h3>
      {error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : !insights ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : insights.length === 0 ? (
        <p className="text-sm text-slate-400">No insights yet for this dataset.</p>
      ) : (
        <ul className="space-y-2">
          {insights.map((insight) => {
            const driver = driverByMetric[insight.metricKey];
            const impact = impactByMetric[insight.metricKey];
            return (
              <li
                key={insight.id}
                className={`rounded-md border p-3 text-sm ${SEVERITY_STYLE[insight.severity]}`}
              >
                <p className="font-semibold">{metricLabel(insight.metricKey)}</p>
                <p className="mt-0.5 text-sm opacity-90">
                  {severityPhrase(insight.severity, insight.trend)}
                  {insight.changePercent !== null &&
                    ` — ${formatPercent(Math.abs(insight.changePercent))} ${insight.trend === 'INCREASING' ? 'increase' : 'change'}`}
                </p>
                {driver && (
                  <p className="mt-1 text-xs opacity-80">
                    Primary driver: {metricLabel(driver)}
                  </p>
                )}
                {impact && <p className="mt-0.5 text-xs opacity-80">Business impact: {impact}</p>}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
