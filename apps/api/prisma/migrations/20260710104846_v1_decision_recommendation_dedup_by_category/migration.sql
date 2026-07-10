-- Widen the Decision Intelligence dedup guard to include `category`. A root
-- cause and its corresponding recommendation can legitimately share similar
-- or even identical title text ("Why Revenue declined" root cause vs. a
-- revenue recommendation) — without `category` in the key, createMany's
-- skipDuplicates silently dropped the second row as if it were a duplicate
-- of the first, which is exactly what happened before this migration.
DROP INDEX "decision_recommendations_organizationId_datasetVersionId_title_";

CREATE UNIQUE INDEX "decision_recommendations_organizationId_datasetVersionId_categ" ON "decision_recommendations"("organizationId", "datasetVersionId", "category", "title");
