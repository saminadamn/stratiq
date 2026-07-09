import type { CleaningMode, CleaningOperationType, EtlLogLevel } from '@stratiq/shared';
import type { CleaningLogEntry } from '../../../domain/entities/dataset-version.entity.js';
import type { DatasetVersion } from '../../../domain/entities/dataset-version.entity.js';
import type { EtlJobWithLogs } from '../../../domain/entities/etl-job.entity.js';
import type { ValidationReport } from '../../../domain/entities/validation-report.entity.js';
import type { DatasetRowRepository } from '../../../domain/repositories/dataset-row.repository.js';
import type { DatasetVersionRepository } from '../../../domain/repositories/dataset-version.repository.js';
import type { EtlJobRepository } from '../../../domain/repositories/etl-job.repository.js';
import type { FeatureSetRepository } from '../../../domain/repositories/feature-set.repository.js';
import type { ParsedTable } from '../../ports/file-parser.port.js';
import { CleaningEngine } from '../cleaning/cleaning-engine.js';
import { FeatureEngineeringService } from '../feature-engineering/feature-engineering.service.js';
import { inferSchema } from '../infer-schema.js';
import { ValidationEngine } from '../validation/validation-engine.js';

export interface EtlPipelineInput {
  datasetId: string;
  uploadedFileId: string | null;
  versionNumber: number;
  createdById: string;
  table: ParsedTable;
  cleaningMode: CleaningMode;
  requestedOperations?: CleaningOperationType[] | undefined;
}

export interface EtlPipelineResult {
  version: DatasetVersion;
  validationReport: ValidationReport;
  featureSets: Array<{ name: string; label: string; value: unknown }>;
  etlJob: EtlJobWithLogs;
}

interface StageLog {
  stage: string;
  level: EtlLogLevel;
  message: string;
}

// The modular pipeline: Validation -> Cleaning -> Transformation -> Feature
// Engineering -> PostgreSQL. Each stage is delegated to its own engine/service
// (ValidationEngine, CleaningEngine, FeatureEngineeringService) — this class
// only sequences them and accumulates the log lines that back the "Processing
// Logs" UI.
//
// Persistence tradeoff: this runs synchronously within one HTTP request (no
// background worker/queue in this sprint), so the EtlJob + its logs are
// written to the database only once, atomically, after every stage below has
// already succeeded in memory. A failure mid-pipeline surfaces as an API
// error with no partial EtlJob row — there's no partial state to resume from
// without a queue, so there's nothing worth persisting for a failed attempt.
export class EtlPipeline {
  constructor(
    private readonly datasetVersionRepository: DatasetVersionRepository,
    private readonly datasetRowRepository: DatasetRowRepository,
    private readonly featureSetRepository: FeatureSetRepository,
    private readonly etlJobRepository: EtlJobRepository,
    private readonly validationEngine: ValidationEngine = new ValidationEngine(),
    private readonly cleaningEngine: CleaningEngine = new CleaningEngine(),
    private readonly featureEngineeringService: FeatureEngineeringService = new FeatureEngineeringService(),
  ) {}

  async run(input: EtlPipelineInput): Promise<EtlPipelineResult> {
    const startedAt = Date.now();
    const stageLogs: StageLog[] = [];
    const log = (stage: string, message: string, level: EtlLogLevel = 'INFO'): void => {
      stageLogs.push({ stage, level, message });
    };

    log(
      'VALIDATION',
      `Validating ${input.table.rows.length} row(s) across ${input.table.columns.length} column(s).`,
    );
    const initialSchema = inferSchema(input.table);
    const initialReport = this.validationEngine.run(input.table, initialSchema);
    log(
      'VALIDATION',
      `Found ${initialReport.issues.length} issue type(s); initial quality score ${initialReport.qualityScore}/100.`,
      initialReport.issues.length > 0 ? 'WARN' : 'INFO',
    );

    let rows = input.table.rows;
    let cleaningLog: CleaningLogEntry[] = [];
    const cleaningMode = input.cleaningMode;
    if (cleaningMode !== 'NONE') {
      log('CLEANING', `Running ${cleaningMode.toLowerCase()} cleaning.`);
      const cleaningResult = this.cleaningEngine.run(
        rows,
        initialSchema,
        cleaningMode,
        input.requestedOperations,
      );
      rows = cleaningResult.rows;
      cleaningLog = cleaningResult.log;
      for (const entry of cleaningLog) {
        log(
          'CLEANING',
          `${entry.operation}: ${entry.description} (${entry.rowsAffected} affected)`,
        );
      }
    } else {
      log('CLEANING', 'Skipped — no cleaning requested.');
    }

    log('TRANSFORMATION', 'Re-deriving column schema and quality score from the cleaned data.');
    const cleanedTable: ParsedTable = { columns: input.table.columns, rows };
    const finalSchema = cleaningMode !== 'NONE' ? inferSchema(cleanedTable) : initialSchema;
    const finalReport =
      cleaningMode !== 'NONE'
        ? this.validationEngine.run(cleanedTable, finalSchema)
        : initialReport;
    log('TRANSFORMATION', `Quality score after cleaning: ${finalReport.qualityScore}/100.`);

    log('FEATURE_ENGINEERING', 'Detecting business columns and computing metrics.');
    const featureSets = this.featureEngineeringService.compute(rows, finalSchema);
    log(
      'FEATURE_ENGINEERING',
      featureSets.length > 0
        ? `Computed ${featureSets.length} feature(s): ${featureSets.map((f) => f.label).join(', ')}.`
        : 'No recognizable business columns found — no features computed.',
    );

    const processingTimeMs = Date.now() - startedAt;
    log(
      'SAVING',
      `Persisting ${rows.length} row(s) and ${featureSets.length} feature(s) to PostgreSQL.`,
    );

    const version = await this.datasetVersionRepository.create({
      datasetId: input.datasetId,
      versionNumber: input.versionNumber,
      uploadedFileId: input.uploadedFileId,
      rowCount: rows.length,
      columnCount: finalSchema.length,
      schema: finalSchema,
      qualityScore: finalReport.qualityScore,
      validationReport: finalReport,
      cleaningMode,
      cleaningLog: cleaningLog.length > 0 ? cleaningLog : null,
      processingTimeMs,
      createdById: input.createdById,
    });

    if (rows.length > 0) {
      await this.datasetRowRepository.insertMany(version.id, rows);
    }
    if (featureSets.length > 0) {
      await this.featureSetRepository.createMany(
        featureSets.map((feature) => ({
          datasetVersionId: version.id,
          name: feature.name,
          label: feature.label,
          value: feature.value,
        })),
      );
    }
    log('SAVING', 'Dataset ready.');

    const etlJob = await this.etlJobRepository.create(version.id);
    for (const entry of stageLogs) {
      await this.etlJobRepository.appendLog(etlJob.id, entry);
    }
    await this.etlJobRepository.updateStatus(etlJob.id, 'COMPLETED', { completedAt: new Date() });
    const completedJob = await this.etlJobRepository.findByDatasetVersion(version.id);

    return {
      version,
      validationReport: finalReport,
      featureSets,
      // Just created and completed above in this same call — always present.
      etlJob: completedJob as EtlJobWithLogs,
    };
  }
}
