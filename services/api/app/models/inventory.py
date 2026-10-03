"""Inventory SQLAlchemy model with integrity constraints."""

import uuid
from datetime import UTC, datetime

from sqlalchemy import CheckConstraint, Column, DateTime, Float, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.base import Base


class Inventory(Base):
    """
    On-hand and reserved stock for a specific supply item at a specific location.
    Enforces non-negative values and mass-balance integrity constraints.
    """

    __tablename__ = "inventory"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    location_id = Column(UUID(as_uuid=True), ForeignKey("locations.id", ondelete="CASCADE"), nullable=False, index=True)
    item_id = Column(UUID(as_uuid=True), ForeignKey("supply_items.id", ondelete="CASCADE"), nullable=False, index=True)

    quantity = Column(Float, nullable=False, default=0.0)
    reserved_quantity = Column(Float, nullable=False, default=0.0)
    safety_stock = Column(Float, nullable=False, default=0.0)
    max_capacity = Column(Float, nullable=False, default=100000.0)

    last_updated = Column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), onupdate=lambda: datetime.now(UTC), nullable=False
    )

    # Relationships
    location = relationship("Location", backref="inventories")
    item = relationship("SupplyItem", backref="inventories")

    __table_args__ = (
        UniqueConstraint("location_id", "item_id", name="uq_inventory_location_item"),
        CheckConstraint("quantity >= 0", name="chk_inventory_quantity_non_negative"),
        CheckConstraint("reserved_quantity >= 0", name="chk_inventory_reserved_non_negative"),
        CheckConstraint("safety_stock >= 0", name="chk_inventory_safety_non_negative"),
        CheckConstraint("reserved_quantity <= quantity", name="chk_inventory_reserved_lte_quantity"),
        CheckConstraint("max_capacity >= quantity", name="chk_inventory_max_capacity_gte_quantity"),
    )

    def __repr__(self) -> str:
        return f"<Inventory(location_id='{self.location_id}', item_id='{self.item_id}', qty={self.quantity})>"
