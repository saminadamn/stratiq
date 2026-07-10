import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  CLEANING_OPERATION_TYPES,
  type CleaningMode,
  type CleaningOperationType,
  type UploadDatasetResponseDto,
} from '@stratiq/shared';
import { useAuth } from '../../auth/auth-context';
import { ApiError } from '../../lib/api-client';
import { uploadDataset } from '../../lib/dataset-api';
import { ProcessingLog } from '../../components/datasets/ProcessingLog';
import { QualityScoreBadge } from '../../components/datasets/QualityScoreBadge';
import { ValidationIssuesList } from '../../components/datasets/ValidationIssuesList';

const OPERATION_LABELS: Record<CleaningOperationType, string> = {
  REMOVE_DUPLICATES: 'Remove duplicates',
  FILL_MISSING_VALUES: 'Fill missing values',
  CONVERT_DATA_TYPES: 'Convert datatypes',
  STANDARDIZE_CATEGORIES: 'Standardize categories',
  TRIM_WHITESPACE: 'Trim whitespace',
  REMOVE_INVALID_RECORDS: 'Remove invalid records',
};

export function UploadDatasetPage(): JSX.Element {
  const { organizations } = useAuth();
  const organizationId = organizations[0]?.id;

  const [name, setName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [cleaningMode, setCleaningMode] = useState<CleaningMode>('NONE');
  const [operations, setOperations] = useState<CleaningOperationType[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<UploadDatasetResponseDto | null>(null);

  function toggleOperation(operation: CleaningOperationType): void {
    setOperations((current) =>
      current.includes(operation)
        ? current.filter((item) => item !== operation)
        : [...current, operation],
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!organizationId || !file) {
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      const response = await uploadDataset(organizationId, {
        name,
        file,
        cleaningMode,
        operations: cleaningMode === 'MANUAL' ? operations : undefined,
      });
      setResult(response);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Upload failed.');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (result) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="rounded-xl border border-slate-200/70 bg-white shadow-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold tracking-tight text-slate-900">{result.dataset.name}</h2>
            <QualityScoreBadge score={result.validationReport.qualityScore} />
          </div>
          <p className="mb-4 text-sm text-slate-500">
            Imported {result.version.rowCount.toLocaleString()} row(s) across{' '}
            {result.version.columnCount} column(s).
          </p>

          <h3 className="mb-2 text-sm font-semibold text-slate-900">Validation warnings</h3>
          <ValidationIssuesList issues={result.validationReport.issues} />

          {result.featureSets.length > 0 && (
            <>
              <h3 className="mb-2 mt-6 text-sm font-semibold text-slate-900">Computed features</h3>
              <ul className="grid grid-cols-2 gap-3">
                {result.featureSets.map((feature) => (
                  <li key={feature.name} className="rounded-md bg-slate-50 px-3 py-2">
                    <p className="text-xs text-slate-500">{feature.label}</p>
                    <p className="text-sm font-medium text-slate-900">
                      {typeof feature.value === 'number'
                        ? feature.value.toLocaleString()
                        : 'See dataset details'}
                    </p>
                  </li>
                ))}
              </ul>
            </>
          )}

          <h3 className="mb-2 mt-6 text-sm font-semibold text-slate-900">Processing log</h3>
          <ProcessingLog logs={result.etlJob.logs} />

          <div className="mt-6 flex gap-3">
            <Link
              to={`/datasets/${result.dataset.id}`}
              className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-500"
            >
              View dataset
            </Link>
            <Link
              to="/datasets"
              className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Back to datasets
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-6 text-xl font-semibold tracking-tight text-slate-900">Upload dataset</h1>

      <form
        onSubmit={(event) => void handleSubmit(event)}
        className="space-y-5 rounded-xl border border-slate-200/70 bg-white shadow-card p-6"
      >
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-slate-700">
            Dataset name
          </label>
          <input
            id="name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label htmlFor="file" className="block text-sm font-medium text-slate-700">
            File (CSV or .xlsx)
          </label>
          <input
            id="file"
            type="file"
            required
            accept=".csv,.xlsx"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="mt-1 w-full text-sm text-slate-600"
          />
        </div>

        <fieldset>
          <legend className="text-sm font-medium text-slate-700">Cleaning</legend>
          <div className="mt-2 space-y-2">
            {(['NONE', 'AUTOMATIC', 'MANUAL'] as CleaningMode[]).map((mode) => (
              <label key={mode} className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="radio"
                  name="cleaningMode"
                  value={mode}
                  checked={cleaningMode === mode}
                  onChange={() => setCleaningMode(mode)}
                />
                {mode === 'NONE'
                  ? 'No cleaning'
                  : mode === 'AUTOMATIC'
                    ? 'Automatic cleaning'
                    : 'Manual cleaning'}
              </label>
            ))}
          </div>
        </fieldset>

        {cleaningMode === 'MANUAL' && (
          <fieldset className="rounded-md bg-slate-50 p-3">
            <legend className="text-sm font-medium text-slate-700">Operations</legend>
            <div className="mt-2 space-y-2">
              {CLEANING_OPERATION_TYPES.map((operation) => (
                <label key={operation} className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={operations.includes(operation)}
                    onChange={() => toggleOperation(operation)}
                  />
                  {OPERATION_LABELS[operation]}
                </label>
              ))}
            </div>
          </fieldset>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={isSubmitting || !organizationId}
          className="w-full rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-500 disabled:opacity-50"
        >
          {isSubmitting ? 'Uploading…' : 'Upload'}
        </button>
      </form>
    </div>
  );
}
