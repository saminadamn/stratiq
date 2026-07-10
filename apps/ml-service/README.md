# StratIQ ML Service

Internal-only Python/FastAPI service providing Predictive Intelligence
(churn, forecasting, segmentation, recommendations) to the Node API. It is
never called directly by the frontend — see `docs/ARCHITECTURE.md` for why.

## Run locally

```bash
cd apps/ml-service
python -m venv .venv
.venv/Scripts/activate   # .venv/bin/activate on macOS/Linux
pip install -r requirements-dev.txt   # runtime deps + pytest/httpx
uvicorn app.main:app --reload --port 8000
```

`requirements.txt` alone is runtime-only (what the prod Docker image
installs); `requirements-dev.txt` adds pytest/httpx for local testing.

## Test

```bash
pytest
```

## Environment variables

| Variable                      | Default         | Purpose                                   |
| ----------------------------- | --------------- | ----------------------------------------- |
| `ML_SERVICE_PORT`             | `8000`          | Port uvicorn binds to                     |
| `ML_SERVICE_LOG_LEVEL`        | `INFO`          | Structured JSON log level                 |
| `ML_SERVICE_MODEL_STORE_PATH` | `./model_store` | Where versioned model artifacts are saved |
