import type { Insight } from '../entities/insight.entity.js';

export interface CreateInsightInput {
  organizationId: string;
  datasetVersionId: string;
  metricKey: string;
  title: string;
  narrative: string;
  trend: Insight['trend'];
  severity: Insight['severity'];
  currentValue: number;
  previousValue: number | null;
  changePercent: number | null;
  metadata: Record<string, unknown> | null;
}

export interface InsightRepository {
  create(input: CreateInsightInput): Promise<Insight>;
  // Insights are generated once per immutable DatasetVersion and reused
  // afterward — this is the check that decides "has this version already
  // been analyzed."
  countByDatasetVersion(datasetVersionId: string): Promise<number>;
  listByOrganization(organizationId: string, limit: number): Promise<Insight[]>;
  // v1.0: the Decision Intelligence Engine needs this dataset version's own
  // insights specifically, not just "the org's most recent N" — added here
  // rather than filtering listByOrganization client-side.
  findByDatasetVersion(datasetVersionId: string): Promise<Insight[]>;
}
