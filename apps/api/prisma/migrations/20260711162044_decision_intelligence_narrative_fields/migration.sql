-- CreateEnum
CREATE TYPE "Confidence" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "RecommendationTeam" AS ENUM ('SALES', 'MARKETING', 'OPERATIONS', 'CUSTOMER_SUCCESS', 'GENERAL');

-- AlterTable
ALTER TABLE "decision_recommendations" ADD COLUMN     "businessImpact" TEXT,
ADD COLUMN     "changePercent" DOUBLE PRECISION,
ADD COLUMN     "confidence" "Confidence",
ADD COLUMN     "finding" TEXT,
ADD COLUMN     "severity" "InsightSeverity",
ADD COLUMN     "team" "RecommendationTeam";
