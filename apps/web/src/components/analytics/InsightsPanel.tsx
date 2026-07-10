import { useEffect, useState } from 'react';
import type { InsightDto, InsightSeverity } from '@stratiq/shared';
import { ApiError } from '../../lib/api-client';
import { getInsights } from '../../lib/intelligence-api';

interface InsightsPanelProps {
  organizationId: string;
}

const SEVERITY_STYLE: Record<InsightSeverity, string> = {
  CRITICAL: 'border-red-200 bg-red-50 text-red-900',
  WARNING: 'border-amber-200 bg-amber-50 text-amber-900',
  INFO: 'border-slate-200 bg-slate-50 text-slate-900',
};

// The Insight Timeline: rule-based narrative insights generated once per
// dataset version (see generate-intelligence.service.ts) and displayed here
// chronologically, most recent first.
export function InsightsPanel({ organizationId }: InsightsPanelProps): JSX.Element {
  const [insights, setInsights] = useState<InsightDto[] | null>(null);
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
          {insights.map((insight) => (
            <li
              key={insight.id}
              className={`rounded-md border p-3 text-sm ${SEVERITY_STYLE[insight.severity]}`}
            >
              <p className="font-medium">{insight.title}</p>
              <p className="mt-1 text-sm opacity-90">{insight.narrative}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
