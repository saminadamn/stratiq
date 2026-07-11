import { useEffect, useRef, useState } from 'react';
import type { ReportDto, ReportStatus, ReportType } from '@stratiq/shared';
import { useAuth } from '../auth/auth-context';
import { ApiError } from '../lib/api-client';
import { downloadBlob } from '../lib/download-blob';
import { downloadReport, generateReport, listReports } from '../lib/reports-api';

const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  EXECUTIVE_SUMMARY: 'Executive Summary',
  KPI: 'KPI Report',
  PREDICTION: 'Prediction Report',
  RECOMMENDATION: 'Recommendation Report',
};

const REPORT_TYPES: ReportType[] = ['EXECUTIVE_SUMMARY', 'KPI', 'PREDICTION', 'RECOMMENDATION'];

// v1.1 (Distributed Systems Showcase): generation is queued, not
// synchronous (see docs/adr/0007-bullmq-job-queue.md), so a report sits in
// PENDING/PROCESSING until a worker finishes it — these are the only two
// non-terminal states worth polling for.
const STATUS_STYLE: Record<ReportStatus, string> = {
  PENDING: 'border-slate-200 bg-slate-50 text-slate-600',
  PROCESSING: 'border-indigo-200 bg-indigo-50 text-indigo-700',
  COMPLETE: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  FAILED: 'border-red-200 bg-red-50 text-red-700',
};
const STATUS_LABELS: Record<ReportStatus, string> = {
  PENDING: 'Pending',
  PROCESSING: 'Processing',
  COMPLETE: 'Complete',
  FAILED: 'Failed',
};
const POLL_INTERVAL_MS = 2000;

function StatusBadge({ status }: { status: ReportStatus }): JSX.Element {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

// The Download Center: generate a report on demand, then browse/download
// everything ever generated (Report History) — composed entirely from data
// the dashboards/predictions/decisions already produce (see
// docs/ARCHITECTURE.md's Module 3 decisions).
export function ReportsPage(): JSX.Element {
  const { organizations } = useAuth();
  const organizationId = organizations[0]?.id;

  const [reports, setReports] = useState<ReportDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generatingType, setGeneratingType] = useState<ReportType | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const reportsRef = useRef<ReportDto[] | null>(null);
  reportsRef.current = reports;

  function loadReports(orgId: string): void {
    setError(null);
    listReports(orgId)
      .then(setReports)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Unable to load reports.'));
  }

  useEffect(() => {
    if (organizationId) {
      loadReports(organizationId);
    }
  }, [organizationId]);

  // Poll only while something is still generating — a report that's been
  // COMPLETE/FAILED for a while shouldn't keep this page hitting the API
  // every couple seconds.
  useEffect(() => {
    if (!organizationId) {
      return;
    }
    const interval = setInterval(() => {
      const hasPending = reportsRef.current?.some(
        (r) => r.status === 'PENDING' || r.status === 'PROCESSING',
      );
      if (hasPending) {
        loadReports(organizationId);
      }
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [organizationId]);

  async function handleGenerate(type: ReportType): Promise<void> {
    if (!organizationId) {
      return;
    }
    setGeneratingType(type);
    try {
      await generateReport(organizationId, { type });
      loadReports(organizationId);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to generate report.');
    } finally {
      setGeneratingType(null);
    }
  }

  async function handleDownload(report: ReportDto): Promise<void> {
    if (!organizationId) {
      return;
    }
    setDownloadingId(report.id);
    try {
      const blob = await downloadReport(organizationId, report.id);
      downloadBlob(blob, report.fileName ?? 'report.pdf');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to download report.');
    } finally {
      setDownloadingId(null);
    }
  }

  if (!organizationId) {
    return <p className="text-sm text-slate-500">No organization found.</p>;
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">Reports</h1>
        <p className="text-sm text-slate-500">Generate executive reports and download past ones.</p>
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <div className="mb-6 rounded-xl border border-slate-200/70 bg-white shadow-card p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Generate a report</h2>
        <div className="flex flex-wrap gap-2">
          {REPORT_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              disabled={generatingType !== null}
              onClick={() => void handleGenerate(type)}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              {generatingType === type ? 'Generating…' : REPORT_TYPE_LABELS[type]}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200/70 bg-white shadow-card p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Report History</h2>
        {!reports ? (
          <p className="text-sm text-slate-400">Loading…</p>
        ) : reports.length === 0 ? (
          <p className="text-sm text-slate-400">No reports generated yet.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                <th className="pb-2">Type</th>
                <th className="pb-2">Status</th>
                <th className="pb-2">File</th>
                <th className="pb-2">Generated By</th>
                <th className="pb-2">Generated At</th>
                <th className="pb-2" />
              </tr>
            </thead>
            <tbody>
              {reports.map((report) => (
                <tr key={report.id} className="border-b border-slate-100 last:border-0">
                  <td className="py-2">{REPORT_TYPE_LABELS[report.type]}</td>
                  <td className="py-2">
                    <StatusBadge status={report.status} />
                    {report.status === 'FAILED' && report.errorMessage && (
                      <p className="mt-1 text-xs text-red-600">{report.errorMessage}</p>
                    )}
                  </td>
                  <td className="py-2 text-slate-500">{report.fileName ?? '—'}</td>
                  <td className="py-2 text-slate-500">{report.generatedBy.name}</td>
                  <td className="py-2 text-slate-500">
                    {new Date(report.generatedAt).toLocaleString()}
                  </td>
                  <td className="py-2 text-right">
                    <button
                      type="button"
                      disabled={report.status !== 'COMPLETE' || downloadingId === report.id}
                      onClick={() => void handleDownload(report)}
                      className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    >
                      {downloadingId === report.id ? 'Downloading…' : 'Download'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
