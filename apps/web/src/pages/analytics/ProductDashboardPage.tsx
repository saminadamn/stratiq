import { useEffect, useRef, useState } from 'react';
import type { AnalyticsFiltersDto, ProductDashboardDto } from '@stratiq/shared';
import { useAuth } from '../../auth/auth-context';
import { ApiError } from '../../lib/api-client';
import { getProductDashboard } from '../../lib/analytics-api';
import { formatCurrency, formatNumber } from '../../lib/format';
import { BarCategoryChart } from '../../components/charts/BarCategoryChart';
import { ChartCard } from '../../components/charts/ChartCard';
import { PieBreakdownChart } from '../../components/charts/PieBreakdownChart';
import { ExportMenu } from '../../components/analytics/ExportMenu';
import { FilterBar } from '../../components/analytics/FilterBar';
import { SavedViewsMenu } from '../../components/analytics/SavedViewsMenu';

function ProductTable({
  title,
  rows,
}: {
  title: string;
  rows: ProductDashboardDto['bestSellers'];
}): JSX.Element {
  return (
    <ChartCard title={title} isEmpty={rows.length === 0}>
      <div className="h-full overflow-y-auto">
        <table className="min-w-full text-xs">
          <thead>
            <tr className="text-left text-slate-500">
              <th className="px-2 py-1">Product</th>
              <th className="px-2 py-1">Revenue</th>
              <th className="px-2 py-1">Profit</th>
              <th className="px-2 py-1">Units</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((product) => (
              <tr key={product.productId} className="border-t border-slate-100">
                <td className="px-2 py-1 text-slate-700">{product.productName}</td>
                <td className="px-2 py-1 text-slate-700">{formatCurrency(product.revenue)}</td>
                <td className="px-2 py-1 text-slate-700">{formatCurrency(product.profit)}</td>
                <td className="px-2 py-1 text-slate-700">{formatNumber(product.unitsSold)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ChartCard>
  );
}

export function ProductDashboardPage(): JSX.Element {
  const { organizations } = useAuth();
  const organizationId = organizations[0]?.id;

  const [filters, setFilters] = useState<AnalyticsFiltersDto>({});
  const [dashboard, setDashboard] = useState<ProductDashboardDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!organizationId) {
      return;
    }
    setError(null);
    getProductDashboard(organizationId, filters)
      .then(setDashboard)
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

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Product Analytics</h1>
          <p className="text-sm text-slate-500">Which products drive the business?</p>
        </div>
        <div className="flex items-center gap-3">
          <SavedViewsMenu dashboardType="PRODUCT" currentFilters={filters} onApply={setFilters} />
          <ExportMenu dashboardType="PRODUCT" filters={filters} pngTargetRef={contentRef} />
        </div>
      </div>

      <FilterBar
        filters={filters}
        onChange={setFilters}
        categoryOptions={dashboard?.categoryPerformance.map((c) => c.label)}
      />

      <div ref={contentRef} className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ProductTable title="Best Sellers" rows={dashboard?.bestSellers ?? []} />
        <ProductTable title="Worst Sellers" rows={dashboard?.worstSellers ?? []} />
        <ChartCard
          title="Category Performance"
          isLoading={isLoading}
          isEmpty={dashboard?.categoryPerformance.length === 0}
        >
          <BarCategoryChart data={dashboard?.categoryPerformance ?? []} color="#059669" />
        </ChartCard>
        <ChartCard
          title="Product Contribution (% of revenue)"
          isLoading={isLoading}
          isEmpty={dashboard?.productContribution.length === 0}
        >
          <PieBreakdownChart data={dashboard?.productContribution ?? []} />
        </ChartCard>
      </div>
    </div>
  );
}
