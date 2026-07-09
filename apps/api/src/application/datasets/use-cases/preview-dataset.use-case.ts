import type { DatasetPreviewDto } from '@stratiq/shared';
import type { DatasetRepository } from '../../../domain/repositories/dataset.repository.js';
import type { DatasetRowRepository } from '../../../domain/repositories/dataset-row.repository.js';
import type { DatasetVersionRepository } from '../../../domain/repositories/dataset-version.repository.js';
import { getDatasetOrThrow } from '../get-dataset-or-throw.js';
import { toColumnSchemaDto } from '../mappers.js';
import { resolveDatasetVersion } from '../resolve-dataset-version.js';

export interface PreviewDatasetInput {
  organizationId: string;
  datasetId: string;
  versionId?: string | undefined;
  page: number;
  pageSize: number;
}

export class PreviewDatasetUseCase {
  constructor(
    private readonly datasets: DatasetRepository,
    private readonly datasetVersions: DatasetVersionRepository,
    private readonly datasetRows: DatasetRowRepository,
  ) {}

  async execute(input: PreviewDatasetInput): Promise<DatasetPreviewDto> {
    await getDatasetOrThrow(this.datasets, input.organizationId, input.datasetId);
    const version = await resolveDatasetVersion(
      this.datasetVersions,
      input.datasetId,
      input.versionId,
    );

    const { rows, totalRows } = await this.datasetRows.findPage(
      version.id,
      input.page,
      input.pageSize,
    );

    return {
      columns: toColumnSchemaDto(version.schema),
      rows,
      page: input.page,
      pageSize: input.pageSize,
      totalRows,
    };
  }
}
