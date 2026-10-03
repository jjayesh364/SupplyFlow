"""Application configuration module for SupplyFlow."""

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Central configuration for SupplyFlow services."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Core metadata
    PROJECT_NAME: str = "SupplyFlow - Predictive Logistics Decision Support"
    VERSION: str = "0.1.0"
    ENVIRONMENT: str = "development"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = "dev-secret-key-change-in-production-32charsmin!"

    # Data governance & labelling
    DEMO_THEATER_LABEL: str = "DEMONSTRATION THEATER — SYNTHETIC LOGISTICS NETWORK"
    IS_SYNTHETIC_DATA_ONLY: bool = True

    # Backend networking & CORS
    BACKEND_HOST: str = "0.0.0.0"
    BACKEND_PORT: int = 8000
    BACKEND_CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: str | list[str]) -> list[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, (list, str)):
            return v  # type: ignore
        raise ValueError(v)

    # Database connection parameters
    POSTGRES_SERVER: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "postgres"
    POSTGRES_DB: str = "supplyflow"
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/supplyflow"
    SYNC_DATABASE_URL: str = "postgresql+psycopg2://postgres:postgres@localhost:5432/supplyflow"

    # Configurable operational parameters (never hard-coded in logic)
    DEFAULT_DOS_CRITICAL_THRESHOLD_DAYS: float = 2.0
    DEFAULT_DOS_WARNING_THRESHOLD_DAYS: float = 5.0
    CONVOY_DAYLIGHT_START_HOUR: int = 6
    CONVOY_DAYLIGHT_END_HOUR: int = 17
    MAX_ROAD_PASSABLE_SNOW_CM_HR: float = 15.0
    DEFAULT_SOLVER_TIME_LIMIT_SECONDS: float = 5.0


settings = Settings()
