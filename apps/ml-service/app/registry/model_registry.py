import json
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

import joblib

from app.core.config import settings


@dataclass
class ModelRecord:
    version: int
    algorithm: str
    metrics: dict
    dataset_version_id: str
    trained_at: str
    path: Path


class ModelRegistry:
    """Versioned artifact storage — the actual Model Registry. Layout is
    model_store/{organizationId}/{modelKey}/v{n}/{model.joblib, metadata.json}.
    Version numbers increment per (organizationId, modelKey) across the
    org's history (not reset per dataset version), so "Churn v3" genuinely
    means "the third time this org's churn model was trained," browsable via
    GET /models. This service is the sole owner of artifact bytes — Node
    never reads them directly, only mirrors the metadata via its own
    MlModel table (see docs/ARCHITECTURE.md's "ML service never talks to
    Postgres" decision)."""

    def __init__(self, root: Optional[Path] = None) -> None:
        self.root = root or settings.model_store()

    def _model_dir(self, organization_id: str, model_key: str) -> Path:
        path = self.root / organization_id / model_key
        path.mkdir(parents=True, exist_ok=True)
        return path

    def _existing_versions(self, organization_id: str, model_key: str) -> list[ModelRecord]:
        records: list[ModelRecord] = []
        model_dir = self._model_dir(organization_id, model_key)
        for version_dir in model_dir.glob("v*"):
            metadata_path = version_dir / "metadata.json"
            if not metadata_path.exists():
                continue
            metadata = json.loads(metadata_path.read_text())
            records.append(
                ModelRecord(
                    version=metadata["version"],
                    algorithm=metadata["algorithm"],
                    metrics=metadata["metrics"],
                    dataset_version_id=metadata["dataset_version_id"],
                    trained_at=metadata["trained_at"],
                    path=version_dir / "model.joblib",
                )
            )
        return records

    def find_for_dataset_version(
        self, organization_id: str, model_key: str, dataset_version_id: str
    ) -> Optional[ModelRecord]:
        matches = [
            record
            for record in self._existing_versions(organization_id, model_key)
            if record.dataset_version_id == dataset_version_id
        ]
        if not matches:
            return None
        return max(matches, key=lambda record: record.version)

    def save(
        self,
        organization_id: str,
        model_key: str,
        dataset_version_id: str,
        model_obj: Any,
        algorithm: str,
        metrics: dict,
    ) -> ModelRecord:
        existing = self._existing_versions(organization_id, model_key)
        next_version = (max((record.version for record in existing), default=0)) + 1

        version_dir = self._model_dir(organization_id, model_key) / f"v{next_version}"
        version_dir.mkdir(parents=True, exist_ok=True)
        artifact_path = version_dir / "model.joblib"
        joblib.dump(model_obj, artifact_path)

        trained_at = datetime.now(timezone.utc).isoformat()
        metadata = {
            "version": next_version,
            "algorithm": algorithm,
            "metrics": metrics,
            "dataset_version_id": dataset_version_id,
            "organization_id": organization_id,
            "model_key": model_key,
            "trained_at": trained_at,
        }
        (version_dir / "metadata.json").write_text(json.dumps(metadata))

        return ModelRecord(
            version=next_version,
            algorithm=algorithm,
            metrics=metrics,
            dataset_version_id=dataset_version_id,
            trained_at=trained_at,
            path=artifact_path,
        )

    def load(self, organization_id: str, model_key: str, version: int) -> Any:
        path = self._model_dir(organization_id, model_key) / f"v{version}" / "model.joblib"
        return joblib.load(path)

    def list_all(self, organization_id: Optional[str] = None) -> list[dict]:
        results: list[dict] = []
        orgs = [Path(organization_id)] if organization_id else list(self.root.glob("*"))
        for org_dir in orgs:
            org_path = self.root / org_dir if organization_id else org_dir
            if not org_path.is_dir():
                continue
            for model_key_dir in org_path.glob("*"):
                for record in self._existing_versions(org_path.name, model_key_dir.name):
                    results.append(
                        {
                            "organizationId": org_path.name,
                            "modelKey": model_key_dir.name,
                            "version": record.version,
                            "algorithm": record.algorithm,
                            "metrics": record.metrics,
                            "datasetVersionId": record.dataset_version_id,
                            "trainedAt": record.trained_at,
                        }
                    )
        return results
