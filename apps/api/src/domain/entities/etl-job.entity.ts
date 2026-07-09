import type { EtlJobStatus, EtlLogLevel } from '@stratiq/shared';

export interface EtlJob {
  id: string;
  datasetVersionId: string;
  status: EtlJobStatus;
  startedAt: Date;
  completedAt: Date | null;
  errorMessage: string | null;
}

export interface EtlLog {
  id: string;
  etlJobId: string;
  stage: string;
  level: EtlLogLevel;
  message: string;
  createdAt: Date;
}

export interface EtlJobWithLogs extends EtlJob {
  logs: EtlLog[];
}
