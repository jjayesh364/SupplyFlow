"""GIS and Weather API endpoints."""

from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.services.gis.network_service import network_service
from app.services.weather.weather_service import weather_service

router = APIRouter()


class RoutePlanRequest(BaseModel):
    origin_location_id: UUID
    destination_location_id: UUID


@router.get(
    "/gis/network-geojson",
    summary="Get MapLibre Network GeoJSON",
    description="Returns complete GeoJSON FeatureCollection of all nodes and road corridors with real-time terrain and weather status.",
)
async def get_network_geojson(db: AsyncSession = Depends(get_db)) -> dict[str, Any]:
    """Retrieve MapLibre-compliant GeoJSON FeatureCollection."""
    return await network_service.get_maplibre_network_geojson(db)


@router.get(
    "/gis/weather",
    summary="Get Current Weather & Friction",
    description="Returns weather conditions and computed friction multiplier for given coordinates.",
)
async def get_coordinate_weather(
    latitude: float | None = Query(None, ge=-90, le=90),
    longitude: float | None = Query(None, ge=-180, le=180),
    lat: float | None = Query(None, ge=-90, le=90),
    lon: float | None = Query(None, ge=-180, le=180),
) -> dict[str, Any]:
    """Retrieve weather and friction for coordinates."""
    actual_lat = latitude if latitude is not None else lat
    actual_lon = longitude if longitude is not None else lon
    if actual_lat is None or actual_lon is None:
        raise HTTPException(status_code=400, detail="Latitude and longitude coordinates are required.")

    weather = await weather_service.get_current_weather(actual_lat, actual_lon)
    return {
        "latitude": weather.latitude,
        "longitude": weather.longitude,
        "temperature_c": weather.temperature_c,
        "snowfall_cm": weather.snowfall_cm,
        "rainfall_mm": weather.rainfall_mm,
        "wind_speed_kmh": weather.wind_speed_kmh,
        "friction_multiplier": weather.friction_multiplier,
        "is_blocked": weather.is_blocked,
        "source": weather.source,
        "timestamp": weather.timestamp.isoformat(),
    }


@router.get(
    "/gis/route-plan",
    summary="Compute Dynamic Shortest Route (GET)",
    description="Finds shortest path across road network weighted by real-time terrain and weather friction.",
)
async def plan_route_get(
    origin_id: UUID = Query(...),
    destination_id: UUID = Query(...),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Plan route corridor between two nodes via GET parameters."""
    return await network_service.compute_shortest_path(
        origin_id=origin_id,
        destination_id=destination_id,
        db=db,
    )


@router.post(
    "/gis/route-plan",
    summary="Compute Dynamic Shortest Route (POST)",
    description="Finds shortest path across road network weighted by real-time terrain and weather friction.",
)
async def plan_route_post(
    request: RoutePlanRequest,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Plan route corridor between two nodes via POST body."""
    return await network_service.compute_shortest_path(
        origin_id=request.origin_location_id,
        destination_id=request.destination_location_id,
        db=db,
    )
