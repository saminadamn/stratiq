from typing import Optional

from pydantic import BaseModel, Field


class FeatureImportance(BaseModel):
    feature: str
    importance: float


class PredictionExplanation(BaseModel):
    method: str
    top_features: list[FeatureImportance] = Field(alias="topFeatures")

    model_config = {"populate_by_name": True}


# --- Churn -------------------------------------------------------------

class CustomerFeatures(BaseModel):
    """RFM-style features Node already computed via its Feature Store (see
    apps/api's FeatureStoreService) — this service never re-derives which raw
    column is revenue or a customer id, it only ever sees these numbers."""

    customer_id: str = Field(alias="customerId")
    customer_name: Optional[str] = Field(default=None, alias="customerName")
    recency_days: float = Field(alias="recencyDays")
    frequency: int
    monetary: float
    avg_order_value: float = Field(alias="avgOrderValue")

    model_config = {"populate_by_name": True}


class ChurnPredictRequest(BaseModel):
    organization_id: str = Field(alias="organizationId")
    dataset_version_id: str = Field(alias="datasetVersionId")
    force_retrain: bool = Field(default=False, alias="forceRetrain")
    customers: list[CustomerFeatures]

    model_config = {"populate_by_name": True}


class ChurnPrediction(BaseModel):
    customer_id: str = Field(alias="customerId")
    customer_name: Optional[str] = Field(default=None, alias="customerName")
    churn_probability: float = Field(alias="churnProbability")
    confidence: float
    explanation: PredictionExplanation

    model_config = {"populate_by_name": True}


class ChurnPredictResponse(BaseModel):
    model_version: int = Field(alias="modelVersion")
    algorithm: str
    metrics: dict
    predictions: list[ChurnPrediction]

    model_config = {"populate_by_name": True, "protected_namespaces": ()}


# --- Forecasting ---------------------------------------------------------

class TimeSeriesPoint(BaseModel):
    period: str
    value: float


class ForecastPoint(TimeSeriesPoint):
    is_forecast: bool = Field(alias="isForecast")

    model_config = {"populate_by_name": True}


class ForecastRequest(BaseModel):
    organization_id: str = Field(alias="organizationId")
    dataset_version_id: str = Field(alias="datasetVersionId")
    force_retrain: bool = Field(default=False, alias="forceRetrain")
    history: list[TimeSeriesPoint]
    periods_ahead: int = Field(default=3, alias="periodsAhead")

    model_config = {"populate_by_name": True}


class ForecastResponse(BaseModel):
    model_version: int = Field(alias="modelVersion")
    algorithm: str
    metrics: dict
    confidence: float
    history: list[TimeSeriesPoint]
    forecast: list[ForecastPoint]
    explanation: PredictionExplanation

    model_config = {"populate_by_name": True, "protected_namespaces": ()}


# --- Segmentation ---------------------------------------------------------

class SegmentationRequest(BaseModel):
    organization_id: str = Field(alias="organizationId")
    dataset_version_id: str = Field(alias="datasetVersionId")
    force_retrain: bool = Field(default=False, alias="forceRetrain")
    customers: list[CustomerFeatures]

    model_config = {"populate_by_name": True}


class SegmentSummary(BaseModel):
    segment_id: int = Field(alias="segmentId")
    label: str
    customer_count: int = Field(alias="customerCount")
    average_spend: float = Field(alias="averageSpend")
    average_orders: float = Field(alias="averageOrders")

    model_config = {"populate_by_name": True}


class SegmentAssignment(BaseModel):
    customer_id: str = Field(alias="customerId")
    segment_id: int = Field(alias="segmentId")

    model_config = {"populate_by_name": True}


class SegmentationResponse(BaseModel):
    model_version: int = Field(alias="modelVersion")
    algorithm: str
    metrics: dict
    segments: list[SegmentSummary]
    assignments: list[SegmentAssignment]

    model_config = {"populate_by_name": True, "protected_namespaces": ()}


# --- Recommendations -------------------------------------------------------

class CustomerPurchases(BaseModel):
    customer_id: str = Field(alias="customerId")
    product_ids: list[str] = Field(alias="productIds")

    model_config = {"populate_by_name": True}


class ProductCatalogEntry(BaseModel):
    product_id: str = Field(alias="productId")
    product_name: Optional[str] = Field(default=None, alias="productName")
    category: Optional[str] = None
    units_sold: float = Field(alias="unitsSold")
    revenue: float

    model_config = {"populate_by_name": True}


class RecommendationRequest(BaseModel):
    organization_id: str = Field(alias="organizationId")
    dataset_version_id: str = Field(alias="datasetVersionId")
    force_retrain: bool = Field(default=False, alias="forceRetrain")
    customer_purchases: list[CustomerPurchases] = Field(alias="customerPurchases")
    product_catalog: list[ProductCatalogEntry] = Field(alias="productCatalog")

    model_config = {"populate_by_name": True}


class ProductRecommendation(BaseModel):
    customer_id: str = Field(alias="customerId")
    recommended_product_id: str = Field(alias="recommendedProductId")
    recommended_product_name: Optional[str] = Field(default=None, alias="recommendedProductName")
    score: float
    reason: str

    model_config = {"populate_by_name": True}


class RecommendationResponse(BaseModel):
    model_version: int = Field(alias="modelVersion")
    algorithm: str
    metrics: dict
    recommendations: list[ProductRecommendation]

    model_config = {"populate_by_name": True, "protected_namespaces": ()}
