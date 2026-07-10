import type { ReactNode, RefObject } from 'react';

interface ChartCardProps {
  title: string;
  isLoading?: boolean;
  isEmpty?: boolean;
  error?: string | null;
  children: ReactNode;
  // Attached to the chart's own container (not the whole card) so PNG export
  // captures just the chart, not the title/actions row around it.
  chartRef?: RefObject<HTMLDivElement>;
  actions?: ReactNode;
}

// One consistent loading/empty/error/content state machine for every chart on
// every dashboard, instead of each page reimplementing it slightly differently.
export function ChartCard({
  title,
  isLoading,
  isEmpty,
  error,
  children,
  chartRef,
  actions,
}: ChartCardProps): JSX.Element {
  return (
    <div className="rounded-xl border border-slate-200/70 bg-white shadow-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        {actions}
      </div>
      <div ref={chartRef} className="h-64 bg-white">
        {error ? (
          <div className="flex h-full items-center justify-center text-sm text-red-600">
            {error}
          </div>
        ) : isLoading ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-400">
            Loading…
          </div>
        ) : isEmpty ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-400">
            No data available
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
