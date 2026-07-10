import type { ReportDto, ReportType } from '@stratiq/shared';
import type { FileStorage } from '../../../ports/file-storage.port.js';
import type { ReportGenerator } from '../../../ports/report-generator.port.js';
import type { ReportRepository } from '../../../../domain/repositories/report.repository.js';
import type { GetChurnPredictionsUseCase } from '../../ml/use-cases/get-churn-predictions.use-case.js';
import type { GetCustomerSegmentsUseCase } from '../../ml/use-cases/get-customer-segments.use-case.js';
import type { GetProductRecommendationsUseCase } from '../../ml/use-cases/get-product-recommendations.use-case.js';
import type { GetSalesForecastUseCase } from '../../ml/use-cases/get-sales-forecast.use-case.js';
import type { GetDecisionIntelligenceUseCase } from '../../decision-intelligence/use-cases/get-decision-intelligence.use-case.js';
import type { GetExecutiveDashboardUseCase } from '../../use-cases/get-executive-dashboard.use-case.js';
import type { GetKpiSummaryUseCase } from '../../use-cases/get-kpi-summary.use-case.js';
import type { ResolveAnalyticsDatasetService } from '../../resolve-analytics-dataset.service.js';
import { ReportBuilderService } from '../report-builder.service.js';

export class GenerateReportUseCase {
  private readonly reportBuilder = new ReportBuilderService();

  constructor(
    private readonly resolveDataset: ResolveAnalyticsDatasetService,
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

  async execute(
    organizationId: string,
    generatedById: string,
    type: ReportType,
    datasetId?: string,
  ): Promise<ReportDto> {
    const context = await this.resolveDataset.resolve(organizationId, datasetId);
    const generatedAt = new Date().toISOString();

    const pdfRequest = await this.buildRequest(organizationId, datasetId, type, generatedAt);
    const buffer = await this.reportGenerator.generatePdf(pdfRequest);

    const fileBase = `${type.toLowerCase().replace(/_/g, '-')}-report-${generatedAt.slice(0, 10)}`;
    const savedFile = await this.fileStorage.save({
      organizationId,
      originalFileName: `${fileBase}.pdf`,
      buffer,
    });

    const report = await this.reportRepository.create({
      organizationId,
      datasetVersionId: context.datasetVersionId,
      type,
      fileName: `${fileBase}.pdf`,
      storagePath: savedFile.storagePath,
      generatedById,
    });

    return {
      id: report.id,
      type: report.type,
      fileName: report.fileName,
      generatedAt: report.generatedAt.toISOString(),
      generatedBy: { id: report.generatedById, name: report.generatedByName },
    };
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
        return this.reportBuilder.buildPredictionReport(generatedAt, churn, forecast, segments, recommendations);
      }
      case 'RECOMMENDATION': {
        const decisions = await this.getDecisionIntelligence.execute(organizationId, datasetId);
        return this.reportBuilder.buildRecommendationReport(generatedAt, decisions);
      }
    }
  }
}
