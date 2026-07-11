import type { ReportDto, ReportType } from '@stratiq/shared';
import type { ReportQueue } from '../../../ports/report-queue.port.js';
import type { ReportRepository } from '../../../../domain/repositories/report.repository.js';
import type { ResolveAnalyticsDatasetService } from '../../resolve-analytics-dataset.service.js';

// The HTTP-facing half of report generation (see process-report-job.service.ts
// for the other half): create a PENDING row so the client has something to
// poll immediately, hand the job to the queue, and return — no PDF work
// happens on this code path.
export class EnqueueReportUseCase {
  constructor(
    private readonly resolveDataset: ResolveAnalyticsDatasetService,
    private readonly reportRepository: ReportRepository,
    private readonly reportQueue: ReportQueue,
  ) {}

  async execute(
    organizationId: string,
    generatedById: string,
    type: ReportType,
    datasetId?: string,
  ): Promise<ReportDto> {
    const context = await this.resolveDataset.resolve(organizationId, datasetId);

    const report = await this.reportRepository.create({
      organizationId,
      datasetVersionId: context.datasetVersionId,
      type,
      status: 'PENDING',
      generatedById,
    });

    await this.reportQueue.enqueue({
      reportId: report.id,
      organizationId,
      generatedById,
      type,
      ...(datasetId !== undefined ? { datasetId } : {}),
    });

    return {
      id: report.id,
      type: report.type,
      status: report.status,
      fileName: report.fileName,
      errorMessage: report.errorMessage,
      generatedAt: report.generatedAt.toISOString(),
      generatedBy: { id: report.generatedById, name: report.generatedByName },
    };
  }
}
