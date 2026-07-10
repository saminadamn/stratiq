-- CreateEnum
CREATE TYPE "MlModelKey" AS ENUM ('CHURN', 'FORECAST', 'SEGMENTATION', 'RECOMMENDATION');

-- CreateEnum
CREATE TYPE "DecisionCategory" AS ENUM ('ROOT_CAUSE', 'RECOMMENDATION');

-- CreateEnum
CREATE TYPE "RecommendationPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "ReportType" AS ENUM ('EXECUTIVE_SUMMARY', 'KPI', 'PREDICTION', 'RECOMMENDATION');

-- CreateTable
CREATE TABLE "ml_models" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "datasetVersionId" TEXT NOT NULL,
    "modelKey" "MlModelKey" NOT NULL,
    "version" INTEGER NOT NULL,
    "algorithm" TEXT NOT NULL,
    "metricsJson" JSONB NOT NULL,
    "artifactPath" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "trainedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ml_models_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ml_feature_snapshots" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "datasetVersionId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "featuresJson" JSONB NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ml_feature_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "predictions" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "datasetVersionId" TEXT NOT NULL,
    "modelKey" "MlModelKey" NOT NULL,
    "modelVersion" INTEGER NOT NULL,
    "targetType" TEXT,
    "targetId" TEXT,
    "valueJson" JSONB NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "explanationJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "predictions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "decision_recommendations" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "datasetVersionId" TEXT NOT NULL,
    "category" "DecisionCategory" NOT NULL,
    "title" TEXT NOT NULL,
    "rootCause" TEXT,
    "recommendationText" TEXT,
    "roiEstimate" DOUBLE PRECISION,
    "impactScore" DOUBLE PRECISION NOT NULL,
    "priority" "RecommendationPriority" NOT NULL,
    "actionPlanJson" JSONB,
    "sourceRefsJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "decision_recommendations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "datasetVersionId" TEXT NOT NULL,
    "type" "ReportType" NOT NULL,
    "fileName" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "generatedById" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ml_models_organizationId_datasetVersionId_idx" ON "ml_models"("organizationId", "datasetVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "ml_models_organizationId_datasetVersionId_modelKey_key" ON "ml_models"("organizationId", "datasetVersionId", "modelKey");

-- CreateIndex
CREATE INDEX "ml_feature_snapshots_organizationId_datasetVersionId_entity_idx" ON "ml_feature_snapshots"("organizationId", "datasetVersionId", "entityType");

-- CreateIndex
CREATE UNIQUE INDEX "ml_feature_snapshots_organizationId_datasetVersionId_entity_key" ON "ml_feature_snapshots"("organizationId", "datasetVersionId", "entityType", "entityId");

-- CreateIndex
CREATE INDEX "predictions_organizationId_datasetVersionId_modelKey_idx" ON "predictions"("organizationId", "datasetVersionId", "modelKey");

-- CreateIndex
CREATE INDEX "decision_recommendations_organizationId_createdAt_idx" ON "decision_recommendations"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "decision_recommendations_datasetVersionId_idx" ON "decision_recommendations"("datasetVersionId");

-- CreateIndex
CREATE INDEX "reports_organizationId_generatedAt_idx" ON "reports"("organizationId", "generatedAt");

-- AddForeignKey
ALTER TABLE "ml_models" ADD CONSTRAINT "ml_models_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ml_feature_snapshots" ADD CONSTRAINT "ml_feature_snapshots_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "predictions" ADD CONSTRAINT "predictions_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decision_recommendations" ADD CONSTRAINT "decision_recommendations_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_generatedById_fkey" FOREIGN KEY ("generatedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
