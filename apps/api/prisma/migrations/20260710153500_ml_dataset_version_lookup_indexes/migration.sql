-- P8 index audit: ml_models, ml_feature_snapshots, and predictions each have
-- a findByDatasetVersion(datasetVersionId, ...) repository method that never
-- filters by organizationId (a dataset version already belongs to exactly
-- one organization), but every existing index on these three tables leads
-- with organizationId. Postgres can't seek into an index on a predicate that
-- omits its leading column, so these lookups were falling back to a full
-- index scan. Insight, Alert, and DecisionRecommendation already had a
-- correctly-shaped index for the equivalent query; this brings the three
-- v1.0 ML tables in line with that same pattern.
CREATE INDEX "ml_models_datasetVersionId_modelKey_idx" ON "ml_models"("datasetVersionId", "modelKey");

CREATE INDEX "ml_feature_snapshots_datasetVersionId_entityType_idx" ON "ml_feature_snapshots"("datasetVersionId", "entityType");

CREATE INDEX "predictions_datasetVersionId_modelKey_idx" ON "predictions"("datasetVersionId", "modelKey");
