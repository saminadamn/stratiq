import { useEffect, useRef, useState } from 'react';
import type { AnalyticsFiltersDto, InventoryDashboardDto, StockLevelDto } from '@stratiq/shared';
import { useAuth } from '../../auth/auth-context';
import { ApiError } from '../../lib/api-client';
import { getInventoryDashboard } from '../../lib/analytics-api';
import { formatCurrency, formatNumber } from '../../lib/format';
import { BarCategoryChart } from '../../components/charts/BarCategoryChart';
import { ChartCard } from '../../components/charts/ChartCard';
import { LineTrendChart } from '../../components/charts/LineTrendChart';
import { ExportMenu } from '../../components/analytics/ExportMenu';
import { FilterBar } from '../../components/analytics/FilterBar';
import { KpiCard } from '../../components/analytics/KpiCard';
import { SavedViewsMenu } from '../../components/analytics/SavedViewsMenu';

const STATUS_STYLES: Record<StockLevelDto['status'], string> = {
  LOW: 'bg-red-50 text-red-700',
  NORMAL: 'bg-green-50 text-green-700',
  OVERSTOCK: 'bg-amber-50 text-amber-700',
};

const PAGE_SIZE = 15;

export function InventoryDashboardPage(): JSX.Element {
  const { organizations } = useAuth();
  const organizationId = organizations[0]?.id;

  const [filters, setFilters] = useState<AnalyticsFiltersDto>({});
  const [dashboard, setDashboard] = useState<InventoryDashboardDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!organizationId) {
      return;
    }
    setError(null);
    getInventoryDashboard(organizationId, filters)
      .then((result) => {
        setDashboard(result);
        setPage(1);
      })
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : 'Unable to load dashboard.'),
      );
  }, [organizationId, filters]);

  if (!organizationId) {
    return <p className="text-sm text-slate-500">No organization found.</p>;
  }
  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  const isLoading = !dashboard;
  const stockLevels = dashboard?.stockLevels ?? [];
  const totalPages = Math.max(1, Math.ceil(stockLevels.length / PAGE_SIZE));
  const pageRows = stockLevels.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">Inventory</h1>
          <p className="text-sm text-slate-500">Operational efficiency at a glance.</p>
        </div>
        <div className="flex items-center gap-3">
          <SavedViewsMenu dashboardType="INVENTORY" currentFilters={filters} onApply={setFilters} />
          <ExportMenu dashboardType="INVENTORY" filters={filters} pngTargetRef={contentRef} />
        </div>
      </div>

      <FilterBar
        filters={filters}
        onChange={setFilters}
        categoryOptions={dashboard?.categoryDistribution.map((c) => c.label)}
      />

      <div ref={contentRef}>
        <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          <KpiCard label="Total SKUs" value={formatNumber(dashboard?.totalSkus ?? null)} />
          <KpiCard
            label="Inventory Value"
            value={formatCurrency(dashboard?.totalInventoryValue ?? null)}
          />
          <KpiCard
            label="Inventory Turnover"
            value={dashboard?.inventoryTurnover?.toFixed(2) ?? '—'}
          />
          <KpiCard
            label="Low Stock"
            value={formatNumber(dashboard?.lowStockProducts.length ?? null)}
          />
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ChartCard
            title="Stock Levels (lowest first)"
            isLoading={isLoading}
            isEmpty={stockLevels.length === 0}
          >
            <BarCategoryChart
              data={stockLevels
                .slice(0, 15)
                .map((level) => ({ label: level.productName, value: level.stockLevel }))}
              color="#0891b2"
            />
          </ChartCard>
          <ChartCard
            title="Category Distribution"
            isLoading={isLoading}
            isEmpty={dashboard?.categoryDistribution.length === 0}
          >
            <BarCategoryChart data={dashboard?.categoryDistribution ?? []} color="#7c3aed" />
          </ChartCard>
          <ChartCard
            title="Inventory Trend"
            isLoading={isLoading}
            isEmpty={!dashboard?.inventoryTrend || dashboard.inventoryTrend.length === 0}
          >
            <LineTrendChart data={dashboard?.inventoryTrend ?? []} />
          </ChartCard>
        </div>

        <div className="rounded-xl border border-slate-200/70 bg-white shadow-card p-4">
          <h3 className="mb-3 text-sm font-semibold text-slate-900">Stock Levels</h3>
          {pageRows.length === 0 ? (
            <p className="text-sm text-slate-400">No inventory data available.</p>
          ) : (
            <>
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500">
                    <th className="px-2 py-1">Product</th>
                    <th className="px-2 py-1">Category</th>
                    <th className="px-2 py-1">Stock</th>
                    <th className="px-2 py-1">Reorder Level</th>
                    <th className="px-2 py-1">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((level) => (
                    <tr key={level.productId} className="border-t border-slate-100">
                      <td className="px-2 py-1 text-slate-700">{level.productName}</td>
                      <td className="px-2 py-1 text-slate-700">{level.category ?? '—'}</td>
                      <td className="px-2 py-1 text-slate-700">{level.stockLevel}</td>
                      <td className="px-2 py-1 text-slate-700">{level.reorderLevel ?? '—'}</td>
                      <td className="px-2 py-1">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[level.status]}`}
                        >
                          {level.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-3 flex items-center justify-between text-sm text-slate-500">
                <span>
                  Page {page} of {totalPages} · {stockLevels.length.toLocaleString()} products
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="rounded-md border border-slate-300 px-2 py-1 disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="rounded-md border border-slate-300 px-2 py-1 disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
