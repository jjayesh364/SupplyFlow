"""Inventory Pydantic schemas."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.schemas.location import LocationRead
from app.schemas.supply import SupplyItemRead


class InventoryRead(BaseModel):
    """Read schema for inventory levels."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    location_id: UUID
    item_id: UUID
    quantity: float
    reserved_quantity: float
    safety_stock: float
    max_capacity: float
    last_updated: datetime
    location: LocationRead
    item: SupplyItemRead
