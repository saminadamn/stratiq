import type { ValidationIssueDto } from '@stratiq/shared';

const SEVERITY_STYLES: Record<ValidationIssueDto['severity'], string> = {
  ERROR: 'bg-red-50 text-red-700 ring-red-600/20',
  WARNING: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  INFO: 'bg-slate-50 text-slate-600 ring-slate-500/10',
};

export function ValidationIssuesList({ issues }: { issues: ValidationIssueDto[] }): JSX.Element {
  if (issues.length === 0) {
    return (
      <p className="rounded-md bg-green-50 px-4 py-3 text-sm text-green-700 ring-1 ring-inset ring-green-600/20">
        No issues found — this dataset looks clean.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-slate-100 rounded-md border border-slate-200">
      {issues.map((issue, index) => (
        <li
          key={`${issue.code}-${issue.column ?? 'row'}-${index}`}
          className="flex items-start justify-between gap-4 px-4 py-3"
        >
          <div>
            <p className="text-sm font-medium text-slate-900">{issue.column ?? 'All rows'}</p>
            <p className="text-sm text-slate-500">{issue.message}</p>
          </div>
          <span
            className={`inline-flex flex-shrink-0 items-center rounded-full px-2 py-1 text-xs font-medium ring-1 ring-inset ${SEVERITY_STYLES[issue.severity]}`}
          >
            {issue.severity}
          </span>
        </li>
      ))}
    </ul>
  );
}
