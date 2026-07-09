import type { DatasetVersionWithRelations } from '../../domain/entities/dataset-version.entity.js';
import { DatasetVersionNotFoundError } from '../../domain/errors/dataset-error.js';
import type { DatasetVersionRepository } from '../../domain/repositories/dataset-version.repository.js';

// Shared by every use case that operates on "a specific version, or the
// latest one if none was requested" (preview, quality, clean) — one place to
// enforce that the resolved version actually belongs to the given dataset.
export async function resolveDatasetVersion(
  datasetVersions: DatasetVersionRepository,
  datasetId: string,
  versionId: string | undefined,
): Promise<DatasetVersionWithRelations> {
  const version = versionId
    ? await datasetVersions.findById(versionId)
    : await datasetVersions.findLatestByDataset(datasetId);
  if (!version || version.datasetId !== datasetId) {
    throw new DatasetVersionNotFoundError();
  }
  return version;
}
