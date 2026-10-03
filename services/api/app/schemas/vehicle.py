"""Vehicle Pydantic schemas."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.schemas.location import LocationRead


class VehicleRead(BaseModel):
    """Read schema for fleet vehicles."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    vehicle_code: str
    vehicle_type: str
    home_location_id: UUID
    current_location_id: UUID | None = None
    payload_capacity_kg: float
    volume_capacity_m3: float
    status: str
    is_active: bool
    synthetic_data: bool
    created_at: datetime
    updated_at: datetime
    home_location: LocationRead
    current_location: LocationRead | None = None
