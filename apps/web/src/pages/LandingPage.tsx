import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../auth/auth-context';

const PIPELINE_STEPS = [
  { label: 'Upload operational data', detail: 'CSV in, cleaned and validated in minutes.' },
  { label: 'Predict business performance', detail: 'Forecasts, churn risk, customer segments.' },
  { label: 'Identify root causes', detail: 'Why a metric moved, not just that it did.' },
  {
    label: 'Generate executive recommendations',
    detail: 'Prioritized actions with owners and ROI.',
  },
];

// The public entry point at "/" — unauthenticated visitors land here instead
// of bouncing straight to /login; a signed-in user is sent on to the
// dashboard immediately (see App.tsx, which now routes "/" here directly).
export function LandingPage(): JSX.Element {
  const { user, isLoading } = useAuth();

  if (!isLoading && user) {
    return <Navigate to="/analytics/executive" replace />;
  }

  return (
    <div className="min-h-screen bg-[#F8F9FB] bg-[radial-gradient(circle_at_top,theme(colors.teal.50),transparent_55%)]">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">
            S
          </div>
          <span className="text-base font-semibold tracking-tight text-slate-900">StratIQ</span>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900">
            Log in
          </Link>
          <Link
            to="/signup"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-500"
          >
            Get started
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 pb-24 pt-12 text-center sm:pt-20">
        <span className="inline-flex items-center rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-teal-700">
          AI Business Intelligence Platform
        </span>

        <div className="mx-auto mt-8 max-w-2xl space-y-1.5">
          {PIPELINE_STEPS.map((step) => (
            <p
              key={step.label}
              className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl"
            >
              {step.label}.
            </p>
          ))}
        </div>

        <p className="mx-auto mt-6 max-w-xl text-base text-slate-500">
          StratIQ turns raw operational data into the reasoning behind executive decisions —
          deterministic, auditable, and ready to hand to a CEO.
        </p>

        <div className="mt-8 flex items-center justify-center gap-3">
          <Link
            to="/signup"
            className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-500"
          >
            Get started
          </Link>
          <Link
            to="/login"
            className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
          >
            Log in
          </Link>
        </div>

        <div className="mt-20 grid grid-cols-1 gap-4 text-left sm:grid-cols-2 lg:grid-cols-4">
          {PIPELINE_STEPS.map((step, index) => (
            <div
              key={step.label}
              className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-card"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-50 text-sm font-semibold text-teal-700">
                {index + 1}
              </div>
              <p className="mt-3 text-sm font-semibold text-slate-900">{step.label}</p>
              <p className="mt-1 text-sm text-slate-500">{step.detail}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
