import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../auth/auth-context';

const PIPELINE_STEPS = [
  {
    label: 'Data Preparation',
    detail: 'Upload CSV files and automatically clean, validate, and structure your business data.',
  },
  {
    label: 'Predictive Intelligence',
    detail: 'Forecast revenue, identify churn risk, and segment customers.',
  },
  {
    label: 'Decision Intelligence',
    detail: 'Understand the business drivers behind KPI changes with explainable analysis.',
  },
  {
    label: 'Executive Action Plans',
    detail:
      'Receive prioritized recommendations, responsible teams, expected impact, and execution roadmap.',
  },
];

const CAPABILITIES = [
  'Predictive Analytics',
  'Root Cause Analysis',
  'Executive Reporting',
  'Production Ready',
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

        <h1 className="mx-auto mt-8 max-w-2xl text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
          Turn operational data into executive decisions.
        </h1>

        <p className="mx-auto mt-6 max-w-xl text-base text-slate-500">
          Upload your business data to analyze performance, predict trends, identify root causes,
          and generate actionable recommendations — all in one platform.
        </p>

        <div className="mx-auto mt-6 flex max-w-xl flex-wrap items-center justify-center gap-x-5 gap-y-2">
          {CAPABILITIES.map((capability) => (
            <span
              key={capability}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500"
            >
              <svg
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                className="h-4 w-4 text-teal-600"
              >
                <path d="M4 10.5l3.5 3.5L16 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {capability}
            </span>
          ))}
        </div>

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
