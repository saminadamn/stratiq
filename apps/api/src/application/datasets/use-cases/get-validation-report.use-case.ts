import type { ValidationReportDto } from '@stratiq/shared';
import type { DatasetRepository } from '../../../domain/repositories/dataset.repository.js';
import type { DatasetVersionRepository } from '../../../domain/repositories/dataset-version.repository.js';
import { getDatasetOrThrow } from '../get-dataset-or-throw.js';
import { toValidationReportDto } from '../mappers.js';
import { resolveDatasetVersion } from '../resolve-dataset-version.js';

export class GetValidationReportUseCase {
  constructor(
    private readonly datasets: DatasetRepository,
    private readonly datasetVersions: DatasetVersionRepository,
  ) {}

  async execute(
    organizationId: string,
    datasetId: string,
    versionId: string | undefined,
  ): Promise<ValidationReportDto> {
    await getDatasetOrThrow(this.datasets, organizationId, datasetId);
    const version = await resolveDatasetVersion(this.datasetVersions, datasetId, versionId);
    // Every version is created with a validation report by the ETL pipeline —
    // null here would indicate a data integrity bug, not a normal 404 case.
    return toValidationReportDto(
      version.validationReport as NonNullable<typeof version.validationReport>,
    );
  }
}
