import type {
  CleaningMode,
  CleaningOperationType,
  UploadDatasetResponseDto,
} from '@stratiq/shared';
import type { DatasetRepository } from '../../../domain/repositories/dataset.repository.js';
import type { DatasetVersionRepository } from '../../../domain/repositories/dataset-version.repository.js';
import type { UploadedFileRepository } from '../../../domain/repositories/uploaded-file.repository.js';
import { EmptyFileError, FileTooLargeError } from '../../../domain/errors/dataset-error.js';
import type { FileParserFactory } from '../../ports/file-parser-factory.port.js';
import type { FileStorage } from '../../ports/file-storage.port.js';
import { detectFileType } from '../detect-file-type.js';
import type { EtlPipeline } from '../etl/etl-pipeline.js';
import { getDatasetOrThrow } from '../get-dataset-or-throw.js';
import {
  toDatasetDto,
  toDatasetVersionDto,
  toEtlJobSummaryDto,
  toValidationReportDto,
} from '../mappers.js';

export interface UploadDatasetInput {
  organizationId: string;
  userId: string;
  // Provided -> add a version to this existing dataset. Omitted -> create a
  // brand new dataset (datasetName is then required).
  datasetId?: string;
  datasetName?: string;
  originalFileName: string;
  mimeType: string;
  buffer: Buffer;
  cleaningMode: CleaningMode;
  requestedOperations?: CleaningOperationType[] | undefined;
}

export class UploadDatasetUseCase {
  constructor(
    private readonly datasets: DatasetRepository,
    private readonly datasetVersions: DatasetVersionRepository,
    private readonly uploadedFiles: UploadedFileRepository,
    private readonly fileStorage: FileStorage,
    private readonly parserFactory: FileParserFactory,
    private readonly etlPipeline: EtlPipeline,
    private readonly maxUploadSizeBytes: number,
  ) {}

  async execute(input: UploadDatasetInput): Promise<UploadDatasetResponseDto> {
    if (input.buffer.byteLength === 0) {
      throw new EmptyFileError();
    }
    if (input.buffer.byteLength > this.maxUploadSizeBytes) {
      throw new FileTooLargeError(Math.round(this.maxUploadSizeBytes / (1024 * 1024)));
    }

    const fileType = detectFileType(input.originalFileName, input.mimeType);
    const parser = this.parserFactory.getParser(fileType);
    const table = await parser.parse(input.buffer);
    if (table.rows.length === 0 || table.columns.length === 0) {
      throw new EmptyFileError();
    }

    // Parsing succeeds before any dataset row is created, so a file that
    // turns out empty never leaves behind an orphaned Dataset with zero
    // versions.
    const dataset = input.datasetId
      ? await getDatasetOrThrow(this.datasets, input.organizationId, input.datasetId)
      : await this.datasets.create({
          organizationId: input.organizationId,
          name: input.datasetName as string,
          createdById: input.userId,
        });

    const savedFile = await this.fileStorage.save({
      organizationId: input.organizationId,
      originalFileName: input.originalFileName,
      buffer: input.buffer,
    });
    const uploadedFile = await this.uploadedFiles.create({
      organizationId: input.organizationId,
      originalFileName: input.originalFileName,
      storedFileName: savedFile.storedFileName,
      storagePath: savedFile.storagePath,
      fileType,
      mimeType: input.mimeType,
      fileSizeBytes: savedFile.fileSizeBytes,
      checksumSha256: savedFile.checksumSha256,
      uploadedById: input.userId,
    });

    const versionNumber = await this.datasetVersions.nextVersionNumber(dataset.id);
    const result = await this.etlPipeline.run({
      datasetId: dataset.id,
      uploadedFileId: uploadedFile.id,
      versionNumber,
      createdById: input.userId,
      table,
      cleaningMode: input.cleaningMode,
      requestedOperations: input.requestedOperations,
    });

    await this.datasets.updateStatus(dataset.id, 'READY');

    const [versionWithRelations, versionCount] = await Promise.all([
      this.datasetVersions.findById(result.version.id),
      this.datasetVersions.countByDataset(dataset.id),
    ]);

    return {
      dataset: toDatasetDto({ ...dataset, status: 'READY' }, versionWithRelations, versionCount),
      version: toDatasetVersionDto(versionWithRelations!),
      validationReport: toValidationReportDto(result.validationReport),
      featureSets: result.featureSets,
      etlJob: toEtlJobSummaryDto(result.etlJob),
    };
  }
}
