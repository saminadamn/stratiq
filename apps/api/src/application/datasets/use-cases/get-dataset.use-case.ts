import type { DatasetDto } from '@stratiq/shared';
import type { DatasetRepository } from '../../../domain/repositories/dataset.repository.js';
import type { DatasetVersionRepository } from '../../../domain/repositories/dataset-version.repository.js';
import { getDatasetOrThrow } from '../get-dataset-or-throw.js';
import { toDatasetDto } from '../mappers.js';

export class GetDatasetUseCase {
  constructor(
    private readonly datasets: DatasetRepository,
    private readonly datasetVersions: DatasetVersionRepository,
  ) {}

  async execute(organizationId: string, datasetId: string): Promise<DatasetDto> {
    const dataset = await getDatasetOrThrow(this.datasets, organizationId, datasetId);
    const [latestVersion, versionCount] = await Promise.all([
      this.datasetVersions.findLatestByDataset(dataset.id),
      this.datasetVersions.countByDataset(dataset.id),
    ]);
    return toDatasetDto(dataset, latestVersion, versionCount);
  }
}
