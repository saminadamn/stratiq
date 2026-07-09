import type { DatasetDto } from '@stratiq/shared';
import type { DatasetRepository } from '../../../domain/repositories/dataset.repository.js';
import type { DatasetVersionRepository } from '../../../domain/repositories/dataset-version.repository.js';
import { toDatasetDto } from '../mappers.js';

export class ListDatasetsUseCase {
  constructor(
    private readonly datasets: DatasetRepository,
    private readonly datasetVersions: DatasetVersionRepository,
  ) {}

  async execute(organizationId: string): Promise<DatasetDto[]> {
    const datasets = await this.datasets.listByOrganization(organizationId);

    return Promise.all(
      datasets.map(async (dataset) => {
        const [latestVersion, versionCount] = await Promise.all([
          this.datasetVersions.findLatestByDataset(dataset.id),
          this.datasetVersions.countByDataset(dataset.id),
        ]);
        return toDatasetDto(dataset, latestVersion, versionCount);
      }),
    );
  }
}
