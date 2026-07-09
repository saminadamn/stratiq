import type { DatasetStatus } from '@stratiq/shared';
import type { Dataset } from '../entities/dataset.entity.js';

export interface DatasetRepository {
  create(input: { organizationId: string; name: string; createdById: string }): Promise<Dataset>;
  findById(id: string): Promise<Dataset | null>;
  findByOrganizationAndId(organizationId: string, id: string): Promise<Dataset | null>;
  listByOrganization(organizationId: string): Promise<Dataset[]>;
  updateStatus(id: string, status: DatasetStatus): Promise<void>;
  delete(id: string): Promise<void>;
}
