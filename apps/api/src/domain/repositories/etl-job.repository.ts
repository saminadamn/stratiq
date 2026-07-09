import type { EtlJobStatus, EtlLogLevel } from '@stratiq/shared';
import type { EtlJobWithLogs } from '../entities/etl-job.entity.js';

export interface EtlJobRepository {
  create(datasetVersionId: string): Promise<EtlJobWithLogs>;
  updateStatus(
    id: string,
    status: EtlJobStatus,
    options?: { completedAt?: Date; errorMessage?: string },
  ): Promise<void>;
  appendLog(
    etlJobId: string,
    entry: { stage: string; level: EtlLogLevel; message: string },
  ): Promise<void>;
  findByDatasetVersion(datasetVersionId: string): Promise<EtlJobWithLogs | null>;
}
