"""SupplyItem SQLAlchemy model."""

import uuid
from datetime import UTC, datetime

from sqlalchemy import Boolean, Column, DateTime, Float, Integer, String
from sqlalchemy.dialects.postgresql import UUID

from app.db.base import Base


class SupplyItem(Base):
    """
    Catalog of synthetic supply commodities.
    Covers Food/Rations, Fuel/POL, Medical, Maintenance/Spares, General Supplies.
    """

    __tablename__ = "supply_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    sku = Column(String(50), unique=True, nullable=False, index=True)
    name = Column(String(100), nullable=False)
    category = Column(String(50), nullable=False, index=True)
    unit = Column(String(20), nullable=False)  # kg, liters, units, boxes, rounds

    unit_weight_kg = Column(Float, nullable=False, default=1.0)
    unit_volume_m3 = Column(Float, nullable=False, default=0.001)
    is_critical = Column(Boolean, default=False, nullable=False)
    shelf_life_days = Column(Integer, nullable=True)

    synthetic_data = Column(Boolean, default=True, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False)
    updated_at = Column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), onupdate=lambda: datetime.now(UTC), nullable=False
    )

    def __repr__(self) -> str:
        return f"<SupplyItem(sku='{self.sku}', name='{self.name}', category='{self.category}')>"
