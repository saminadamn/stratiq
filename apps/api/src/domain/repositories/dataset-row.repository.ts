export interface DatasetRowPage {
  rows: Array<Record<string, unknown>>;
  totalRows: number;
}

export interface DatasetRowRepository {
  // Bulk insert is the only write path — rows are never mutated in place;
  // a cleaning operation produces a brand new version (and new rows) instead.
  insertMany(datasetVersionId: string, rows: Array<Record<string, unknown>>): Promise<void>;
  findPage(datasetVersionId: string, page: number, pageSize: number): Promise<DatasetRowPage>;
  findAll(datasetVersionId: string): Promise<Array<Record<string, unknown>>>;
}
