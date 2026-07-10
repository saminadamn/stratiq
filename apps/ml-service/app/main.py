from fastapi import FastAPI

from app.api.routes import models, predictions
from app.core.config import settings
from app.core.logging import configure_logging

configure_logging(settings.log_level)

app = FastAPI(title="StratIQ ML Service", version="1.0.0")

app.include_router(predictions.router)
app.include_router(models.router)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}
