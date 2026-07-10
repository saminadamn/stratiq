import { useEffect, useRef, useState } from 'react';
import type {
  AnalyticsFiltersDto,
  BenchmarkResultDto,
  ExecutiveDashboardDto,
  TrendAnalysisDto,
} from '@stratiq/shared';
import { useAuth } from '../../auth/auth-context';
import { ApiError } from '../../lib/api-client';
import { getExecutiveDashboard } from '../../lib/analytics-api';
import { getBenchmark, getTrend } from '../../lib/intelligence-api';
import { formatCurrency, formatNumber, formatPercent } from '../../lib/format';
import { BarCategoryChart } from '../../components/charts/BarCategoryChart';
import { ChartCard } from '../../components/charts/ChartCard';
import { LineTrendChart } from '../../components/charts/LineTrendChart';
import { PieBreakdownChart } from '../../components/charts/PieBreakdownChart';
import { AlertsPanel } from '../../components/analytics/AlertsPanel';
import { BenchmarkCard } from '../../components/analytics/BenchmarkCard';
import { DecisionIntelligencePanel } from '../../components/analytics/DecisionIntelligencePanel';
import { ExportMenu } from '../../components/analytics/ExportMenu';
import { FilterBar } from '../../components/analytics/FilterBar';
import { InsightsPanel } from '../../components/analytics/InsightsPanel';
import { KpiCard } from '../../components/analytics/KpiCard';
import { PredictionsPanel } from '../../components/analytics/PredictionsPanel';
import { SavedViewsMenu } from '../../components/analytics/SavedViewsMenu';
import { TrendIndicator } from '../../components/analytics/TrendIndicator';

type ViewMode = 'EXECUTIVE' | 'MANAGER' | 'ANALYST';

const VIEW_MODES: Array<{ mode: ViewMode; label: string; description: string }> = [
  {
    mode: 'EXECUTIVE',
    label: 'Executive',
    description: 'Headline KPIs and strategic recommendations only',
  },
  { mode: 'MANAGER', label: 'Manager', description: 'Operational detail — orders, stock, alerts' },
  { mode: 'ANALYST', label: 'Analyst', description: 'Everything, full detail' },
];

export function ExecutiveDashboardPage(): JSX.Element {
  const { organizations } = useAuth();
  const organizationId = organizations[0]?.id;

  const [filters, setFilters] = useState<AnalyticsFiltersDto>({});
  const [viewMode, setViewMode] = useState<ViewMode>('EXECUTIVE');
  const [dashboard, setDashboard] = useState<ExecutiveDashboardDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revenueTrend, setRevenueTrend] = useState<TrendAnalysisDto | null>(null);
  const [revenueBenchmark, setRevenueBenchmark] = useState<BenchmarkResultDto | null>(null);
  const [profitMarginBenchmark, setProfitMarginBenchmark] = useState<BenchmarkResultDto | null>(
    null,
  );
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!organizationId) {
      return;
    }
    setError(null);
    getExecutiveDashboard(organizationId, filters)
      .then(setDashboard)
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : 'Unable to load dashboard.'),
      );
  }, [organizationId, filters]);

  // Trend/benchmark are computed against the whole dataset (not the current
  // filter set) — see Sprint 4's Trend Detection/Benchmark engines — so they
  // only need to refetch when the organization changes.
  useEffect(() => {
    if (!organizationId) {
      return;
    }
    getTrend(organizationId, 'revenue')
      .then(setRevenueTrend)
      .catch(() => setRevenueTrend(null));
    getBenchmark(organizationId, 'revenue', 'MONTH')
      .then(setRevenueBenchmark)
      .catch(() => setRevenueBenchmark(null));
    getBenchmark(organizationId, 'profitMargin', 'MONTH')
      .then(setProfitMarginBenchmark)
      .catch(() => setProfitMarginBenchmark(null));
  }, [organizationId]);

  if (!organizationId) {
    return <p className="text-sm text-slate-500">No organization found.</p>;
  }

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  const isLoading = !dashboard;
  const isManager = viewMode === 'MANAGER';
  const isAnalyst = viewMode === 'ANALYST';
  // Operational detail (stock, per-order granularity) matters to
  // Manager/Analyst but is noise for a strategic Executive view; the
  // Decision Intelligence panel already turns the same underlying data into
  // an executive-level recommendation, so nothing is lost, just re-leveled.
  const showOperationalDetail = isManager || isAnalyst;

  return (
    <div>
      <div className="mb-4 flex flex-col gap-4 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">
            Executive Overview
          </h1>
          <p className="text-sm text-slate-500">
            {VIEW_MODES.find((v) => v.mode === viewMode)?.description}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-lg border border-slate-200 bg-white p-0.5">
            {VIEW_MODES.map((option) => (
              <button
                key={option.mode}
                type="button"
                onClick={() => setViewMode(option.mode)}
                aria-pressed={viewMode === option.mode}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  viewMode === option.mode
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <SavedViewsMenu dashboardType="EXECUTIVE" currentFilters={filters} onApply={setFilters} />
          <ExportMenu dashboardType="EXECUTIVE" filters={filters} pngTargetRef={contentRef} />
        </div>
      </div>

      <FilterBar
        filters={filters}
        onChange={setFilters}
        categoryOptions={dashboard?.revenueByCategory.map((c) => c.label)}
        regionOptions={dashboard?.revenueByRegion.map((r) => r.label)}
      />

      <div ref={contentRef}>
        <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          <KpiCard
            label="Revenue"
            value={formatCurrency(dashboard?.kpis.revenue ?? null)}
            trend={
              revenueTrend ? (
                <TrendIndicator
                  direction={revenueTrend.direction}
                  averageChangePercent={revenueTrend.averageChangePercent}
                />
              ) : undefined
            }
          />
          <KpiCard
            label="Gross Profit"
            value={formatCurrency(dashboard?.kpis.grossProfit ?? null)}
          />
          <KpiCard
            label="Growth (MoM)"
            value={formatPercent(dashboard?.kpis.monthlyGrowthRate ?? null)}
          />
          <KpiCard
            label="Active Customers"
            value={formatNumber(dashboard?.kpis.activeCustomers ?? null)}
          />
          {showOperationalDetail && (
            <>
              <KpiCard label="Orders" value={formatNumber(dashboard?.kpis.totalOrders ?? null)} />
              <KpiCard
                label="Inventory Status"
                value={
                  dashboard?.inventoryStatus
                    ? `${dashboard.inventoryStatus.lowStockCount}/${dashboard.inventoryStatus.totalSkus} low`
                    : '—'
                }
              />
              <KpiCard label="Top Product" value={dashboard?.topProduct?.productName ?? '—'} />
              <KpiCard
                label="Low Stock Alerts"
                value={formatNumber(dashboard?.lowStockAlerts.length ?? null)}
              />
            </>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ChartCard
            title="Monthly Revenue Trend"
            isLoading={isLoading}
            isEmpty={dashboard?.monthlyRevenueTrend.length === 0}
          >
            <LineTrendChart data={dashboard?.monthlyRevenueTrend ?? []} />
          </ChartCard>
          {showOperationalDetail && (
            <ChartCard
              title="Orders Over Time"
              isLoading={isLoading}
              isEmpty={dashboard?.ordersOverTime.length === 0}
            >
              <LineTrendChart data={dashboard?.ordersOverTime ?? []} />
            </ChartCard>
          )}
          <ChartCard
            title="Revenue by Category"
            isLoading={isLoading}
            isEmpty={dashboard?.revenueByCategory.length === 0}
          >
            <BarCategoryChart data={dashboard?.revenueByCategory ?? []} />
          </ChartCard>
          {showOperationalDetail && (
            <ChartCard
              title="Revenue by Region"
              isLoading={isLoading}
              isEmpty={dashboard?.revenueByRegion.length === 0}
            >
              <PieBreakdownChart data={dashboard?.revenueByRegion ?? []} />
            </ChartCard>
          )}
        </div>

        {showOperationalDetail && dashboard && dashboard.lowStockAlerts.length > 0 && (
          <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
            <h3 className="mb-2 text-sm font-semibold text-amber-900">Low Stock Alerts</h3>
            <ul className="space-y-1 text-sm text-amber-800">
              {dashboard.lowStockAlerts.map((product) => (
                <li key={product.productId}>
                  {product.productName} — {product.stockLevel} in stock
                  {product.reorderLevel !== null ? ` (reorder at ${product.reorderLevel})` : ''}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <BenchmarkCard
            label="Revenue (Month over Month)"
            unit="CURRENCY"
            benchmark={revenueBenchmark}
            isLoading={!revenueBenchmark}
          />
          <BenchmarkCard
            label="Profit Margin (Month over Month)"
            unit="PERCENTAGE"
            benchmark={profitMarginBenchmark}
            isLoading={!profitMarginBenchmark}
          />
        </div>

        {showOperationalDetail && (
          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <InsightsPanel organizationId={organizationId} />
            <AlertsPanel organizationId={organizationId} />
          </div>
        )}

        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <PredictionsPanel organizationId={organizationId} />
          <DecisionIntelligencePanel organizationId={organizationId} />
        </div>
      </div>
    </div>
  );
}
