from typing import Optional

from fastapi import APIRouter

from app.registry.model_registry import ModelRegistry

router = APIRouter(prefix="/models", tags=["models"])
registry = ModelRegistry()


@router.get("")
def list_models(organization_id: Optional[str] = None) -> dict:
    return {"models": registry.list_all(organization_id)}
