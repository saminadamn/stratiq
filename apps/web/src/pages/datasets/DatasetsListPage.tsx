import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { DatasetDto } from '@stratiq/shared';
import { useAuth } from '../../auth/auth-context';
import { deleteDataset, listDatasets } from '../../lib/dataset-api';
import { QualityScoreBadge } from '../../components/datasets/QualityScoreBadge';

export function DatasetsListPage(): JSX.Element {
  const { organizations } = useAuth();
  // Single-organization assumption: the dashboard doesn't have an org
  // switcher yet, so the first membership is treated as "current".
  const organizationId = organizations[0]?.id;

  const [datasets, setDatasets] = useState<DatasetDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!organizationId) {
      return;
    }
    listDatasets(organizationId)
      .then(setDatasets)
      .catch(() => setError('Unable to load datasets.'));
  }, [organizationId]);

  async function handleDelete(datasetId: string): Promise<void> {
    if (!organizationId) {
      return;
    }
    if (!window.confirm('Delete this dataset and all its versions? This cannot be undone.')) {
      return;
    }
    await deleteDataset(organizationId, datasetId);
    setDatasets((current) => current?.filter((dataset) => dataset.id !== datasetId) ?? null);
  }

  if (!organizationId) {
    return <p className="text-sm text-slate-500">No organization found.</p>;
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">Datasets</h1>
          <p className="text-sm text-slate-500">Upload, validate, and clean business datasets.</p>
        </div>
        <Link
          to="/datasets/upload"
          className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-500"
        >
          Upload dataset
        </Link>
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {datasets === null ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : datasets.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <p className="text-sm font-medium text-slate-700">
            Upload your first dataset to generate KPIs, predictions, executive reports, and business
            recommendations.
          </p>
          <Link
            to="/datasets/upload"
            className="mt-4 inline-flex rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-500"
          >
            Upload dataset
          </Link>
        </div>
      ) : (
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200/70 bg-white shadow-card">
          {datasets.map((dataset) => (
            <li key={dataset.id} className="flex items-center justify-between gap-4 px-4 py-4">
              <div>
                <Link
                  to={`/datasets/${dataset.id}`}
                  className="text-sm font-medium text-slate-900 hover:text-indigo-600"
                >
                  {dataset.name}
                </Link>
                <p className="text-xs text-slate-500">
                  {dataset.versionCount} version{dataset.versionCount === 1 ? '' : 's'}
                  {dataset.latestVersion
                    ? ` · ${dataset.latestVersion.rowCount.toLocaleString()} rows`
                    : ' · no data'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <QualityScoreBadge score={dataset.latestVersion?.qualityScore ?? null} />
                <button
                  type="button"
                  onClick={() => void handleDelete(dataset.id)}
                  className="text-sm font-medium text-red-600 hover:text-red-500"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
