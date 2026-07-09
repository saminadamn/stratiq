import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  CLEANING_OPERATION_TYPES,
  type CleaningOperationType,
  type UploadDatasetResponseDto,
} from '@stratiq/shared';
import { useAuth } from '../../auth/auth-context';
import { ApiError } from '../../lib/api-client';
import { cleanDataset } from '../../lib/dataset-api';
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

export function CleaningWizardPage(): JSX.Element {
  const { datasetId } = useParams<{ datasetId: string }>();
  const { organizations } = useAuth();
  const organizationId = organizations[0]?.id;

  const [mode, setMode] = useState<'AUTOMATIC' | 'MANUAL'>('AUTOMATIC');
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

  async function handleSubmit(): Promise<void> {
    if (!organizationId || !datasetId) {
      return;
    }
    if (mode === 'MANUAL' && operations.length === 0) {
      setError('Select at least one cleaning operation.');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      const response = await cleanDataset(organizationId, datasetId, {
        mode,
        operations: mode === 'MANUAL' ? operations : undefined,
      });
      setResult(response);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Cleaning failed.');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (result) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">
              {result.dataset.name} — version {result.version.versionNumber}
            </h2>
            <QualityScoreBadge score={result.validationReport.qualityScore} />
          </div>

          <h3 className="mb-2 text-sm font-semibold text-slate-900">Remaining warnings</h3>
          <ValidationIssuesList issues={result.validationReport.issues} />

          <h3 className="mb-2 mt-6 text-sm font-semibold text-slate-900">Processing log</h3>
          <ProcessingLog logs={result.etlJob.logs} />

          <Link
            to={`/datasets/${result.dataset.id}`}
            className="mt-6 inline-block rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500"
          >
            View dataset
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-6 text-lg font-semibold text-slate-900">Clean dataset</h1>

      <div className="space-y-5 rounded-lg border border-slate-200 bg-white p-6">
        <fieldset>
          <legend className="text-sm font-medium text-slate-700">Cleaning mode</legend>
          <div className="mt-2 space-y-2">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="radio"
                name="mode"
                checked={mode === 'AUTOMATIC'}
                onChange={() => setMode('AUTOMATIC')}
              />
              Automatic — run every cleaning operation
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="radio"
                name="mode"
                checked={mode === 'MANUAL'}
                onChange={() => setMode('MANUAL')}
              />
              Manual — choose specific operations
            </label>
          </div>
        </fieldset>

        {mode === 'MANUAL' && (
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
          type="button"
          disabled={isSubmitting}
          onClick={() => void handleSubmit()}
          className="w-full rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          {isSubmitting ? 'Cleaning…' : 'Run cleaning'}
        </button>
      </div>
    </div>
  );
}
