import { useEffect, useState } from 'react';
import type { DecisionRecommendationDto, RecommendationPriority } from '@stratiq/shared';
import { ApiError } from '../../lib/api-client';
import { getDecisionIntelligence } from '../../lib/decisions-api';
import { formatCurrency } from '../../lib/format';

interface DecisionIntelligencePanelProps {
  organizationId: string;
}

const PRIORITY_STYLE: Record<RecommendationPriority, string> = {
  CRITICAL: 'bg-red-100 text-red-800',
  HIGH: 'bg-amber-100 text-amber-800',
  MEDIUM: 'bg-blue-100 text-blue-800',
  LOW: 'bg-slate-100 text-slate-700',
};

// The Decision Intelligence Engine's output — root causes explaining *why*
// metrics moved, and recommendations with an expandable 30/60/90-day plan.
// Deterministic and rule-based end to end (see docs/ARCHITECTURE.md) — no
// text here is model-generated.
export function DecisionIntelligencePanel({ organizationId }: DecisionIntelligencePanelProps): JSX.Element {
  const [rootCauses, setRootCauses] = useState<DecisionRecommendationDto[] | null>(null);
  const [recommendations, setRecommendations] = useState<DecisionRecommendationDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    getDecisionIntelligence(organizationId)
      .then((result) => {
        if (cancelled) return;
        setRootCauses(result.rootCauses);
        setRecommendations(result.recommendations);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : 'Unable to load recommendations.');
      });
    return () => {
      cancelled = true;
    };
  }, [organizationId]);

  const isLoading = !recommendations && !error;
  const sortedRecommendations = (recommendations ?? [])
    .slice()
    .sort((a, b) => b.impactScore - a.impactScore);

  return (
    <div className="rounded-xl border border-slate-200/70 bg-white shadow-card p-4">
      <h3 className="mb-3 text-sm font-semibold text-slate-900">Decision Intelligence</h3>
      {error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : isLoading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : (
        <div className="space-y-4">
          {rootCauses && rootCauses.length > 0 && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Root Causes</p>
              <ul className="mt-1 space-y-1 text-sm text-slate-700">
                {rootCauses.map((cause) => (
                  <li key={cause.id}>{cause.rootCause}</li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
              Recommendations
            </p>
            {sortedRecommendations.length === 0 ? (
              <p className="text-sm text-slate-400">No recommendations right now.</p>
            ) : (
              <ul className="space-y-2">
                {sortedRecommendations.map((recommendation) => {
                  const isExpanded = expandedId === recommendation.id;
                  return (
                    <li key={recommendation.id} className="rounded-md border border-slate-200 p-3 text-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-slate-900">{recommendation.title}</p>
                          <p className="mt-1 text-slate-600">{recommendation.recommendationText}</p>
                          {recommendation.roiEstimate !== null && (
                            <p className="mt-1 text-xs text-emerald-700">
                              Estimated impact: {formatCurrency(recommendation.roiEstimate)}
                            </p>
                          )}
                        </div>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_STYLE[recommendation.priority]}`}
                        >
                          {recommendation.priority}
                        </span>
                      </div>
                      {recommendation.actionPlan && recommendation.actionPlan.length > 0 && (
                        <>
                          <button
                            type="button"
                            className="mt-2 text-xs font-medium text-indigo-600 hover:underline"
                            onClick={() => setExpandedId(isExpanded ? null : recommendation.id)}
                          >
                            {isExpanded ? 'Hide action plan' : 'Show 30/60/90-day plan'}
                          </button>
                          {isExpanded && (
                            <ul className="mt-2 space-y-1 border-t border-slate-100 pt-2 text-xs text-slate-600">
                              {recommendation.actionPlan.map((item, index) => (
                                <li key={index}>
                                  <span className="font-medium">Day {item.day}:</span> {item.action}
                                </li>
                              ))}
                            </ul>
                          )}
                        </>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
