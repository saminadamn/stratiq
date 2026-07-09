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
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
      {trend && <div className="mt-2">{trend}</div>}
    </div>
  );
}
