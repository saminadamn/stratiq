import logging

from app.models import churn, forecasting, recommendation, segmentation
from app.registry.model_registry import ModelRegistry, ModelRecord

logger = logging.getLogger(__name__)


class PredictionService:
    """One place that implements "train once per dataset version, reuse
    after" against the registry — the same pattern GenerateIntelligenceService
    uses on the Node side for Insights/Alerts, applied here to model
    artifacts instead."""

    def __init__(self, registry: ModelRegistry | None = None) -> None:
        self.registry = registry or ModelRegistry()

    def predict_churn(
        self, organization_id: str, dataset_version_id: str, customers: list[dict], force_retrain: bool
    ) -> dict:
        record = self._get_or_train(
            organization_id,
            "CHURN",
            dataset_version_id,
            force_retrain,
            lambda: churn.train(customers),
        )
        model_obj = None if record.algorithm != "logistic_regression" else self.registry.load(
            organization_id, "CHURN", record.version
        )
        predictions = churn.predict(model_obj, customers)
        return {
            "modelVersion": record.version,
            "algorithm": record.algorithm,
            "metrics": record.metrics,
            "predictions": predictions,
        }

    def predict_forecast(
        self,
        organization_id: str,
        dataset_version_id: str,
        history: list[dict],
        periods_ahead: int,
        force_retrain: bool,
    ) -> dict:
        record = self._get_or_train(
            organization_id,
            "FORECAST",
            dataset_version_id,
            force_retrain,
            lambda: forecasting.train(history),
        )
        model_obj = self.registry.load(organization_id, "FORECAST", record.version)
        result = forecasting.predict(model_obj, history, periods_ahead)
        return {
            "modelVersion": record.version,
            "algorithm": record.algorithm,
            "metrics": record.metrics,
            "confidence": record.metrics.get("rSquared", 0.5),
            **result,
        }

    def predict_segments(
        self, organization_id: str, dataset_version_id: str, customers: list[dict], force_retrain: bool
    ) -> dict:
        record = self._get_or_train(
            organization_id,
            "SEGMENTATION",
            dataset_version_id,
            force_retrain,
            lambda: segmentation.train(customers),
        )
        model_obj = self.registry.load(organization_id, "SEGMENTATION", record.version)
        result = segmentation.predict(model_obj, customers)
        return {
            "modelVersion": record.version,
            "algorithm": record.algorithm,
            "metrics": record.metrics,
            **result,
        }

    def predict_recommendations(
        self,
        organization_id: str,
        dataset_version_id: str,
        customer_purchases: list[dict],
        product_catalog: list[dict],
        force_retrain: bool,
    ) -> dict:
        record = self._get_or_train(
            organization_id,
            "RECOMMENDATION",
            dataset_version_id,
            force_retrain,
            lambda: recommendation.train(customer_purchases, product_catalog),
        )
        model_obj = self.registry.load(organization_id, "RECOMMENDATION", record.version)
        predictions = recommendation.predict(model_obj, customer_purchases)
        return {
            "modelVersion": record.version,
            "algorithm": record.algorithm,
            "metrics": record.metrics,
            "recommendations": predictions,
        }

    def _get_or_train(
        self,
        organization_id: str,
        model_key: str,
        dataset_version_id: str,
        force_retrain: bool,
        train_fn,
    ) -> ModelRecord:
        if not force_retrain:
            existing = self.registry.find_for_dataset_version(organization_id, model_key, dataset_version_id)
            if existing is not None:
                logger.info("reusing trained model organization=%s key=%s version=%s", organization_id, model_key, existing.version)
                return existing

        model_obj, algorithm, metrics = train_fn()
        record = self.registry.save(organization_id, model_key, dataset_version_id, model_obj, algorithm, metrics)
        logger.info("trained new model organization=%s key=%s version=%s", organization_id, model_key, record.version)
        return record
