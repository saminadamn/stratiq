import { CUSTOMER_SEGMENTS, type AnalyticsFiltersDto, type CustomerSegment } from '@stratiq/shared';

interface FilterBarProps {
  filters: AnalyticsFiltersDto;
  onChange: (filters: AnalyticsFiltersDto) => void;
  categoryOptions?: string[] | undefined;
  regionOptions?: string[] | undefined;
  showCustomerSegment?: boolean | undefined;
}

// One filter bar shared by every dashboard page — date range is always
// shown; category/region/segment only appear when the caller has options
// for them (a dataset without a category column shouldn't offer a category
// filter that can never match anything).
export function FilterBar({
  filters,
  onChange,
  categoryOptions,
  regionOptions,
  showCustomerSegment,
}: FilterBarProps): JSX.Element {
  function update(patch: Partial<AnalyticsFiltersDto>): void {
    onChange({ ...filters, ...patch });
  }

  return (
    <div className="mb-6 flex flex-wrap items-end gap-3 rounded-xl border border-slate-200/70 bg-white shadow-card p-4">
      <div>
        <label className="block text-xs font-medium text-slate-500">From</label>
        <input
          type="date"
          value={filters.dateFrom ?? ''}
          onChange={(e) => update({ dateFrom: e.target.value || undefined })}
          className="mt-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-500">To</label>
        <input
          type="date"
          value={filters.dateTo ?? ''}
          onChange={(e) => update({ dateTo: e.target.value || undefined })}
          className="mt-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
        />
      </div>

      {categoryOptions && categoryOptions.length > 0 && (
        <div>
          <label className="block text-xs font-medium text-slate-500">Category</label>
          <select
            value={filters.category ?? ''}
            onChange={(e) => update({ category: e.target.value || undefined })}
            className="mt-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          >
            <option value="">All</option>
            {categoryOptions.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>
      )}

      {regionOptions && regionOptions.length > 0 && (
        <div>
          <label className="block text-xs font-medium text-slate-500">Region</label>
          <select
            value={filters.region ?? ''}
            onChange={(e) => update({ region: e.target.value || undefined })}
            className="mt-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          >
            <option value="">All</option>
            {regionOptions.map((region) => (
              <option key={region} value={region}>
                {region}
              </option>
            ))}
          </select>
        </div>
      )}

      {showCustomerSegment && (
        <div>
          <label className="block text-xs font-medium text-slate-500">Segment</label>
          <select
            value={filters.customerSegment ?? ''}
            onChange={(e) =>
              update({
                customerSegment: (e.target.value || undefined) as CustomerSegment | undefined,
              })
            }
            className="mt-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          >
            <option value="">All</option>
            {CUSTOMER_SEGMENTS.map((segment) => (
              <option key={segment} value={segment}>
                {segment}
              </option>
            ))}
          </select>
        </div>
      )}

      <button
        type="button"
        onClick={() => onChange({})}
        className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
      >
        Clear filters
      </button>
    </div>
  );
}
