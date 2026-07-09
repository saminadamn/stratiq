import type { Dataset } from '../../domain/entities/dataset.entity.js';
import { NoDatasetAvailableError } from '../../domain/errors/analytics-error.js';
import type { DatasetRepository } from '../../domain/repositories/dataset.repository.js';
import type { DatasetRowRepository } from '../../domain/repositories/dataset-row.repository.js';
import type { DatasetVersionRepository } from '../../domain/repositories/dataset-version.repository.js';
import { getDatasetOrThrow } from '../datasets/get-dataset-or-throw.js';
import { detectAnalyticsColumns, type AnalyticsColumns } from './column-detection.js';

export interface AnalyticsDatasetContext {
  datasetId: string;
  datasetVersionId: string;
  columns: AnalyticsColumns;
  rows: Array<Record<string, unknown>>;
}

// Analytics has no fact tables of its own (see docs/ARCHITECTURE.md, Sprint
// 3) — every dashboard/KPI request resolves to one organization dataset
// first: either an explicit ?datasetId override, or the org's most recently
// active READY dataset. Everything downstream (KPI engine, aggregation,
// customer/product/inventory services) operates on the rows + detected
// columns this returns.
export class ResolveAnalyticsDatasetService {
  constructor(
    private readonly datasets: DatasetRepository,
    private readonly datasetVersions: DatasetVersionRepository,
    private readonly datasetRows: DatasetRowRepository,
  ) {}

  async resolve(organizationId: string, datasetId?: string): Promise<AnalyticsDatasetContext> {
    const dataset = datasetId
      ? await getDatasetOrThrow(this.datasets, organizationId, datasetId)
      : await this.findMostRecentReadyDataset(organizationId);

    const version = await this.datasetVersions.findLatestByDataset(dataset.id);
    if (!version) {
      throw new NoDatasetAvailableError();
    }

    const [rows] = await Promise.all([this.datasetRows.findAll(version.id)]);
    const columns = detectAnalyticsColumns(version.schema);

    return { datasetId: dataset.id, datasetVersionId: version.id, columns, rows };
  }

  private async findMostRecentReadyDataset(organizationId: string): Promise<Dataset> {
    const datasets = await this.datasets.listByOrganization(organizationId);
    const readyDatasets = datasets
      .filter((dataset) => dataset.status === 'READY')
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

    const mostRecent = readyDatasets[0];
    if (!mostRecent) {
      throw new NoDatasetAvailableError();
    }
    return mostRecent;
  }
}
