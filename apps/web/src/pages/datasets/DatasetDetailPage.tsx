import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type {
  DatasetDto,
  DatasetHistoryDto,
  DatasetPreviewDto,
  ValidationReportDto,
} from '@stratiq/shared';
import { useAuth } from '../../auth/auth-context';
import {
  getDataset,
  getDatasetHistory,
  getValidationReport,
  previewDataset,
} from '../../lib/dataset-api';
import { QualityScoreBadge } from '../../components/datasets/QualityScoreBadge';
import { ValidationIssuesList } from '../../components/datasets/ValidationIssuesList';

type Tab = 'preview' | 'validation' | 'history';
const PAGE_SIZE = 25;

export function DatasetDetailPage(): JSX.Element {
  const { datasetId } = useParams<{ datasetId: string }>();
  const { organizations } = useAuth();
  const organizationId = organizations[0]?.id;

  const [dataset, setDataset] = useState<DatasetDto | null>(null);
  const [tab, setTab] = useState<Tab>('preview');
  const [preview, setPreview] = useState<DatasetPreviewDto | null>(null);
  const [validationReport, setValidationReport] = useState<ValidationReportDto | null>(null);
  const [history, setHistory] = useState<DatasetHistoryDto | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!organizationId || !datasetId) {
      return;
    }
    getDataset(organizationId, datasetId)
      .then(setDataset)
      .catch(() => undefined);
  }, [organizationId, datasetId]);

  useEffect(() => {
    if (!organizationId || !datasetId || tab !== 'preview') {
      return;
    }
    previewDataset(organizationId, datasetId, { page, pageSize: PAGE_SIZE })
      .then(setPreview)
      .catch(() => undefined);
  }, [organizationId, datasetId, tab, page]);

  useEffect(() => {
    if (!organizationId || !datasetId || tab !== 'validation') {
      return;
    }
    getValidationReport(organizationId, datasetId)
      .then(setValidationReport)
      .catch(() => undefined);
  }, [organizationId, datasetId, tab]);

  useEffect(() => {
    if (!organizationId || !datasetId || tab !== 'history') {
      return;
    }
    getDatasetHistory(organizationId, datasetId)
      .then(setHistory)
      .catch(() => undefined);
  }, [organizationId, datasetId, tab]);

  if (!organizationId || !datasetId || !dataset) {
    return <p className="text-sm text-slate-500">Loading…</p>;
  }

  const totalPages = preview ? Math.max(1, Math.ceil(preview.totalRows / PAGE_SIZE)) : 1;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">{dataset.name}</h1>
          <p className="text-sm text-slate-500">
            {(dataset.latestVersion?.rowCount ?? 0).toLocaleString()} rows ·{' '}
            {dataset.latestVersion?.columnCount ?? 0} columns · v
            {dataset.latestVersion?.versionNumber ?? 1}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <QualityScoreBadge score={dataset.latestVersion?.qualityScore ?? null} />
          <Link
            to={`/datasets/${dataset.id}/clean`}
            className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-500"
          >
            Clean dataset
          </Link>
        </div>
      </div>

      <div className="mb-4 flex gap-1 border-b border-slate-200">
        {(['preview', 'validation', 'history'] satisfies Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-3 py-2 text-sm font-medium capitalize ${
              tab === t
                ? 'border-b-2 border-indigo-600 text-indigo-600'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t === 'validation' ? 'Validation report' : t}
          </button>
        ))}
      </div>

      {tab === 'preview' &&
        (!preview ? (
          <p className="text-sm text-slate-500">Loading preview…</p>
        ) : preview.rows.length === 0 ? (
          <p className="text-sm text-slate-500">No rows to display.</p>
        ) : (
          <>
            <div className="overflow-x-auto rounded-xl border border-slate-200/70 bg-white shadow-card">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    {preview.columns.map((column) => (
                      <th
                        key={column.name}
                        className="px-3 py-2 text-left font-medium text-slate-600"
                      >
                        {column.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {preview.rows.map((row, rowIndex) => (
                    <tr key={rowIndex}>
                      {preview.columns.map((column) => (
                        <td
                          key={column.name}
                          className="whitespace-nowrap px-3 py-2 text-slate-700"
                        >
                          {String(row[column.name] ?? '')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 flex items-center justify-between text-sm text-slate-500">
              <span>
                Page {preview.page} of {totalPages} · {preview.totalRows.toLocaleString()} rows
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="rounded-md border border-slate-300 px-2 py-1 disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="rounded-md border border-slate-300 px-2 py-1 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        ))}

      {tab === 'validation' &&
        (!validationReport ? (
          <p className="text-sm text-slate-500">Loading validation report…</p>
        ) : (
          <ValidationIssuesList issues={validationReport.issues} />
        ))}

      {tab === 'history' &&
        (!history ? (
          <p className="text-sm text-slate-500">Loading history…</p>
        ) : (
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200/70 bg-white shadow-card">
            {history.versions.map((version) => (
              <li
                key={version.versionNumber}
                className="flex items-center justify-between px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    Version {version.versionNumber}
                  </p>
                  <p className="text-xs text-slate-500">
                    {new Date(version.createdAt).toLocaleString()} · {version.createdBy.name} ·{' '}
                    {version.rowCount.toLocaleString()} rows · {version.cleaningMode.toLowerCase()}{' '}
                    cleaning
                    {version.originalFileName ? ` · ${version.originalFileName}` : ''}
                  </p>
                </div>
                <QualityScoreBadge score={version.qualityScore} />
              </li>
            ))}
          </ul>
        ))}
    </div>
  );
}
