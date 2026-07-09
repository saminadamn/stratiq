import type { DatasetStatus } from '@stratiq/shared';

export interface Dataset {
  id: string;
  organizationId: string;
  name: string;
  status: DatasetStatus;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}
