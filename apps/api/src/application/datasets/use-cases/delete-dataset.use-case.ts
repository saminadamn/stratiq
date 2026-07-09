import type { DatasetRepository } from '../../../domain/repositories/dataset.repository.js';
import type { DatasetVersionRepository } from '../../../domain/repositories/dataset-version.repository.js';
import type { UploadedFileRepository } from '../../../domain/repositories/uploaded-file.repository.js';
import type { FileStorage } from '../../ports/file-storage.port.js';
import { getDatasetOrThrow } from '../get-dataset-or-throw.js';

export class DeleteDatasetUseCase {
  constructor(
    private readonly datasets: DatasetRepository,
    private readonly datasetVersions: DatasetVersionRepository,
    private readonly uploadedFiles: UploadedFileRepository,
    private readonly fileStorage: FileStorage,
  ) {}

  async execute(organizationId: string, datasetId: string): Promise<void> {
    await getDatasetOrThrow(this.datasets, organizationId, datasetId);

    const versions = await this.datasetVersions.listByDataset(datasetId);
    const uploadedFileIds = versions
      .map((version) => version.uploadedFileId)
      .filter((id): id is string => id !== null);

    // The Dataset row cascades to versions/rows/etlJobs/featureSets in the
    // database, but UploadedFile isn't cascaded from DatasetVersion (a
    // version references a file, not the reverse) — its rows and on-disk
    // bytes are cleaned up explicitly afterward.
    await this.datasets.delete(datasetId);

    for (const uploadedFileId of uploadedFileIds) {
      const uploadedFile = await this.uploadedFiles.findById(uploadedFileId);
      if (!uploadedFile) {
        continue;
      }
      await this.fileStorage.delete(uploadedFile.storagePath);
      await this.uploadedFiles.delete(uploadedFileId);
    }
  }
}
