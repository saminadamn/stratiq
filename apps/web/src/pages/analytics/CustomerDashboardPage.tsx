import { useEffect, useRef, useState } from 'react';
import type { AnalyticsFiltersDto, CustomerDashboardDto } from '@stratiq/shared';
import { useAuth } from '../../auth/auth-context';
import { ApiError } from '../../lib/api-client';
import { getCustomerDashboard } from '../../lib/analytics-api';
import { formatCurrency, formatNumber, formatPercent } from '../../lib/format';
import { BarCategoryChart } from '../../components/charts/BarCategoryChart';
import { ChartCard } from '../../components/charts/ChartCard';
import { CohortTable } from '../../components/charts/CohortTable';
import { HistogramChart } from '../../components/charts/HistogramChart';
import { PieBreakdownChart } from '../../components/charts/PieBreakdownChart';
import { ExportMenu } from '../../components/analytics/ExportMenu';
import { FilterBar } from '../../components/analytics/FilterBar';
import { KpiCard } from '../../components/analytics/KpiCard';
import { SavedViewsMenu } from '../../components/analytics/SavedViewsMenu';

export function CustomerDashboardPage(): JSX.Element {
  const { organizations } = useAuth();
  const organizationId = organizations[0]?.id;

  const [filters, setFilters] = useState<AnalyticsFiltersDto>({});
  const [dashboard, setDashboard] = useState<CustomerDashboardDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!organizationId) {
      return;
    }
    setError(null);
    getCustomerDashboard(organizationId, filters)
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
  const segmentChartData =
    dashboard?.segmentBreakdown.map((entry) => ({
      label: entry.segment,
      value: entry.customerCount,
    })) ?? [];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">Customer Analytics</h1>
          <p className="text-sm text-slate-500">Understand customer behavior and loyalty.</p>
        </div>
        <div className="flex items-center gap-3">
          <SavedViewsMenu dashboardType="CUSTOMER" currentFilters={filters} onApply={setFilters} />
          <ExportMenu dashboardType="CUSTOMER" filters={filters} pngTargetRef={contentRef} />
        </div>
      </div>

      <FilterBar
        filters={filters}
        onChange={setFilters}
        regionOptions={dashboard?.customerDistributionByRegion.map((r) => r.label)}
        showCustomerSegment
      />

      <div ref={contentRef}>
        <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          <KpiCard label="New Customers" value={formatNumber(dashboard?.newCustomers ?? null)} />
          <KpiCard
            label="Returning Customers"
            value={formatNumber(dashboard?.returningCustomers ?? null)}
          />
          <KpiCard label="Retention Rate" value={formatPercent(dashboard?.retentionRate ?? null)} />
          <KpiCard
            label="Avg. Purchase Frequency"
            value={dashboard?.averagePurchaseFrequency?.toFixed(1) ?? '—'}
          />
          <KpiCard
            label="Customer Lifetime Value"
            value={formatCurrency(dashboard?.customerLifetimeValue ?? null)}
          />
          <KpiCard
            label="Repeat Purchase Rate"
            value={formatPercent(dashboard?.repeatPurchaseRate ?? null)}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ChartCard
            title="Purchase Frequency Histogram"
            isLoading={isLoading}
            isEmpty={dashboard?.purchaseFrequencyHistogram.length === 0}
          >
            <HistogramChart data={dashboard?.purchaseFrequencyHistogram ?? []} />
          </ChartCard>
          <ChartCard
            title="Customer Segmentation (rules-based preview)"
            isLoading={isLoading}
            isEmpty={segmentChartData.length === 0}
          >
            <PieBreakdownChart data={segmentChartData} />
          </ChartCard>
          <ChartCard
            title="Customer Distribution by Region"
            isLoading={isLoading}
            isEmpty={dashboard?.customerDistributionByRegion.length === 0}
          >
            <BarCategoryChart
              data={dashboard?.customerDistributionByRegion ?? []}
              color="#0891b2"
            />
          </ChartCard>
          <ChartCard
            title="Top Customers"
            isLoading={isLoading}
            isEmpty={dashboard?.topCustomers.length === 0}
          >
            <div className="h-full overflow-y-auto">
              <table className="min-w-full text-xs">
                <thead>
                  <tr className="text-left text-slate-500">
                    <th className="px-2 py-1">Customer</th>
                    <th className="px-2 py-1">Orders</th>
                    <th className="px-2 py-1">Total Spent</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard?.topCustomers.map((customer) => (
                    <tr key={customer.customerId} className="border-t border-slate-100">
                      <td className="px-2 py-1 text-slate-700">{customer.customerName}</td>
                      <td className="px-2 py-1 text-slate-700">{customer.orderCount}</td>
                      <td className="px-2 py-1 text-slate-700">
                        {formatCurrency(customer.totalSpent)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ChartCard>
        </div>

        <div className="mt-6 rounded-xl border border-slate-200/70 bg-white shadow-card p-4">
          <h3 className="mb-3 text-sm font-semibold text-slate-900">Cohort Analysis</h3>
          {dashboard && dashboard.cohortAnalysis.length > 0 ? (
            <CohortTable rows={dashboard.cohortAnalysis} />
          ) : (
            <p className="text-sm text-slate-400">No cohort data available.</p>
          )}
        </div>
      </div>
    </div>
  );
}
