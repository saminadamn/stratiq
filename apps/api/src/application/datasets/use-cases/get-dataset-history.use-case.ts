import type { DatasetHistoryDto } from '@stratiq/shared';
import type { DatasetRepository } from '../../../domain/repositories/dataset.repository.js';
import type { DatasetVersionRepository } from '../../../domain/repositories/dataset-version.repository.js';
import { getDatasetOrThrow } from '../get-dataset-or-throw.js';

export class GetDatasetHistoryUseCase {
  constructor(
    private readonly datasets: DatasetRepository,
    private readonly datasetVersions: DatasetVersionRepository,
  ) {}

  async execute(organizationId: string, datasetId: string): Promise<DatasetHistoryDto> {
    const dataset = await getDatasetOrThrow(this.datasets, organizationId, datasetId);
    const versions = await this.datasetVersions.listByDataset(datasetId);

    return {
      dataset: { id: dataset.id, name: dataset.name },
      versions: versions
        .slice()
        .sort((a, b) => b.versionNumber - a.versionNumber)
        .map((version) => ({
          versionNumber: version.versionNumber,
          createdAt: version.createdAt.toISOString(),
          createdBy: version.createdBy,
          rowCount: version.rowCount,
          qualityScore: version.qualityScore,
          cleaningMode: version.cleaningMode,
          originalFileName: version.uploadedFile?.originalFileName ?? null,
        })),
    };
  }
}
