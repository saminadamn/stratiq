function scoreClasses(score: number): string {
  if (score >= 90) {
    return 'bg-green-50 text-green-700 ring-green-600/20';
  }
  if (score >= 70) {
    return 'bg-amber-50 text-amber-700 ring-amber-600/20';
  }
  return 'bg-red-50 text-red-700 ring-red-600/20';
}

export function QualityScoreBadge({ score }: { score: number | null }): JSX.Element {
  if (score === null) {
    return (
      <span className="inline-flex items-center rounded-full bg-slate-50 px-2 py-1 text-xs font-medium text-slate-500 ring-1 ring-inset ring-slate-500/10">
        Not scored
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ring-1 ring-inset ${scoreClasses(score)}`}
    >
      Quality {score}/100
    </span>
  );
}
