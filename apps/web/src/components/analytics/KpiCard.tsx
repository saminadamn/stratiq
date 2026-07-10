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
    <div className="rounded-xl border border-slate-200/70 bg-white p-4 shadow-card transition-shadow hover:shadow-md">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="tabular-nums mt-1.5 text-2xl font-semibold tracking-tight text-slate-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
      {trend && <div className="mt-2">{trend}</div>}
    </div>
  );
}
