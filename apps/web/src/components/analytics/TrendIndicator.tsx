import type { InsightSeverity, TrendDirection } from '@stratiq/shared';

interface TrendIndicatorProps {
  direction: TrendDirection;
  averageChangePercent: number | null;
  // Only WARNING/CRITICAL render a chip — INFO-level metrics don't need a
  // scare label under every KPI (see root-cause-analysis.service.ts, whose
  // severity this mirrors 1:1 when a metric has a matching Insight).
  severity?: InsightSeverity | undefined;
}

// Delta color = direction × whether up is good, not direction alone — a
// DECLINING metric isn't inherently bad (see dataviz skill's stat-tile
// contract), but every metric on this dashboard is a "more is better" one,
// so INCREASING/DECLINING map straight to good/bad.
const DIRECTION_STYLE: Record<TrendDirection, { arrow: string; className: string }> = {
  INCREASING: { arrow: '▲', className: 'text-emerald-700' },
  DECLINING: { arrow: '▼', className: 'text-red-700' },
  SEASONAL: { arrow: '↕', className: 'text-amber-700' },
  STABLE: { arrow: '—', className: 'text-slate-500' },
};

const SEVERITY_STYLE: Record<'WARNING' | 'CRITICAL', string> = {
  WARNING: 'bg-amber-50 text-amber-700',
  CRITICAL: 'bg-red-50 text-red-700',
};
const SEVERITY_LABEL: Record<'WARNING' | 'CRITICAL', string> = {
  WARNING: 'Warning',
  CRITICAL: 'Critical',
};

// The stat-tile delta used under every KPI card: a bold arrow + signed
// percent (the primary read), plus an optional severity chip underneath —
// the same deterministic direction/severity the Trend Detection and
// Business Rules engines compute, never re-derived on the client.
export function TrendIndicator({
  direction,
  averageChangePercent,
  severity,
}: TrendIndicatorProps): JSX.Element {
  const style = DIRECTION_STYLE[direction];
  const showSeverityChip = severity === 'WARNING' || severity === 'CRITICAL';

  return (
    <div>
      <span className={`inline-flex items-center gap-1 text-sm font-semibold ${style.className}`}>
        <span aria-hidden="true">{style.arrow}</span>
        {averageChangePercent !== null ? `${Math.abs(averageChangePercent).toFixed(1)}%` : '—'}
      </span>
      {showSeverityChip && (
        <span
          className={`ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${SEVERITY_STYLE[severity]}`}
        >
          {SEVERITY_LABEL[severity]}
        </span>
      )}
    </div>
  );
}
