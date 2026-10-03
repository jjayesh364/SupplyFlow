"""Location Pydantic schemas."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class LocationRead(BaseModel):
    """Read schema for logistics locations."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    code: str
    name: str
    location_type: str
    latitude: float
    longitude: float
    elevation_m: float
    synthetic_data: bool
    is_active: bool
    created_at: datetime
    updated_at: datetime
