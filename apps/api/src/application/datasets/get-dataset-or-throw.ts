import type { Dataset } from '../../domain/entities/dataset.entity.js';
import { DatasetNotFoundError } from '../../domain/errors/dataset-error.js';
import type { DatasetRepository } from '../../domain/repositories/dataset.repository.js';

// Shared by every dataset use case that starts with "look this dataset up,
// scoped to the caller's organization, or fail" — factored out so the
// not-found + org-scoping check can't drift between use cases.
export async function getDatasetOrThrow(
  datasets: DatasetRepository,
  organizationId: string,
  datasetId: string,
): Promise<Dataset> {
  const dataset = await datasets.findByOrganizationAndId(organizationId, datasetId);
  if (!dataset) {
    throw new DatasetNotFoundError();
  }
  return dataset;
}
