import type { EtlLogDto } from '@stratiq/shared';

const LEVEL_DOT: Record<EtlLogDto['level'], string> = {
  INFO: 'bg-slate-400',
  WARN: 'bg-amber-500',
  ERROR: 'bg-red-500',
};

// Renders the ETL job's accumulated stage log (Validating -> Cleaning ->
// Transformation -> Feature Engineering -> Saving) as a vertical timeline —
// the "Processing Logs" view from the Sprint 2 spec. The pipeline runs
// synchronously, so this is the completed log rather than a live stream.
export function ProcessingLog({ logs }: { logs: EtlLogDto[] }): JSX.Element {
  return (
    <ol className="space-y-3">
      {logs.map((entry, index) => (
        <li key={index} className="flex items-start gap-3">
          <span className={`mt-1.5 h-2 w-2 flex-shrink-0 rounded-full ${LEVEL_DOT[entry.level]}`} />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              {entry.stage.replace(/_/g, ' ')}
            </p>
            <p className="text-sm text-slate-700">{entry.message}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
