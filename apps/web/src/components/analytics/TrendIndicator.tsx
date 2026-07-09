import type { TrendDirection } from '@stratiq/shared';

interface TrendIndicatorProps {
  direction: TrendDirection;
  averageChangePercent: number | null;
}

const DIRECTION_STYLE: Record<TrendDirection, { arrow: string; className: string; label: string }> = {
  INCREASING: { arrow: '↑', className: 'text-emerald-700 bg-emerald-50', label: 'Increasing' },
  DECLINING: { arrow: '↓', className: 'text-red-700 bg-red-50', label: 'Declining' },
  SEASONAL: { arrow: '↕', className: 'text-amber-700 bg-amber-50', label: 'Seasonal' },
  STABLE: { arrow: '→', className: 'text-slate-700 bg-slate-100', label: 'Stable' },
};

// Small badge used next to a KPI or inside a benchmark card — the same
// deterministic direction the Trend Detection engine (Sprint 4) computes,
// never re-derived on the client.
export function TrendIndicator({ direction, averageChangePercent }: TrendIndicatorProps): JSX.Element {
  const style = DIRECTION_STYLE[direction];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${style.className}`}
    >
      <span aria-hidden="true">{style.arrow}</span>
      {style.label}
      {averageChangePercent !== null ? ` (${averageChangePercent.toFixed(1)}%)` : ''}
    </span>
  );
}
