import type { CohortRowDto } from '@stratiq/shared';

function intensityClasses(value: number, base: number): string {
  if (base === 0) {
    return 'bg-slate-50 text-slate-400';
  }
  const ratio = value / base;
  if (ratio >= 0.8) {
    return 'bg-indigo-600 text-white';
  }
  if (ratio >= 0.5) {
    return 'bg-indigo-400 text-white';
  }
  if (ratio >= 0.25) {
    return 'bg-indigo-200 text-indigo-900';
  }
  if (ratio > 0) {
    return 'bg-indigo-100 text-indigo-900';
  }
  return 'bg-slate-50 text-slate-400';
}

// A heatmap-style retention grid, not a recharts chart — cohort analysis is
// inherently tabular (one row per acquisition month, one column per period
// since first purchase), so a styled <table> communicates it more directly
// than forcing it into a line/bar chart shape.
export function CohortTable({ rows }: { rows: CohortRowDto[] }): JSX.Element {
  const maxPeriods = Math.max(0, ...rows.map((row) => row.retainedCustomersByPeriod.length));

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-xs">
        <thead>
          <tr>
            <th className="px-2 py-1 text-left font-medium text-slate-500">Cohort</th>
            {Array.from({ length: maxPeriods }, (_, index) => (
              <th key={index} className="px-2 py-1 text-center font-medium text-slate-500">
                M{index}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const base = row.retainedCustomersByPeriod[0] ?? 0;
            return (
              <tr key={row.cohortPeriod}>
                <td className="whitespace-nowrap px-2 py-1 font-medium text-slate-700">
                  {row.cohortPeriod}
                </td>
                {row.retainedCustomersByPeriod.map((value, index) => (
                  <td
                    key={index}
                    className={`px-2 py-1 text-center ${intensityClasses(value, base)}`}
                  >
                    {value}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
