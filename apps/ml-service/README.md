# StratIQ ML Service

Internal-only Python/FastAPI service providing Predictive Intelligence
(churn, forecasting, segmentation, recommendations) to the Node API. It is
never called directly by the frontend — see `docs/ARCHITECTURE.md` for why.

## Run locally

```bash
cd apps/ml-service
python -m venv .venv
.venv/Scripts/activate   # .venv/bin/activate on macOS/Linux
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

## Test

```bash
pytest
```

## Environment variables

| Variable                    | Default          | Purpose                                  |
| ---------------------------- | ----------------- | ----------------------------------------- |
| `ML_SERVICE_PORT`            | `8000`            | Port uvicorn binds to                     |
| `ML_SERVICE_LOG_LEVEL`       | `INFO`            | Structured JSON log level                 |
| `ML_SERVICE_MODEL_STORE_PATH`| `./model_store`   | Where versioned model artifacts are saved |
