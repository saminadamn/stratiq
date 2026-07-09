import type {
  CleaningOperationType,
  CleanDatasetRequestDto,
  UploadDatasetResponseDto,
} from '@stratiq/shared';
import type { ParsedTable } from '../../ports/file-parser.port.js';
import { InvalidCleaningRequestError } from '../../../domain/errors/dataset-error.js';
import type { DatasetRepository } from '../../../domain/repositories/dataset.repository.js';
import type { DatasetRowRepository } from '../../../domain/repositories/dataset-row.repository.js';
import type { DatasetVersionRepository } from '../../../domain/repositories/dataset-version.repository.js';
import type { EtlPipeline } from '../etl/etl-pipeline.js';
import { getDatasetOrThrow } from '../get-dataset-or-throw.js';
import {
  toDatasetDto,
  toDatasetVersionDto,
  toEtlJobSummaryDto,
  toValidationReportDto,
} from '../mappers.js';
import { resolveDatasetVersion } from '../resolve-dataset-version.js';

export interface CleanDatasetInput extends CleanDatasetRequestDto {
  organizationId: string;
  datasetId: string;
  userId: string;
}

// Cleaning always produces a brand new version rather than mutating the
// source version in place — DatasetVersion rows are immutable snapshots (see
// docs/ARCHITECTURE.md), which is also what makes "compare versions" possible.
export class CleanDatasetUseCase {
  constructor(
    private readonly datasets: DatasetRepository,
    private readonly datasetVersions: DatasetVersionRepository,
    private readonly datasetRows: DatasetRowRepository,
    private readonly etlPipeline: EtlPipeline,
  ) {}

  async execute(input: CleanDatasetInput): Promise<UploadDatasetResponseDto> {
    const dataset = await getDatasetOrThrow(this.datasets, input.organizationId, input.datasetId);

    if (input.mode === 'MANUAL' && (!input.operations || input.operations.length === 0)) {
      throw new InvalidCleaningRequestError(
        'At least one cleaning operation must be selected for manual cleaning.',
      );
    }

    const sourceVersion = await resolveDatasetVersion(
      this.datasetVersions,
      dataset.id,
      input.sourceVersionId,
    );
    const rows = await this.datasetRows.findAll(sourceVersion.id);
    const table: ParsedTable = { columns: sourceVersion.schema.map((column) => column.name), rows };

    const versionNumber = await this.datasetVersions.nextVersionNumber(dataset.id);
    const result = await this.etlPipeline.run({
      datasetId: dataset.id,
      uploadedFileId: null, // derived from cleaning, not a new file upload
      versionNumber,
      createdById: input.userId,
      table,
      cleaningMode: input.mode,
      requestedOperations: input.operations as CleaningOperationType[] | undefined,
    });

    const [versionWithRelations, versionCount] = await Promise.all([
      this.datasetVersions.findById(result.version.id),
      this.datasetVersions.countByDataset(dataset.id),
    ]);

    return {
      dataset: toDatasetDto(dataset, versionWithRelations, versionCount),
      version: toDatasetVersionDto(versionWithRelations!),
      validationReport: toValidationReportDto(result.validationReport),
      featureSets: result.featureSets,
      etlJob: toEtlJobSummaryDto(result.etlJob),
    };
  }
}
