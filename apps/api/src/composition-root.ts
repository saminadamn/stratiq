import type { PrismaClient } from '@prisma/client';
import type { Express } from 'express';
import path from 'node:path';
import { loadEnv, type Env } from './infrastructure/config/env.js';
import { PinoLogger } from './infrastructure/logging/pino-logger.js';
import type { Logger } from './application/ports/logger.port.js';
import { createPrismaClient } from './infrastructure/persistence/prisma-client.js';
import { PrismaUserRepository } from './infrastructure/persistence/prisma-user.repository.js';
import { PrismaOrganizationRepository } from './infrastructure/persistence/prisma-organization.repository.js';
import { PrismaMembershipRepository } from './infrastructure/persistence/prisma-membership.repository.js';
import { PrismaRefreshTokenRepository } from './infrastructure/persistence/prisma-refresh-token.repository.js';
import { BcryptPasswordHasher } from './infrastructure/security/bcrypt-password-hasher.js';
import { JwtTokenService } from './infrastructure/security/jwt-token-service.js';
import { SignupUseCase } from './application/auth/signup.use-case.js';
import { LoginUseCase } from './application/auth/login.use-case.js';
import { RefreshSessionUseCase } from './application/auth/refresh-session.use-case.js';
import { LogoutUseCase } from './application/auth/logout.use-case.js';
import { GetCurrentUserUseCase } from './application/auth/get-current-user.use-case.js';
import { ListMyOrganizationsUseCase } from './application/organizations/list-my-organizations.use-case.js';
import { ListOrganizationMembersUseCase } from './application/organizations/list-organization-members.use-case.js';
import { createApp } from './presentation/http/app.js';

// Sprint 2 (Data Management & ETL).
import { PrismaDatasetRepository } from './infrastructure/persistence/prisma-dataset.repository.js';
import { PrismaDatasetVersionRepository } from './infrastructure/persistence/prisma-dataset-version.repository.js';
import { PrismaDatasetRowRepository } from './infrastructure/persistence/prisma-dataset-row.repository.js';
import { PrismaUploadedFileRepository } from './infrastructure/persistence/prisma-uploaded-file.repository.js';
import { PrismaEtlJobRepository } from './infrastructure/persistence/prisma-etl-job.repository.js';
import { PrismaFeatureSetRepository } from './infrastructure/persistence/prisma-feature-set.repository.js';
import { LocalFileStorage } from './infrastructure/storage/local-file-storage.js';
import { DefaultFileParserFactory } from './infrastructure/parsing/file-parser-factory.js';
import { EtlPipeline } from './application/datasets/etl/etl-pipeline.js';
import { UploadDatasetUseCase } from './application/datasets/use-cases/upload-dataset.use-case.js';
import { ListDatasetsUseCase } from './application/datasets/use-cases/list-datasets.use-case.js';
import { GetDatasetUseCase } from './application/datasets/use-cases/get-dataset.use-case.js';
import { DeleteDatasetUseCase } from './application/datasets/use-cases/delete-dataset.use-case.js';
import { PreviewDatasetUseCase } from './application/datasets/use-cases/preview-dataset.use-case.js';
import { GetValidationReportUseCase } from './application/datasets/use-cases/get-validation-report.use-case.js';
import { GetDatasetHistoryUseCase } from './application/datasets/use-cases/get-dataset-history.use-case.js';
import { CleanDatasetUseCase } from './application/datasets/use-cases/clean-dataset.use-case.js';
import { createUploadMiddleware } from './presentation/http/middleware/upload.middleware.js';

// Sprint 3 (Business Intelligence & Analytics).
import { PrismaSavedDashboardViewRepository } from './infrastructure/persistence/prisma-saved-dashboard-view.repository.js';
import { InMemoryAnalyticsCache } from './infrastructure/cache/in-memory-analytics-cache.js';
import { PdfKitReportGenerator } from './infrastructure/export/pdfkit-report-generator.js';
import { ResolveAnalyticsDatasetService } from './application/analytics/resolve-analytics-dataset.service.js';
import { CustomerAnalyticsService } from './application/analytics/customer-analytics.service.js';
import { ProductAnalyticsService } from './application/analytics/product-analytics.service.js';
import { InventoryAnalyticsService } from './application/analytics/inventory-analytics.service.js';
import { KpiEngineService } from './application/analytics/kpis/kpi-engine.service.js';
import { AggregationService } from './application/analytics/aggregation.service.js';
import { TimeSeriesService } from './application/analytics/time-series.service.js';
import { GetKpiSummaryUseCase } from './application/analytics/use-cases/get-kpi-summary.use-case.js';
import { GetRevenueAnalyticsUseCase } from './application/analytics/use-cases/get-revenue-analytics.use-case.js';
import { GetCustomerAnalyticsUseCase } from './application/analytics/use-cases/get-customer-analytics.use-case.js';
import { GetProductAnalyticsUseCase } from './application/analytics/use-cases/get-product-analytics.use-case.js';
import { GetInventoryAnalyticsUseCase } from './application/analytics/use-cases/get-inventory-analytics.use-case.js';
import { GetExecutiveDashboardUseCase } from './application/analytics/use-cases/get-executive-dashboard.use-case.js';
import { ExportDashboardUseCase } from './application/analytics/use-cases/export-dashboard.use-case.js';
import { CreateSavedDashboardViewUseCase } from './application/analytics/use-cases/create-saved-dashboard-view.use-case.js';
import { ListSavedDashboardViewsUseCase } from './application/analytics/use-cases/list-saved-dashboard-views.use-case.js';
import { GetSavedDashboardViewUseCase } from './application/analytics/use-cases/get-saved-dashboard-view.use-case.js';
import { UpdateSavedDashboardViewUseCase } from './application/analytics/use-cases/update-saved-dashboard-view.use-case.js';
import { DeleteSavedDashboardViewUseCase } from './application/analytics/use-cases/delete-saved-dashboard-view.use-case.js';

// Sprint 4 (Analytics Intelligence Layer).
import { PrismaMetricDefinitionRepository } from './infrastructure/persistence/prisma-metric-definition.repository.js';
import { PrismaInsightRepository } from './infrastructure/persistence/prisma-insight.repository.js';
import { PrismaAlertRepository } from './infrastructure/persistence/prisma-alert.repository.js';
import { PrismaBusinessRuleRepository } from './infrastructure/persistence/prisma-business-rule.repository.js';
import { DEFAULT_METRIC_DEFINITIONS } from './application/analytics/intelligence/default-metric-definitions.js';
import { buildMetricCalculators } from './application/analytics/intelligence/metric-calculators.js';
import { MetricsRegistryService } from './application/analytics/intelligence/metrics-registry.service.js';
import { TrendDetectionService } from './application/analytics/intelligence/trend-detection.service.js';
import { BenchmarkEngineService } from './application/analytics/intelligence/benchmark-engine.service.js';
import { BusinessRulesEngineService } from './application/analytics/intelligence/business-rules-engine.service.js';
import { InsightEngineService } from './application/analytics/intelligence/insight-engine.service.js';
import { GenerateIntelligenceService } from './application/analytics/intelligence/generate-intelligence.service.js';
import { GetMetricsRegistryUseCase } from './application/analytics/intelligence/use-cases/get-metrics-registry.use-case.js';
import { GetMetricDefinitionUseCase } from './application/analytics/intelligence/use-cases/get-metric-definition.use-case.js';
import { GetTrendUseCase } from './application/analytics/intelligence/use-cases/get-trend.use-case.js';
import { GetBenchmarkUseCase } from './application/analytics/intelligence/use-cases/get-benchmark.use-case.js';
import { GetInsightsUseCase } from './application/analytics/intelligence/use-cases/get-insights.use-case.js';
import { GetAlertsUseCase } from './application/analytics/intelligence/use-cases/get-alerts.use-case.js';
import { AcknowledgeAlertUseCase } from './application/analytics/intelligence/use-cases/acknowledge-alert.use-case.js';
import { ResolveAlertUseCase } from './application/analytics/intelligence/use-cases/resolve-alert.use-case.js';
import { ListBusinessRulesUseCase } from './application/analytics/intelligence/use-cases/list-business-rules.use-case.js';
import { CreateBusinessRuleUseCase } from './application/analytics/intelligence/use-cases/create-business-rule.use-case.js';
import { UpdateBusinessRuleUseCase } from './application/analytics/intelligence/use-cases/update-business-rule.use-case.js';
import { DeleteBusinessRuleUseCase } from './application/analytics/intelligence/use-cases/delete-business-rule.use-case.js';

// v1.0 (Predictive Intelligence).
import { PrismaMlFeatureSnapshotRepository } from './infrastructure/persistence/prisma-ml-feature-snapshot.repository.js';
import { PrismaMlModelRepository } from './infrastructure/persistence/prisma-ml-model.repository.js';
import { PrismaPredictionRepository } from './infrastructure/persistence/prisma-prediction.repository.js';
import { HttpMlServiceClient } from './infrastructure/ml/http-ml-service-client.js';
import { FeatureStoreService } from './application/analytics/ml/feature-store.service.js';
import { GetChurnPredictionsUseCase } from './application/analytics/ml/use-cases/get-churn-predictions.use-case.js';
import { GetSalesForecastUseCase } from './application/analytics/ml/use-cases/get-sales-forecast.use-case.js';
import { GetCustomerSegmentsUseCase } from './application/analytics/ml/use-cases/get-customer-segments.use-case.js';
import { GetProductRecommendationsUseCase } from './application/analytics/ml/use-cases/get-product-recommendations.use-case.js';

// v1.0 (Decision Intelligence).
import { PrismaDecisionRecommendationRepository } from './infrastructure/persistence/prisma-decision-recommendation.repository.js';
import { RootCauseAnalysisService } from './application/analytics/decision-intelligence/root-cause-analysis.service.js';
import { ActionPlanBuilder } from './application/analytics/decision-intelligence/action-plan-builder.js';
import { RecommendationEngineService } from './application/analytics/decision-intelligence/recommendation-engine.service.js';
import { GenerateDecisionIntelligenceService } from './application/analytics/decision-intelligence/generate-decision-intelligence.service.js';
import { GetDecisionIntelligenceUseCase } from './application/analytics/decision-intelligence/use-cases/get-decision-intelligence.use-case.js';

// v1.0 (Executive Reporting).
import { PrismaReportRepository } from './infrastructure/persistence/prisma-report.repository.js';
import { ListReportsUseCase } from './application/analytics/reporting/use-cases/list-reports.use-case.js';
import { DownloadReportUseCase } from './application/analytics/reporting/use-cases/download-report.use-case.js';
import type { AnalyticsCache } from './application/ports/analytics-cache.port.js';
import type { ReportGenerator } from './application/ports/report-generator.port.js';

// v1.1 (Distributed Systems Showcase).
import { Worker } from 'bullmq';
import { createBullMqConnection, createRedisClient } from './infrastructure/redis/redis-client.js';
import { RedisAnalyticsCache } from './infrastructure/cache/redis-analytics-cache.js';
import RedisStore, { type RedisReply } from 'rate-limit-redis';
import { ProcessReportJobService } from './application/analytics/reporting/process-report-job.service.js';
import { EnqueueReportUseCase } from './application/analytics/reporting/use-cases/enqueue-report.use-case.js';
import {
  BullMqReportQueue,
  REPORT_QUEUE_NAME,
} from './infrastructure/queue/bullmq-report-queue.js';
import { InProcessReportQueue } from './infrastructure/queue/in-process-report-queue.js';
import type { ReportQueue } from './application/ports/report-queue.port.js';
import type { FileStorage } from './application/ports/file-storage.port.js';
import { setReportQueue } from './infrastructure/observability/metrics.js';

export interface Server {
  app: Express;
  prisma: PrismaClient;
  env: Env;
  logger: Logger;
  // Present only when an embedded worker was started (REDIS_URL set and
  // WORKER_MODE !== 'standalone') — see createServer() and worker.ts.
  worker?: Worker;
}

// Everything report generation needs (dataset resolution, the analytics/ML/
// decision-intelligence use cases a report can pull from, and report
// persistence) — shared between the HTTP server and the async report worker
// (v1.1) so both build the exact same graph instead of two hand-maintained
// copies drifting apart. Callers own the singletons that must stay
// consistent with the rest of the process (analyticsCache, fileStorage,
// reportGenerator) and pass them in.
interface ReportingDependencies {
  resolveAnalyticsDataset: ResolveAnalyticsDatasetService;
  getExecutiveDashboard: GetExecutiveDashboardUseCase;
  getKpiSummary: GetKpiSummaryUseCase;
  getChurnPredictions: GetChurnPredictionsUseCase;
  getSalesForecast: GetSalesForecastUseCase;
  getCustomerSegments: GetCustomerSegmentsUseCase;
  getProductRecommendations: GetProductRecommendationsUseCase;
  getDecisionIntelligence: GetDecisionIntelligenceUseCase;
  reportRepository: PrismaReportRepository;
}

function buildReportingDependencies(
  prisma: PrismaClient,
  env: Env,
  analyticsCache: AnalyticsCache,
): ReportingDependencies {
  const datasetRepository = new PrismaDatasetRepository(prisma);
  const datasetVersionRepository = new PrismaDatasetVersionRepository(prisma);
  const datasetRowRepository = new PrismaDatasetRowRepository(prisma);

  const resolveAnalyticsDataset = new ResolveAnalyticsDatasetService(
    datasetRepository,
    datasetVersionRepository,
    datasetRowRepository,
  );
  const customerAnalyticsService = new CustomerAnalyticsService();
  const productAnalyticsService = new ProductAnalyticsService();
  const inventoryAnalyticsService = new InventoryAnalyticsService();
  const kpiEngineService = new KpiEngineService();
  const aggregationService = new AggregationService();
  const timeSeriesService = new TimeSeriesService();

  const getExecutiveDashboard = new GetExecutiveDashboardUseCase(
    resolveAnalyticsDataset,
    customerAnalyticsService,
    productAnalyticsService,
    inventoryAnalyticsService,
    kpiEngineService,
    timeSeriesService,
    aggregationService,
    analyticsCache,
  );
  const getKpiSummary = new GetKpiSummaryUseCase(
    resolveAnalyticsDataset,
    customerAnalyticsService,
    productAnalyticsService,
    inventoryAnalyticsService,
    kpiEngineService,
    analyticsCache,
  );

  const mlFeatureSnapshotRepository = new PrismaMlFeatureSnapshotRepository(prisma);
  const mlModelRepository = new PrismaMlModelRepository(prisma);
  const predictionRepository = new PrismaPredictionRepository(prisma);
  const mlServiceClient = new HttpMlServiceClient(env.ML_SERVICE_URL);
  const featureStoreService = new FeatureStoreService();

  const getChurnPredictions = new GetChurnPredictionsUseCase(
    resolveAnalyticsDataset,
    featureStoreService,
    mlServiceClient,
    mlModelRepository,
    mlFeatureSnapshotRepository,
    predictionRepository,
  );
  const getSalesForecast = new GetSalesForecastUseCase(
    resolveAnalyticsDataset,
    mlServiceClient,
    mlModelRepository,
    predictionRepository,
  );
  const getCustomerSegments = new GetCustomerSegmentsUseCase(
    resolveAnalyticsDataset,
    featureStoreService,
    mlServiceClient,
    mlModelRepository,
    mlFeatureSnapshotRepository,
    predictionRepository,
  );
  const getProductRecommendations = new GetProductRecommendationsUseCase(
    resolveAnalyticsDataset,
    featureStoreService,
    mlServiceClient,
    mlModelRepository,
    mlFeatureSnapshotRepository,
    predictionRepository,
  );

  const insightRepository = new PrismaInsightRepository(prisma);
  const alertRepository = new PrismaAlertRepository(prisma);
  const decisionRecommendationRepository = new PrismaDecisionRecommendationRepository(prisma);
  const benchmarkEngineService = new BenchmarkEngineService();
  const rootCauseAnalysisService = new RootCauseAnalysisService();
  const actionPlanBuilder = new ActionPlanBuilder();
  const recommendationEngineService = new RecommendationEngineService(actionPlanBuilder);
  const metricCalculators = buildMetricCalculators(inventoryAnalyticsService);
  const generateDecisionIntelligenceService = new GenerateDecisionIntelligenceService(
    insightRepository,
    alertRepository,
    predictionRepository,
    decisionRecommendationRepository,
    benchmarkEngineService,
    rootCauseAnalysisService,
    recommendationEngineService,
    metricCalculators,
  );
  const getDecisionIntelligence = new GetDecisionIntelligenceUseCase(
    resolveAnalyticsDataset,
    generateDecisionIntelligenceService,
    decisionRecommendationRepository,
  );

  const reportRepository = new PrismaReportRepository(prisma);

  return {
    resolveAnalyticsDataset,
    getExecutiveDashboard,
    getKpiSummary,
    getChurnPredictions,
    getSalesForecast,
    getCustomerSegments,
    getProductRecommendations,
    getDecisionIntelligence,
    reportRepository,
  };
}

// The queue-consuming half of report generation (see
// process-report-job.service.ts) — built the same way for the HTTP server's
// embedded worker and the standalone worker entrypoint (worker.ts), so
// there's exactly one place that assembles this constructor call.
function buildProcessReportJobService(
  reportingDeps: ReportingDependencies,
  reportGenerator: ReportGenerator,
  fileStorage: FileStorage,
): ProcessReportJobService {
  return new ProcessReportJobService(
    reportingDeps.getExecutiveDashboard,
    reportingDeps.getKpiSummary,
    reportingDeps.getChurnPredictions,
    reportingDeps.getSalesForecast,
    reportingDeps.getCustomerSegments,
    reportingDeps.getProductRecommendations,
    reportingDeps.getDecisionIntelligence,
    reportGenerator,
    fileStorage,
    reportingDeps.reportRepository,
  );
}

function resolveStorageRoot(env: Env): string {
  return path.isAbsolute(env.STORAGE_ROOT)
    ? env.STORAGE_ROOT
    : path.resolve(process.cwd(), env.STORAGE_ROOT);
}

// The composition root: the only place infrastructure implementations
// (Prisma, JWT, bcrypt, local disk storage) are wired into application use
// cases. Extracted from main.ts (rather than living inline there) so
// integration tests can build the exact same Express app — real repositories,
// real Postgres — without also starting an HTTP listener (see
// src/__tests__/integration/dataset-flow.test.ts).
export async function createServer(): Promise<Server> {
  const env = loadEnv();
  const prisma = createPrismaClient();
  const logger = new PinoLogger(env.LOG_LEVEL);

  const userRepository = new PrismaUserRepository(prisma);
  const organizationRepository = new PrismaOrganizationRepository(prisma);
  const membershipRepository = new PrismaMembershipRepository(prisma);
  const refreshTokenRepository = new PrismaRefreshTokenRepository(prisma);

  const passwordHasher = new BcryptPasswordHasher();
  const tokenService = new JwtTokenService({
    accessSecret: env.JWT_ACCESS_SECRET,
    accessTtl: env.JWT_ACCESS_TTL,
    refreshTtl: env.JWT_REFRESH_TTL,
  });

  const datasetRepository = new PrismaDatasetRepository(prisma);
  const datasetVersionRepository = new PrismaDatasetVersionRepository(prisma);
  const datasetRowRepository = new PrismaDatasetRowRepository(prisma);
  const uploadedFileRepository = new PrismaUploadedFileRepository(prisma);
  const etlJobRepository = new PrismaEtlJobRepository(prisma);
  const featureSetRepository = new PrismaFeatureSetRepository(prisma);

  const fileStorage: FileStorage = new LocalFileStorage(resolveStorageRoot(env));
  const fileParserFactory = new DefaultFileParserFactory();
  const maxUploadSizeBytes = env.MAX_UPLOAD_SIZE_MB * 1024 * 1024;

  const etlPipeline = new EtlPipeline(
    datasetVersionRepository,
    datasetRowRepository,
    featureSetRepository,
    etlJobRepository,
  );

  const savedDashboardViewRepository = new PrismaSavedDashboardViewRepository(prisma);

  // Every Redis-backed feature in this process branches on the same client:
  // unset REDIS_URL keeps today's single-process behavior everywhere
  // (in-memory cache, in-memory rate limiter, synchronous report
  // generation); setting it switches all three to their distributed
  // equivalents at once. See docs/adr/0006-redis-caching-and-rate-limiting.md.
  const redisClient = env.REDIS_URL ? createRedisClient(env.REDIS_URL) : null;
  const analyticsCache: AnalyticsCache = redisClient
    ? new RedisAnalyticsCache(redisClient, env.REDIS_CACHE_TTL_SECONDS)
    : new InMemoryAnalyticsCache();
  const reportGenerator: ReportGenerator = new PdfKitReportGenerator();

  // Distinct prefixes so the global and auth limiters don't share counters
  // in the same Redis keyspace.
  const globalRateLimitStore = redisClient
    ? new RedisStore({
        sendCommand: (...args: string[]) =>
          redisClient.call(...(args as [string, ...string[]])) as Promise<RedisReply>,
        prefix: 'rl:global:',
      })
    : undefined;
  const authRateLimitStore = redisClient
    ? new RedisStore({
        sendCommand: (...args: string[]) =>
          redisClient.call(...(args as [string, ...string[]])) as Promise<RedisReply>,
        prefix: 'rl:auth:',
      })
    : undefined;

  const reportingDeps = buildReportingDependencies(prisma, env, analyticsCache);
  const { resolveAnalyticsDataset } = reportingDeps;

  const processReportJobService = buildProcessReportJobService(
    reportingDeps,
    reportGenerator,
    fileStorage,
  );
  // Same REDIS_URL branch as the cache/rate-limit stores above: a real
  // BullMQ queue when Redis is configured, otherwise a same-process
  // fallback that keeps the enqueue-and-poll contract identical either way.
  const bullMqReportQueue = redisClient
    ? new BullMqReportQueue(createBullMqConnection(env.REDIS_URL as string))
    : null;
  if (bullMqReportQueue) {
    setReportQueue(bullMqReportQueue.getQueue());
  }
  const reportQueue: ReportQueue =
    bullMqReportQueue ?? new InProcessReportQueue(processReportJobService, logger);
  const enqueueReport = new EnqueueReportUseCase(
    resolveAnalyticsDataset,
    reportingDeps.reportRepository,
    reportQueue,
  );
  // WORKER_MODE=embedded (the default) runs the job consumer inside this
  // same process — required for single-service free-tier hosting.
  // WORKER_MODE=standalone leaves consumption to the dedicated `worker`
  // service (see docker-compose) so the API doesn't double-consume the queue.
  const worker =
    redisClient && env.WORKER_MODE !== 'standalone'
      ? new Worker(REPORT_QUEUE_NAME, (job) => processReportJobService.process(job.data), {
          connection: createBullMqConnection(env.REDIS_URL as string),
        })
      : undefined;

  const customerAnalyticsService = new CustomerAnalyticsService();
  const productAnalyticsService = new ProductAnalyticsService();
  const inventoryAnalyticsService = new InventoryAnalyticsService();
  const aggregationService = new AggregationService();
  const timeSeriesService = new TimeSeriesService();

  const getCustomerAnalytics = new GetCustomerAnalyticsUseCase(
    resolveAnalyticsDataset,
    customerAnalyticsService,
    analyticsCache,
  );
  const getProductAnalytics = new GetProductAnalyticsUseCase(
    resolveAnalyticsDataset,
    customerAnalyticsService,
    productAnalyticsService,
    analyticsCache,
  );
  const getInventoryAnalytics = new GetInventoryAnalyticsUseCase(
    resolveAnalyticsDataset,
    customerAnalyticsService,
    inventoryAnalyticsService,
    analyticsCache,
  );

  const metricDefinitionRepository = new PrismaMetricDefinitionRepository(prisma);
  const insightRepository = new PrismaInsightRepository(prisma);
  const alertRepository = new PrismaAlertRepository(prisma);
  const businessRuleRepository = new PrismaBusinessRuleRepository(prisma);

  // Idempotent by key — safe to run on every boot (see
  // default-metric-definitions.ts).
  await metricDefinitionRepository.upsertMany(DEFAULT_METRIC_DEFINITIONS);

  const metricCalculators = buildMetricCalculators(inventoryAnalyticsService);
  const metricsRegistryService = new MetricsRegistryService(metricDefinitionRepository);
  const trendDetectionService = new TrendDetectionService();
  const benchmarkEngineService = new BenchmarkEngineService();
  const businessRulesEngineService = new BusinessRulesEngineService();
  const insightEngineService = new InsightEngineService(
    trendDetectionService,
    benchmarkEngineService,
    businessRulesEngineService,
  );
  const generateIntelligenceService = new GenerateIntelligenceService(
    metricDefinitionRepository,
    businessRuleRepository,
    insightRepository,
    alertRepository,
    insightEngineService,
    metricCalculators,
  );

  const app = createApp({
    corsOrigin: env.CORS_ORIGIN,
    logger,
    rateLimit: {
      windowMs: env.RATE_LIMIT_WINDOW_MS,
      max: env.RATE_LIMIT_MAX,
      ...(globalRateLimitStore ? { store: globalRateLimitStore } : {}),
    },
    readiness: {
      prisma,
      mlServiceUrl: env.ML_SERVICE_URL,
      redisClient,
    },
    routesDeps: {
      auth: {
        signup: new SignupUseCase(
          userRepository,
          organizationRepository,
          membershipRepository,
          refreshTokenRepository,
          passwordHasher,
          tokenService,
        ),
        login: new LoginUseCase(
          userRepository,
          membershipRepository,
          refreshTokenRepository,
          passwordHasher,
          tokenService,
        ),
        refresh: new RefreshSessionUseCase(userRepository, refreshTokenRepository, tokenService),
        logout: new LogoutUseCase(refreshTokenRepository, tokenService),
        getCurrentUser: new GetCurrentUserUseCase(userRepository, membershipRepository),
      },
      organizations: {
        listMyOrganizations: new ListMyOrganizationsUseCase(membershipRepository),
        listMembers: new ListOrganizationMembersUseCase(membershipRepository),
      },
      datasets: {
        uploadDataset: new UploadDatasetUseCase(
          datasetRepository,
          datasetVersionRepository,
          uploadedFileRepository,
          fileStorage,
          fileParserFactory,
          etlPipeline,
          maxUploadSizeBytes,
        ),
        listDatasets: new ListDatasetsUseCase(datasetRepository, datasetVersionRepository),
        getDataset: new GetDatasetUseCase(datasetRepository, datasetVersionRepository),
        deleteDataset: new DeleteDatasetUseCase(
          datasetRepository,
          datasetVersionRepository,
          uploadedFileRepository,
          fileStorage,
        ),
        previewDataset: new PreviewDatasetUseCase(
          datasetRepository,
          datasetVersionRepository,
          datasetRowRepository,
        ),
        getValidationReport: new GetValidationReportUseCase(
          datasetRepository,
          datasetVersionRepository,
        ),
        getDatasetHistory: new GetDatasetHistoryUseCase(
          datasetRepository,
          datasetVersionRepository,
        ),
        cleanDataset: new CleanDatasetUseCase(
          datasetRepository,
          datasetVersionRepository,
          datasetRowRepository,
          etlPipeline,
        ),
      },
      datasetUpload: createUploadMiddleware(maxUploadSizeBytes),
      analytics: {
        getKpiSummary: reportingDeps.getKpiSummary,
        getRevenueAnalytics: new GetRevenueAnalyticsUseCase(
          resolveAnalyticsDataset,
          customerAnalyticsService,
          timeSeriesService,
          aggregationService,
          analyticsCache,
        ),
        getCustomerAnalytics,
        getProductAnalytics,
        getInventoryAnalytics,
        getExecutiveDashboard: reportingDeps.getExecutiveDashboard,
        exportDashboard: new ExportDashboardUseCase(
          reportingDeps.getExecutiveDashboard,
          getCustomerAnalytics,
          getProductAnalytics,
          getInventoryAnalytics,
          reportGenerator,
        ),
        createSavedView: new CreateSavedDashboardViewUseCase(savedDashboardViewRepository),
        listSavedViews: new ListSavedDashboardViewsUseCase(savedDashboardViewRepository),
        getSavedView: new GetSavedDashboardViewUseCase(savedDashboardViewRepository),
        updateSavedView: new UpdateSavedDashboardViewUseCase(savedDashboardViewRepository),
        deleteSavedView: new DeleteSavedDashboardViewUseCase(savedDashboardViewRepository),
      },
      intelligence: {
        getMetricsRegistry: new GetMetricsRegistryUseCase(metricsRegistryService),
        getMetricDefinition: new GetMetricDefinitionUseCase(metricsRegistryService),
        getTrend: new GetTrendUseCase(
          resolveAnalyticsDataset,
          metricsRegistryService,
          inventoryAnalyticsService,
          trendDetectionService,
        ),
        getBenchmark: new GetBenchmarkUseCase(
          resolveAnalyticsDataset,
          metricsRegistryService,
          inventoryAnalyticsService,
          benchmarkEngineService,
        ),
        getInsights: new GetInsightsUseCase(
          resolveAnalyticsDataset,
          generateIntelligenceService,
          insightRepository,
        ),
        getAlerts: new GetAlertsUseCase(
          resolveAnalyticsDataset,
          generateIntelligenceService,
          alertRepository,
        ),
        acknowledgeAlert: new AcknowledgeAlertUseCase(alertRepository),
        resolveAlert: new ResolveAlertUseCase(alertRepository),
        listBusinessRules: new ListBusinessRulesUseCase(businessRuleRepository),
        createBusinessRule: new CreateBusinessRuleUseCase(businessRuleRepository),
        updateBusinessRule: new UpdateBusinessRuleUseCase(businessRuleRepository),
        deleteBusinessRule: new DeleteBusinessRuleUseCase(businessRuleRepository),
      },
      predictions: {
        getChurnPredictions: reportingDeps.getChurnPredictions,
        getSalesForecast: reportingDeps.getSalesForecast,
        getCustomerSegments: reportingDeps.getCustomerSegments,
        getProductRecommendations: reportingDeps.getProductRecommendations,
      },
      decisions: {
        getDecisionIntelligence: reportingDeps.getDecisionIntelligence,
      },
      reports: {
        generateReport: enqueueReport,
        listReports: new ListReportsUseCase(reportingDeps.reportRepository),
        downloadReport: new DownloadReportUseCase(reportingDeps.reportRepository, fileStorage),
      },
      tokenService,
      membershipRepository,
      ...(authRateLimitStore ? { authRateLimitStore } : {}),
    },
  });

  return { app, prisma, env, logger, ...(worker ? { worker } : {}) };
}

export interface WorkerHandle {
  worker: Worker;
  prisma: PrismaClient;
  env: Env;
  logger: Logger;
}

// Standalone worker entrypoint (see worker.ts) — the Docker Compose
// `worker` service and any horizontally-scaled worker replica run this,
// consuming the same BullMQ queue createServer()'s embedded worker would.
// Requires REDIS_URL: there is no in-process fallback for a process whose
// only job is consuming a queue.
export async function createWorker(): Promise<WorkerHandle> {
  const env = loadEnv();
  if (!env.REDIS_URL) {
    throw new Error('createWorker() requires REDIS_URL to be set.');
  }
  const prisma = createPrismaClient();
  const logger = new PinoLogger(env.LOG_LEVEL);

  const redisClient = createRedisClient(env.REDIS_URL);
  const analyticsCache: AnalyticsCache = new RedisAnalyticsCache(
    redisClient,
    env.REDIS_CACHE_TTL_SECONDS,
  );
  const reportGenerator: ReportGenerator = new PdfKitReportGenerator();
  const fileStorage: FileStorage = new LocalFileStorage(resolveStorageRoot(env));

  const reportingDeps = buildReportingDependencies(prisma, env, analyticsCache);
  const processReportJobService = buildProcessReportJobService(
    reportingDeps,
    reportGenerator,
    fileStorage,
  );

  const worker = new Worker(REPORT_QUEUE_NAME, (job) => processReportJobService.process(job.data), {
    connection: createBullMqConnection(env.REDIS_URL),
  });

  return { worker, prisma, env, logger };
}
