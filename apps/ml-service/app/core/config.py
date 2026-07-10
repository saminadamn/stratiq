from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Environment-validated settings, same fail-fast-at-startup principle as
    apps/api's env.ts — a missing/malformed setting should surface immediately,
    not deep inside a request handler."""

    model_config = SettingsConfigDict(env_prefix="ML_SERVICE_")

    port: int = 8000
    log_level: str = "INFO"
    # Where trained model artifacts + their metadata live. In Docker this is a
    # mounted volume so artifacts survive container restarts, mirroring
    # LocalFileStorage's role for uploaded datasets on the Node side.
    model_store_path: str = "./model_store"

    def model_store(self) -> Path:
        path = Path(self.model_store_path)
        path.mkdir(parents=True, exist_ok=True)
        return path


settings = Settings()
