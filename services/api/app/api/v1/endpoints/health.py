"""Health and diagnostic status endpoints."""

from fastapi import APIRouter, status

from app.core.config import settings
from app.db.session import check_database_connection
from app.schemas.health import ConfigParametersSummary, DatabaseHealthStatus, HealthResponse

router = APIRouter()


@router.get(
    "/health",
    response_model=HealthResponse,
    status_code=status.HTTP_200_OK,
    summary="System and Database Health Check",
    description="Returns service status, database connectivity, PostGIS availability, and configurable parameters.",
)
async def get_health() -> HealthResponse:
    """Check backend operational health and database connectivity."""
    db_status = await check_database_connection()

    # Backend status is degraded if DB is not reachable, but service remains online
    overall_status = "healthy" if db_status["connected"] else "degraded"

    return HealthResponse(
        status=overall_status,
        project_name=settings.PROJECT_NAME,
        version=settings.VERSION,
        environment=settings.ENVIRONMENT,
        demo_theater_label=settings.DEMO_THEATER_LABEL,
        is_synthetic_data_only=settings.IS_SYNTHETIC_DATA_ONLY,
        database=DatabaseHealthStatus(
            connected=db_status["connected"],
            scalar_test=db_status["scalar_test"],
            postgis_installed=db_status["postgis_installed"],
            postgis_version=db_status["postgis_version"],
            error=db_status["error"],
        ),
        configuration=ConfigParametersSummary(
            dos_critical_threshold_days=settings.DEFAULT_DOS_CRITICAL_THRESHOLD_DAYS,
            dos_warning_threshold_days=settings.DEFAULT_DOS_WARNING_THRESHOLD_DAYS,
            convoy_daylight_start_hour=settings.CONVOY_DAYLIGHT_START_HOUR,
            convoy_daylight_end_hour=settings.CONVOY_DAYLIGHT_END_HOUR,
            max_road_passable_snow_cm_hr=settings.MAX_ROAD_PASSABLE_SNOW_CM_HR,
            default_solver_time_limit_seconds=settings.DEFAULT_SOLVER_TIME_LIMIT_SECONDS,
        ),
    )


@router.get("/ping")
async def ping():
    """Quick ping endpoint for container liveness probes."""
    return {"ping": "pong", "synthetic_data": True}
