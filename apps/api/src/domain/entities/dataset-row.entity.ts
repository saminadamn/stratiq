export interface DatasetRow {
  id: string;
  datasetVersionId: string;
  rowIndex: number;
  data: Record<string, unknown>;
}
