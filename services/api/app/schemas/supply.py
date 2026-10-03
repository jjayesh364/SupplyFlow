"""SupplyItem Pydantic schemas."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class SupplyItemRead(BaseModel):
    """Read schema for supply items."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    sku: str
    name: str
    category: str
    unit: str
    unit_weight_kg: float
    unit_volume_m3: float
    is_critical: bool
    shelf_life_days: int | None = None
    synthetic_data: bool
    is_active: bool
    created_at: datetime
    updated_at: datetime
