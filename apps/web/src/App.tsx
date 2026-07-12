import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth/auth-context';
import { ProtectedRoute } from './auth/protected-route';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { CleaningWizardPage } from './pages/datasets/CleaningWizardPage';
import { DatasetDetailPage } from './pages/datasets/DatasetDetailPage';
import { DatasetsListPage } from './pages/datasets/DatasetsListPage';
import { UploadDatasetPage } from './pages/datasets/UploadDatasetPage';

// The analytics pages pull in recharts + html-to-image, which are large
// enough to noticeably grow the main bundle (~900KB before gzip) for users
// who never visit a dashboard. Code-splitting them keeps the initial load
// fast — relevant to the Sprint 3 "loads under 2 seconds" target — at the
// cost of a brief chunk fetch the first time someone opens a dashboard.
const ExecutiveDashboardPage = lazy(() =>
  import('./pages/analytics/ExecutiveDashboardPage').then((m) => ({
    default: m.ExecutiveDashboardPage,
  })),
);
const CustomerDashboardPage = lazy(() =>
  import('./pages/analytics/CustomerDashboardPage').then((m) => ({
    default: m.CustomerDashboardPage,
  })),
);
const ProductDashboardPage = lazy(() =>
  import('./pages/analytics/ProductDashboardPage').then((m) => ({
    default: m.ProductDashboardPage,
  })),
);
const InventoryDashboardPage = lazy(() =>
  import('./pages/analytics/InventoryDashboardPage').then((m) => ({
    default: m.InventoryDashboardPage,
  })),
);
// v1.0: same code-splitting rationale as the dashboards above — the Reports
// page isn't needed on first load either.
const ReportsPage = lazy(() =>
  import('./pages/ReportsPage').then((m) => ({ default: m.ReportsPage })),
);

function AnalyticsPageFallback(): JSX.Element {
  return <p className="text-sm text-slate-500">Loading dashboard…</p>;
}

export default function App(): JSX.Element {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public landing page — redirects signed-in visitors straight to
              the dashboard itself (see LandingPage.tsx), so this is the only
              "/" route; the dashboard has no separate placeholder route. */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<DashboardLayout />}>
              <Route path="/datasets" element={<DatasetsListPage />} />
              <Route path="/datasets/upload" element={<UploadDatasetPage />} />
              <Route path="/datasets/:datasetId" element={<DatasetDetailPage />} />
              <Route path="/datasets/:datasetId/clean" element={<CleaningWizardPage />} />
              <Route
                path="/analytics/executive"
                element={
                  <Suspense fallback={<AnalyticsPageFallback />}>
                    <ExecutiveDashboardPage />
                  </Suspense>
                }
              />
              <Route
                path="/analytics/customers"
                element={
                  <Suspense fallback={<AnalyticsPageFallback />}>
                    <CustomerDashboardPage />
                  </Suspense>
                }
              />
              <Route
                path="/analytics/products"
                element={
                  <Suspense fallback={<AnalyticsPageFallback />}>
                    <ProductDashboardPage />
                  </Suspense>
                }
              />
              <Route
                path="/analytics/inventory"
                element={
                  <Suspense fallback={<AnalyticsPageFallback />}>
                    <InventoryDashboardPage />
                  </Suspense>
                }
              />
              <Route
                path="/reports"
                element={
                  <Suspense fallback={<AnalyticsPageFallback />}>
                    <ReportsPage />
                  </Suspense>
                }
              />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
