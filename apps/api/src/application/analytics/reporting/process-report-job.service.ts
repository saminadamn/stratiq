import type { ReportType } from '@stratiq/shared';
import type { ReportJobPayload } from '../../ports/report-queue.port.js';
import type { FileStorage } from '../../ports/file-storage.port.js';
import type { ReportGenerator } from '../../ports/report-generator.port.js';
import type { ReportRepository } from '../../../domain/repositories/report.repository.js';
import type { GetChurnPredictionsUseCase } from '../ml/use-cases/get-churn-predictions.use-case.js';
import type { GetCustomerSegmentsUseCase } from '../ml/use-cases/get-customer-segments.use-case.js';
import type { GetProductRecommendationsUseCase } from '../ml/use-cases/get-product-recommendations.use-case.js';
import type { GetSalesForecastUseCase } from '../ml/use-cases/get-sales-forecast.use-case.js';
import type { GetDecisionIntelligenceUseCase } from '../decision-intelligence/use-cases/get-decision-intelligence.use-case.js';
import type { GetExecutiveDashboardUseCase } from '../use-cases/get-executive-dashboard.use-case.js';
import type { GetKpiSummaryUseCase } from '../use-cases/get-kpi-summary.use-case.js';
import { ReportBuilderService } from './report-builder.service.js';

// The actual PDF-building work, run by a queue worker (see worker.ts) —
// embedded in the API process or standalone, both consume the same queue
// (see composition-root.ts's createWorker / report-queue.port.ts). Never
// called directly from an HTTP request; EnqueueReportUseCase creates the
// PENDING row and hands off a ReportJobPayload instead.
export class ProcessReportJobService {
  private readonly reportBuilder = new ReportBuilderService();

  constructor(
    private readonly getExecutiveDashboard: GetExecutiveDashboardUseCase,
    private readonly getKpiSummary: GetKpiSummaryUseCase,
    private readonly getChurnPredictions: GetChurnPredictionsUseCase,
    private readonly getSalesForecast: GetSalesForecastUseCase,
    private readonly getCustomerSegments: GetCustomerSegmentsUseCase,
    private readonly getProductRecommendations: GetProductRecommendationsUseCase,
    private readonly getDecisionIntelligence: GetDecisionIntelligenceUseCase,
    private readonly reportGenerator: ReportGenerator,
    private readonly fileStorage: FileStorage,
    private readonly reportRepository: ReportRepository,
  ) {}

  async process(payload: ReportJobPayload): Promise<void> {
    const { reportId, organizationId, type, datasetId } = payload;
    await this.reportRepository.updateStatus(reportId, { status: 'PROCESSING' });

    try {
      const generatedAt = new Date().toISOString();
      const pdfRequest = await this.buildRequest(organizationId, datasetId, type, generatedAt);
      const buffer = await this.reportGenerator.generatePdf(pdfRequest);

      const fileBase = `${type.toLowerCase().replace(/_/g, '-')}-report-${generatedAt.slice(0, 10)}`;
      const savedFile = await this.fileStorage.save({
        organizationId,
        originalFileName: `${fileBase}.pdf`,
        buffer,
      });

      await this.reportRepository.updateStatus(reportId, {
        status: 'COMPLETE',
        fileName: `${fileBase}.pdf`,
        storagePath: savedFile.storagePath,
        completedAt: new Date(),
      });
    } catch (error) {
      await this.reportRepository.updateStatus(reportId, {
        status: 'FAILED',
        errorMessage: error instanceof Error ? error.message : 'Report generation failed.',
        completedAt: new Date(),
      });
      // Rethrown so BullMQ records the attempt as failed and retries with
      // backoff (see bullmq-report-queue.ts) — the FAILED-status write above
      // is what the API/frontend see; this is what the queue sees.
      throw error;
    }
  }

  private async buildRequest(
    organizationId: string,
    datasetId: string | undefined,
    type: ReportType,
    generatedAt: string,
  ) {
    switch (type) {
      case 'EXECUTIVE_SUMMARY': {
        const dashboard = await this.getExecutiveDashboard.execute(organizationId, { datasetId });
        return this.reportBuilder.buildExecutiveSummary(dashboard);
      }
      case 'KPI': {
        const kpis = await this.getKpiSummary.execute(organizationId, { datasetId });
        return this.reportBuilder.buildKpiReport(kpis, generatedAt);
      }
      case 'PREDICTION': {
        const [churn, forecast, segments, recommendations] = await Promise.all([
          this.getChurnPredictions.execute(organizationId, datasetId),
          this.getSalesForecast.execute(organizationId, datasetId),
          this.getCustomerSegments.execute(organizationId, datasetId),
          this.getProductRecommendations.execute(organizationId, datasetId),
        ]);
        return this.reportBuilder.buildPredictionReport(
          generatedAt,
          churn,
          forecast,
          segments,
          recommendations,
        );
      }
      case 'RECOMMENDATION': {
        const decisions = await this.getDecisionIntelligence.execute(organizationId, datasetId);
        return this.reportBuilder.buildRecommendationReport(generatedAt, decisions);
      }
    }
  }
}
