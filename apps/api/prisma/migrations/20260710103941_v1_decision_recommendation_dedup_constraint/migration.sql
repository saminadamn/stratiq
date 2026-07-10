-- AlterTable: dedup guard for Decision Intelligence generation (see
-- GenerateDecisionIntelligenceService) — createMany(skipDuplicates) relies
-- on this constraint instead of an in-process lock.
CREATE UNIQUE INDEX "decision_recommendations_organizationId_datasetVersionId_title_key" ON "decision_recommendations"("organizationId", "datasetVersionId", "title");
