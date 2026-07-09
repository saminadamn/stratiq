import type { PrismaClient } from '@prisma/client';
import type { Express } from 'express';
import path from 'node:path';
import { loadEnv, type Env } from './infrastructure/config/env.js';
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

export interface Server {
  app: Express;
  prisma: PrismaClient;
  env: Env;
}

// The composition root: the only place infrastructure implementations
// (Prisma, JWT, bcrypt, local disk storage) are wired into application use
// cases. Extracted from main.ts (rather than living inline there) so
// integration tests can build the exact same Express app — real repositories,
// real Postgres — without also starting an HTTP listener (see
// src/__tests__/integration/dataset-flow.test.ts).
export function createServer(): Server {
  const env = loadEnv();
  const prisma = createPrismaClient();

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

  const storageRoot = path.isAbsolute(env.STORAGE_ROOT)
    ? env.STORAGE_ROOT
    : path.resolve(process.cwd(), env.STORAGE_ROOT);
  const fileStorage = new LocalFileStorage(storageRoot);
  const fileParserFactory = new DefaultFileParserFactory();
  const maxUploadSizeBytes = env.MAX_UPLOAD_SIZE_MB * 1024 * 1024;

  const etlPipeline = new EtlPipeline(
    datasetVersionRepository,
    datasetRowRepository,
    featureSetRepository,
    etlJobRepository,
  );

  const savedDashboardViewRepository = new PrismaSavedDashboardViewRepository(prisma);
  const analyticsCache = new InMemoryAnalyticsCache();
  const reportGenerator = new PdfKitReportGenerator();

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

  const app = createApp({
    corsOrigin: env.CORS_ORIGIN,
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
        getKpiSummary: new GetKpiSummaryUseCase(
          resolveAnalyticsDataset,
          customerAnalyticsService,
          productAnalyticsService,
          inventoryAnalyticsService,
          kpiEngineService,
          analyticsCache,
        ),
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
        getExecutiveDashboard,
        exportDashboard: new ExportDashboardUseCase(
          getExecutiveDashboard,
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
      tokenService,
      membershipRepository,
    },
  });

  return { app, prisma, env };
}
