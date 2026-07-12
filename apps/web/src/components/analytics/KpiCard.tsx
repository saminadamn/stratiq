import type { ReactNode } from 'react';

interface KpiCardProps {
  label: string;
  value: string;
  hint?: string;
  // A TrendIndicator badge (see Sprint 4's Trend Detection engine) — optional
  // since not every KPI has a registered metric key to compute a trend for.
  trend?: ReactNode;
}

export function KpiCard({ label, value, hint, trend }: KpiCardProps): JSX.Element {
  return (
    <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-card transition-shadow hover:shadow-md">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      {/* Proportional figures, not tabular-nums — a large standalone number
          reads loose with every digit forced to the width of a "0" (dataviz
          skill anti-patterns). Tabular is reserved for columns of aligned
          numbers, not a hero value like this. */}
      <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
      {trend && <div className="mt-2.5">{trend}</div>}
    </div>
  );
}
