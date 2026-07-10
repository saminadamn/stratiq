import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture(autouse=True)
def isolate_model_store(tmp_path, monkeypatch):
    # Every test gets its own model store so trained artifacts from one test
    # never leak into another via the routes' module-level registry/service.
    from app.api.routes import models as models_route
    from app.api.routes import predictions as predictions_route
    from app.registry.model_registry import ModelRegistry
    from app.services.prediction_service import PredictionService

    registry = ModelRegistry(root=tmp_path)
    monkeypatch.setattr(models_route, "registry", registry)
    monkeypatch.setattr(predictions_route, "service", PredictionService(registry))
    yield


client = TestClient(app)


def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_churn_prediction_endpoint():
    payload = {
        "organizationId": "org-1",
        "datasetVersionId": "version-1",
        "customers": [
            {"customerId": "C1", "customerName": "Alice", "recencyDays": 5, "frequency": 5, "monetary": 500, "avgOrderValue": 100},
            {"customerId": "C2", "customerName": "Bob", "recencyDays": 90, "frequency": 1, "monetary": 50, "avgOrderValue": 50},
        ],
    }
    response = client.post("/predict/churn", json=payload)
    assert response.status_code == 200
    body = response.json()
    assert body["modelVersion"] == 1
    assert len(body["predictions"]) == 2

    # Second call for the same dataset version reuses the model (still v1).
    response_again = client.post("/predict/churn", json=payload)
    assert response_again.json()["modelVersion"] == 1


def test_forecast_endpoint():
    payload = {
        "organizationId": "org-1",
        "datasetVersionId": "version-1",
        "history": [{"period": f"2024-{m:02d}", "value": 100.0 + m * 5} for m in range(1, 5)],
        "periodsAhead": 2,
    }
    response = client.post("/predict/forecast", json=payload)
    assert response.status_code == 200
    body = response.json()
    assert len(body["forecast"]) == 2


def test_segmentation_endpoint():
    payload = {
        "organizationId": "org-1",
        "datasetVersionId": "version-1",
        "customers": [
            {"customerId": "C1", "recencyDays": 5, "frequency": 5, "monetary": 500, "avgOrderValue": 100},
        ],
    }
    response = client.post("/predict/segments", json=payload)
    assert response.status_code == 200
    assert len(response.json()["segments"]) == 1


def test_recommendations_endpoint():
    payload = {
        "organizationId": "org-1",
        "datasetVersionId": "version-1",
        "customerPurchases": [{"customerId": "C1", "productIds": ["P1"]}],
        "productCatalog": [
            {"productId": "P1", "productName": "Widget", "category": "Widgets", "unitsSold": 10, "revenue": 500},
            {"productId": "P2", "productName": "Gadget", "category": "Gadgets", "unitsSold": 20, "revenue": 400},
        ],
    }
    response = client.post("/predict/recommendations", json=payload)
    assert response.status_code == 200
    assert response.json()["recommendations"][0]["recommendedProductId"] == "P2"


def test_models_registry_endpoint_lists_trained_models():
    client.post(
        "/predict/forecast",
        json={
            "organizationId": "org-2",
            "datasetVersionId": "version-1",
            "history": [{"period": "2024-01", "value": 100.0}, {"period": "2024-02", "value": 110.0}],
        },
    )
    response = client.get("/models", params={"organization_id": "org-2"})
    assert response.status_code == 200
    models = response.json()["models"]
    assert any(m["modelKey"] == "FORECAST" for m in models)
