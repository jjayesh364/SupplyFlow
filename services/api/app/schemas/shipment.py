"""Shipment Pydantic schemas."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.schemas.location import LocationRead
from app.schemas.supply import SupplyItemRead
from app.schemas.vehicle import VehicleRead


class ShipmentItemRead(BaseModel):
    """Read schema for shipment manifest items."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    shipment_id: UUID
    item_id: UUID
    quantity: float
    item: SupplyItemRead | None = None


class ShipmentRead(BaseModel):
    """Read schema for shipments."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    shipment_code: str
    origin_location_id: UUID
    destination_location_id: UUID
    vehicle_id: UUID
    route_edge_id: UUID | None = None
    status: str
    departure_time: datetime
    estimated_arrival_time: datetime
    actual_arrival_time: datetime | None = None
    synthetic_data: bool
    created_at: datetime
    updated_at: datetime
    origin_location: LocationRead
    destination_location: LocationRead
    vehicle: VehicleRead
    items: list[ShipmentItemRead] = []
