// Deliberately empty of business logic — analytics/dashboard widgets are out
// of scope for this step (see docs/ARCHITECTURE.md). This page exists to prove
// the auth flow end-to-end: reaching it at all means signup/login/refresh and
// route protection are working.
export function DashboardPage(): JSX.Element {
  return (
    <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-slate-300 text-slate-400">
      Dashboard content goes here.
    </div>
  );
}
