from fastapi import APIRouter

from app.schemas import (
    ChurnPredictRequest,
    ChurnPredictResponse,
    ForecastRequest,
    ForecastResponse,
    RecommendationRequest,
    RecommendationResponse,
    SegmentationRequest,
    SegmentationResponse,
)
from app.services.prediction_service import PredictionService

router = APIRouter(prefix="/predict", tags=["predictions"])
service = PredictionService()


@router.post("/churn", response_model=ChurnPredictResponse, response_model_by_alias=True)
def predict_churn(request: ChurnPredictRequest) -> dict:
    customers = [c.model_dump(by_alias=True) for c in request.customers]
    return service.predict_churn(
        request.organization_id, request.dataset_version_id, customers, request.force_retrain
    )


@router.post("/forecast", response_model=ForecastResponse, response_model_by_alias=True)
def predict_forecast(request: ForecastRequest) -> dict:
    history = [point.model_dump(by_alias=True) for point in request.history]
    return service.predict_forecast(
        request.organization_id,
        request.dataset_version_id,
        history,
        request.periods_ahead,
        request.force_retrain,
    )


@router.post("/segments", response_model=SegmentationResponse, response_model_by_alias=True)
def predict_segments(request: SegmentationRequest) -> dict:
    customers = [c.model_dump(by_alias=True) for c in request.customers]
    return service.predict_segments(
        request.organization_id, request.dataset_version_id, customers, request.force_retrain
    )


@router.post("/recommendations", response_model=RecommendationResponse, response_model_by_alias=True)
def predict_recommendations(request: RecommendationRequest) -> dict:
    customer_purchases = [c.model_dump(by_alias=True) for c in request.customer_purchases]
    product_catalog = [p.model_dump(by_alias=True) for p in request.product_catalog]
    return service.predict_recommendations(
        request.organization_id,
        request.dataset_version_id,
        customer_purchases,
        product_catalog,
        request.force_retrain,
    )
