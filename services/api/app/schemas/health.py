"""Health check and system status response schemas."""

from pydantic import BaseModel, Field


class DatabaseHealthStatus(BaseModel):
    """Database connectivity details."""

    connected: bool
    scalar_test: bool
    postgis_installed: bool
    postgis_version: str | None = None
    error: str | None = None


class ConfigParametersSummary(BaseModel):
    """Key configurable operational thresholds."""

    dos_critical_threshold_days: float
    dos_warning_threshold_days: float
    convoy_daylight_start_hour: int
    convoy_daylight_end_hour: int
    max_road_passable_snow_cm_hr: float
    default_solver_time_limit_seconds: float


class HealthResponse(BaseModel):
    """Overall system health status."""

    status: str = Field(..., json_schema_extra={"example": "healthy"})
    project_name: str
    version: str
    environment: str
    demo_theater_label: str
    is_synthetic_data_only: bool
    database: DatabaseHealthStatus
    configuration: ConfigParametersSummary
