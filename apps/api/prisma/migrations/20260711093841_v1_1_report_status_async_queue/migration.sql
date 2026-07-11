-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETE', 'FAILED');

-- AlterTable
ALTER TABLE "reports" ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "errorMessage" TEXT,
ADD COLUMN     "status" "ReportStatus" NOT NULL DEFAULT 'COMPLETE',
ALTER COLUMN "fileName" DROP NOT NULL,
ALTER COLUMN "storagePath" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "reports_organizationId_status_idx" ON "reports"("organizationId", "status");

-- RenameIndex
ALTER INDEX "decision_recommendations_organizationId_datasetVersionId_categ" RENAME TO "decision_recommendations_organizationId_datasetVersionId_ca_key";
