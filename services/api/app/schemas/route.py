"""RouteEdge Pydantic schemas."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.schemas.location import LocationRead


class RouteEdgeRead(BaseModel):
    """Read schema for route edges."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    origin_location_id: UUID
    destination_location_id: UUID
    distance_km: float
    nominal_travel_time_hrs: float
    average_slope_deg: float
    max_elevation_m: float
    road_type: str
    weather_friction_multiplier: float
    is_blocked: bool
    is_active: bool
    synthetic_data: bool
    created_at: datetime
    updated_at: datetime
    origin_location: LocationRead
    destination_location: LocationRead
