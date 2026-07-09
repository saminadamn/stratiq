import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import type { DatasetVersion } from '../../../domain/entities/dataset-version.entity.js';
import type { EtlJobWithLogs } from '../../../domain/entities/etl-job.entity.js';
import type {
  CreateDatasetVersionInput,
  DatasetVersionRepository,
} from '../../../domain/repositories/dataset-version.repository.js';
import type { DatasetRowRepository } from '../../../domain/repositories/dataset-row.repository.js';
import type { EtlJobRepository } from '../../../domain/repositories/etl-job.repository.js';
import type {
  CreateFeatureSetInput,
  FeatureSetRepository,
} from '../../../domain/repositories/feature-set.repository.js';
import { EtlPipeline } from './etl-pipeline.js';

// Fakes rather than mocks: real in-memory implementations of the repository
// interfaces, so this test exercises the pipeline's actual orchestration
// logic (stage order, persisted shape) without needing a live Postgres.
class FakeDatasetVersionRepository implements DatasetVersionRepository {
  public created: CreateDatasetVersionInput[] = [];

  async create(input: CreateDatasetVersionInput): Promise<DatasetVersion> {
    this.created.push(input);
    return { id: randomUUID(), createdAt: new Date(), ...input };
  }
  async findById(): Promise<never> {
    throw new Error('not needed for this test');
  }
  async findLatestByDataset(): Promise<null> {
    return null;
  }
  async listByDataset(): Promise<never[]> {
    return [];
  }
  async countByDataset(): Promise<number> {
    return this.created.length;
  }
  async nextVersionNumber(): Promise<number> {
    return this.created.length + 1;
  }
}

class FakeDatasetRowRepository implements DatasetRowRepository {
  public inserted: Array<Record<string, unknown>> = [];

  async insertMany(_datasetVersionId: string, rows: Array<Record<string, unknown>>): Promise<void> {
    this.inserted.push(...rows);
  }
  async findPage(): Promise<{ rows: never[]; totalRows: number }> {
    return { rows: [], totalRows: 0 };
  }
  async findAll(): Promise<never[]> {
    return [];
  }
}

class FakeFeatureSetRepository implements FeatureSetRepository {
  public created: CreateFeatureSetInput[] = [];

  async createMany(inputs: CreateFeatureSetInput[]): Promise<void> {
    this.created.push(...inputs);
  }
  async listByDatasetVersion(): Promise<never[]> {
    return [];
  }
}

class FakeEtlJobRepository implements EtlJobRepository {
  public job: EtlJobWithLogs | null = null;

  async create(datasetVersionId: string): Promise<EtlJobWithLogs> {
    this.job = {
      id: randomUUID(),
      datasetVersionId,
      status: 'PENDING',
      startedAt: new Date(),
      completedAt: null,
      errorMessage: null,
      logs: [],
    };
    return this.job;
  }
  async updateStatus(
    _id: string,
    status: EtlJobWithLogs['status'],
    options?: { completedAt?: Date },
  ): Promise<void> {
    if (this.job) {
      this.job.status = status;
      if (options?.completedAt) {
        this.job.completedAt = options.completedAt;
      }
    }
  }
  async appendLog(
    _etlJobId: string,
    entry: { stage: string; level: 'INFO' | 'WARN' | 'ERROR'; message: string },
  ): Promise<void> {
    this.job?.logs.push({
      id: randomUUID(),
      etlJobId: this.job.id,
      createdAt: new Date(),
      ...entry,
    });
  }
  async findByDatasetVersion(): Promise<EtlJobWithLogs | null> {
    return this.job;
  }
}

function buildPipeline() {
  const datasetVersions = new FakeDatasetVersionRepository();
  const datasetRows = new FakeDatasetRowRepository();
  const featureSets = new FakeFeatureSetRepository();
  const etlJobs = new FakeEtlJobRepository();
  const pipeline = new EtlPipeline(datasetVersions, datasetRows, featureSets, etlJobs);
  return { pipeline, datasetVersions, datasetRows, featureSets, etlJobs };
}

describe('EtlPipeline', () => {
  it('runs validation -> cleaning -> transformation -> feature engineering -> saving in order', async () => {
    const { pipeline, datasetVersions, datasetRows, etlJobs } = buildPipeline();

    const result = await pipeline.run({
      datasetId: 'dataset-1',
      uploadedFileId: 'file-1',
      versionNumber: 1,
      createdById: 'user-1',
      table: {
        columns: ['name'],
        rows: [{ name: '  Ada  ' }, { name: '  Ada  ' }],
      },
      cleaningMode: 'AUTOMATIC',
    });

    // Assert stage ORDER, not exact log-line counts per stage — AUTOMATIC
    // cleaning logs one line per operation it runs, which is an
    // implementation detail of CleaningEngine, not something this test
    // should need to track.
    const stages = etlJobs.job?.logs.map((log) => log.stage) ?? [];
    const stageOrder = stages.filter((stage, index) => stage !== stages[index - 1]);
    expect(stageOrder).toEqual([
      'VALIDATION',
      'CLEANING',
      'TRANSFORMATION',
      'FEATURE_ENGINEERING',
      'SAVING',
    ]);
    expect(etlJobs.job?.status).toBe('COMPLETED');

    // Trim + dedupe under AUTOMATIC cleaning should leave exactly one row.
    expect(datasetRows.inserted).toEqual([{ name: 'Ada' }]);
    expect(datasetVersions.created[0]?.rowCount).toBe(1);
    expect(result.version.rowCount).toBe(1);
  });

  it('skips cleaning and records why when cleaningMode is NONE', async () => {
    const { pipeline, etlJobs } = buildPipeline();

    await pipeline.run({
      datasetId: 'dataset-1',
      uploadedFileId: null,
      versionNumber: 1,
      createdById: 'user-1',
      table: { columns: ['name'], rows: [{ name: 'Ada' }] },
      cleaningMode: 'NONE',
    });

    const cleaningLog = etlJobs.job?.logs.find((log) => log.stage === 'CLEANING');
    expect(cleaningLog?.message).toMatch(/skipped/i);
  });

  it('runs only the requested operations in MANUAL mode', async () => {
    const { pipeline, datasetRows } = buildPipeline();

    await pipeline.run({
      datasetId: 'dataset-1',
      uploadedFileId: null,
      versionNumber: 1,
      createdById: 'user-1',
      table: { columns: ['name'], rows: [{ name: '  Ada  ' }] },
      cleaningMode: 'MANUAL',
      requestedOperations: ['TRIM_WHITESPACE'],
    });

    expect(datasetRows.inserted).toEqual([{ name: 'Ada' }]);
  });
});
