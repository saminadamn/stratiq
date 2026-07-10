import type { BenchmarkResultDto, MetricUnit } from '@stratiq/shared';
import { formatCurrency, formatNumber, formatPercent } from '../../lib/format';

interface BenchmarkCardProps {
  label: string;
  unit: MetricUnit;
  benchmark: BenchmarkResultDto | null;
  isLoading: boolean;
}

function formatByUnit(value: number | null, unit: MetricUnit): string {
  if (unit === 'CURRENCY') return formatCurrency(value);
  if (unit === 'PERCENTAGE') return formatPercent(value);
  return formatNumber(value);
}

// One metric's current-vs-previous-period comparison (see benchmark-engine.
// service.ts) — "current" is the latest period actually present in the
// dataset, not necessarily this calendar month.
export function BenchmarkCard({ label, unit, benchmark, isLoading }: BenchmarkCardProps): JSX.Element {
  const changeColor =
    benchmark?.changePercent === null || benchmark?.changePercent === undefined
      ? 'text-slate-500'
      : benchmark.changePercent >= 0
        ? 'text-emerald-700'
        : 'text-red-700';

  return (
    <div className="rounded-xl border border-slate-200/70 bg-white shadow-card p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      {isLoading || !benchmark ? (
        <p className="mt-2 text-sm text-slate-400">Loading…</p>
      ) : (
        <>
          <p className="mt-1 text-2xl font-semibold text-slate-900">
            {formatByUnit(benchmark.currentValue, unit)}
          </p>
          <p className="mt-1 text-xs text-slate-500">{benchmark.currentPeriodLabel}</p>
          <p className={`mt-2 text-sm font-medium ${changeColor}`}>
            {benchmark.changePercent !== null ? formatPercent(benchmark.changePercent) : '—'}
            <span className="ml-1 font-normal text-slate-400">
              vs {formatByUnit(benchmark.previousValue, unit)} in {benchmark.previousPeriodLabel}
            </span>
          </p>
        </>
      )}
    </div>
  );
}
