import { useEffect, useState } from 'react';
import type {
  ActionPlanItemDto,
  Confidence,
  DecisionRecommendationDto,
  InsightSeverity,
  RecommendationPriority,
  RecommendationTeam,
} from '@stratiq/shared';
import { ApiError } from '../../lib/api-client';
import { getDecisionIntelligence } from '../../lib/decisions-api';
import { formatCurrency, formatPercent } from '../../lib/format';
import { metricLabel } from '../../lib/metric-label';

// Matches ExecutiveDashboardPage's own ViewMode — this panel follows the
// page's single Executive/Manager/Analyst switcher rather than keeping a
// second, disconnected one (see docs/ARCHITECTURE.md's dashboard view modes).
type ViewMode = 'EXECUTIVE' | 'MANAGER' | 'ANALYST';

interface DecisionIntelligencePanelProps {
  organizationId: string;
  viewMode: ViewMode;
}

const PRIORITY_STYLE: Record<RecommendationPriority, string> = {
  CRITICAL: 'bg-red-100 text-red-800',
  HIGH: 'bg-amber-100 text-amber-800',
  MEDIUM: 'bg-blue-100 text-blue-800',
  LOW: 'bg-slate-100 text-slate-700',
};

const SEVERITY_STYLE: Record<InsightSeverity, string> = {
  CRITICAL: 'bg-red-100 text-red-800',
  WARNING: 'bg-amber-100 text-amber-800',
  INFO: 'bg-slate-100 text-slate-700',
};

const TEAM_LABELS: Record<RecommendationTeam, string> = {
  SALES: 'Sales',
  MARKETING: 'Marketing',
  OPERATIONS: 'Operations',
  CUSTOMER_SUCCESS: 'Customer Success',
  GENERAL: 'General',
};
const TEAM_ORDER: RecommendationTeam[] = [
  'SALES',
  'MARKETING',
  'OPERATIONS',
  'CUSTOMER_SUCCESS',
  'GENERAL',
];

const CONFIDENCE_LABEL: Record<Confidence, string> = { HIGH: 'High', MEDIUM: 'Medium', LOW: 'Low' };

// "Expected Impact" mirrors priority rather than introducing a second scale —
// priority already *is* the engine's impact ranking (see PRIORITY_STYLE).
function expectedImpactLabel(priority: RecommendationPriority): string {
  if (priority === 'CRITICAL' || priority === 'HIGH') {
    return 'High';
  }
  return priority === 'MEDIUM' ? 'Medium' : 'Low';
}

// The nearest action's day (30/60/90) — "when does work on this start,"
// not the full plan length.
function timelineLabel(actionPlan: ActionPlanItemDto[] | null): string {
  if (!actionPlan || actionPlan.length === 0) {
    return '—';
  }
  const nearestDay = Math.min(...actionPlan.map((item) => item.day));
  return `${nearestDay} Days`;
}

// The Decision Intelligence Engine's output — root causes explaining *why*
// metrics moved, and recommendations with an expandable 30/60/90-day plan.
// Deterministic and rule-based end to end (see docs/ARCHITECTURE.md) — no
// text here is model-generated. Rendering follows the page's viewMode prop,
// reformatting the same underlying data for what each role needs (business
// impact vs. diagnostics vs. operational actions); it doesn't change what
// was generated.
export function DecisionIntelligencePanel({
  organizationId,
  viewMode,
}: DecisionIntelligencePanelProps): JSX.Element {
  const [rootCauses, setRootCauses] = useState<DecisionRecommendationDto[] | null>(null);
  const [recommendations, setRecommendations] = useState<DecisionRecommendationDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedDiagnosticId, setExpandedDiagnosticId] = useState<string | null>(null);

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
        if (!cancelled)
          setError(err instanceof ApiError ? err.message : 'Unable to load recommendations.');
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
        <>
          {viewMode === 'EXECUTIVE' && (
            <ExecutiveView
              rootCauses={rootCauses ?? []}
              recommendations={sortedRecommendations}
              expandedId={expandedId}
              setExpandedId={setExpandedId}
            />
          )}
          {viewMode === 'ANALYST' && (
            <AnalystView
              rootCauses={rootCauses ?? []}
              expandedDiagnosticId={expandedDiagnosticId}
              setExpandedDiagnosticId={setExpandedDiagnosticId}
            />
          )}
          {viewMode === 'MANAGER' && <ManagerView recommendations={recommendations ?? []} />}
        </>
      )}
    </div>
  );
}

// Prose findings + business impact, no rule/threshold jargon, plus the same
// prioritized recommendation list the panel has always shown.
function ExecutiveView({
  rootCauses,
  recommendations,
  expandedId,
  setExpandedId,
}: {
  rootCauses: DecisionRecommendationDto[];
  recommendations: DecisionRecommendationDto[];
  expandedId: string | null;
  setExpandedId: (id: string | null) => void;
}): JSX.Element {
  return (
    <div className="space-y-4">
      {rootCauses.length > 0 && (
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Findings</p>
          <ul className="mt-1 space-y-2 text-sm text-slate-700">
            {rootCauses.map((cause) => (
              <li key={cause.id}>
                {cause.finding && cause.businessImpact ? (
                  <>
                    <span>{cause.finding}</span> <span className="text-slate-600">{cause.businessImpact}</span>
                  </>
                ) : (
                  cause.rootCause
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
          Executive Recommendations
        </p>
        {recommendations.length === 0 ? (
          <p className="text-sm text-slate-400">No recommendations right now.</p>
        ) : (
          <ul className="space-y-3">
            {recommendations.map((recommendation) => {
              const isExpanded = expandedId === recommendation.id;
              return (
                <li
                  key={recommendation.id}
                  className="rounded-lg border border-slate-100 p-4 text-sm shadow-card"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-semibold text-slate-900">{recommendation.title}</p>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${PRIORITY_STYLE[recommendation.priority]}`}
                    >
                      {recommendation.priority}
                    </span>
                  </div>
                  <p className="mt-1.5 text-slate-600">{recommendation.recommendationText}</p>
                  {recommendation.roiEstimate !== null && (
                    <p className="mt-1.5 text-xs text-emerald-700">
                      Estimated impact: {formatCurrency(recommendation.roiEstimate)}
                    </p>
                  )}

                  <dl className="mt-3 grid grid-cols-2 gap-3 border-t border-slate-100 pt-3 sm:grid-cols-4">
                    <div>
                      <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                        Owner
                      </dt>
                      <dd className="mt-0.5 text-sm font-medium text-slate-900">
                        {recommendation.team ? TEAM_LABELS[recommendation.team] : '—'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                        Expected Impact
                      </dt>
                      <dd className="mt-0.5 text-sm font-medium text-slate-900">
                        {expectedImpactLabel(recommendation.priority)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                        Timeline
                      </dt>
                      <dd className="mt-0.5 text-sm font-medium text-slate-900">
                        {timelineLabel(recommendation.actionPlan)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                        Confidence
                      </dt>
                      <dd className="mt-0.5 text-sm font-medium text-slate-900">
                        {recommendation.confidence ? CONFIDENCE_LABEL[recommendation.confidence] : '—'}
                      </dd>
                    </div>
                  </dl>

                  {recommendation.actionPlan && recommendation.actionPlan.length > 0 && (
                    <>
                      <button
                        type="button"
                        className="mt-3 text-xs font-medium text-indigo-600 hover:underline"
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
  );
}

// A diagnostic table (metric / change / severity / driver) plus the raw
// rule-engine trace behind an expand toggle, for readers who want the full
// detail rather than the executive-readable finding.
function AnalystView({
  rootCauses,
  expandedDiagnosticId,
  setExpandedDiagnosticId,
}: {
  rootCauses: DecisionRecommendationDto[];
  expandedDiagnosticId: string | null;
  setExpandedDiagnosticId: (id: string | null) => void;
}): JSX.Element {
  if (rootCauses.length === 0) {
    return <p className="text-sm text-slate-400">No root causes identified right now.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
              <th className="pb-2 pr-3">Metric</th>
              <th className="pb-2 pr-3">Change</th>
              <th className="pb-2 pr-3">Severity</th>
              <th className="pb-2">Primary Driver</th>
            </tr>
          </thead>
          <tbody>
            {rootCauses.map((cause) => (
              <tr key={cause.id} className="border-b border-slate-100 last:border-0">
                <td className="py-2 pr-3 font-medium text-slate-900">
                  {metricLabel(cause.metricKey)}
                </td>
                <td className="py-2 pr-3 text-slate-700">{formatPercent(cause.changePercent)}</td>
                <td className="py-2 pr-3">
                  {cause.severity && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${SEVERITY_STYLE[cause.severity]}`}
                    >
                      {cause.severity}
                    </span>
                  )}
                </td>
                <td className="py-2 text-slate-700">
                  {cause.driverMetricKey ? metricLabel(cause.driverMetricKey) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
          Key Findings
        </p>
        <ul className="space-y-1 text-sm text-slate-700">
          {rootCauses.map((cause) => (
            <li key={cause.id}>{cause.finding ?? cause.rootCause}</li>
          ))}
        </ul>
      </div>

      <div className="space-y-2">
        {rootCauses.map((cause) => {
          const isExpanded = expandedDiagnosticId === cause.id;
          return (
            <div key={cause.id} className="rounded-md border border-slate-200 p-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium text-slate-900">{cause.title}</p>
                <button
                  type="button"
                  className="shrink-0 text-xs font-medium text-indigo-600 hover:underline"
                  onClick={() => setExpandedDiagnosticId(isExpanded ? null : cause.id)}
                >
                  {isExpanded ? 'Hide full detail' : 'Show full detail'}
                </button>
              </div>
              {isExpanded && cause.rootCause && (
                <p className="mt-2 border-t border-slate-100 pt-2 text-xs text-slate-600">
                  {cause.rootCause}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Recommendations grouped by the team best positioned to act on them.
// Recommendations without a team (legacy rows generated before this field
// existed) fall into "General" so nothing silently disappears.
function ManagerView({
  recommendations,
}: {
  recommendations: DecisionRecommendationDto[];
}): JSX.Element {
  if (recommendations.length === 0) {
    return <p className="text-sm text-slate-400">No recommendations right now.</p>;
  }

  const byTeam = new Map<RecommendationTeam, DecisionRecommendationDto[]>();
  for (const recommendation of recommendations) {
    const team = recommendation.team ?? 'GENERAL';
    const existing = byTeam.get(team) ?? [];
    existing.push(recommendation);
    byTeam.set(team, existing);
  }

  return (
    <div className="space-y-4">
      {TEAM_ORDER.filter((team) => byTeam.has(team)).map((team) => (
        <div key={team}>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
            {TEAM_LABELS[team]}
          </p>
          <ul className="space-y-1 text-sm text-slate-700">
            {(byTeam.get(team) ?? []).map((recommendation) => (
              <li key={recommendation.id} className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                <span>{recommendation.recommendationText ?? recommendation.title}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
