"""Shipment and ShipmentItem SQLAlchemy models."""

import uuid
from datetime import UTC, datetime

from sqlalchemy import Boolean, CheckConstraint, Column, DateTime, Float, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.base import Base


class Shipment(Base):
    """
    Logistics transit movement carrying cargo from an origin depot to a destination base.
    """

    __tablename__ = "shipments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    shipment_code = Column(String(50), unique=True, nullable=False, index=True)

    origin_location_id = Column(UUID(as_uuid=True), ForeignKey("locations.id"), nullable=False, index=True)
    destination_location_id = Column(UUID(as_uuid=True), ForeignKey("locations.id"), nullable=False, index=True)
    vehicle_id = Column(UUID(as_uuid=True), ForeignKey("vehicles.id"), nullable=False, index=True)
    route_edge_id = Column(UUID(as_uuid=True), ForeignKey("route_edges.id"), nullable=True, index=True)

    status = Column(
        String(30), nullable=False, default="PLANNED"
    )  # PLANNED, DISPATCHED, IN_TRANSIT, DELIVERED, DELAYED, CANCELLED
    departure_time = Column(DateTime(timezone=True), nullable=False)
    estimated_arrival_time = Column(DateTime(timezone=True), nullable=False)
    actual_arrival_time = Column(DateTime(timezone=True), nullable=True)

    synthetic_data = Column(Boolean, default=True, nullable=False)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False)
    updated_at = Column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), onupdate=lambda: datetime.now(UTC), nullable=False
    )

    # Relationships
    origin_location = relationship("Location", foreign_keys=[origin_location_id])
    destination_location = relationship("Location", foreign_keys=[destination_location_id])
    vehicle = relationship("Vehicle", backref="shipments")
    route_edge = relationship("RouteEdge")
    items = relationship("ShipmentItem", back_populates="shipment", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Shipment(code='{self.shipment_code}', status='{self.status}')>"


class ShipmentItem(Base):
    """
    Itemized cargo manifest line for a shipment.
    """

    __tablename__ = "shipment_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    shipment_id = Column(UUID(as_uuid=True), ForeignKey("shipments.id", ondelete="CASCADE"), nullable=False, index=True)
    item_id = Column(UUID(as_uuid=True), ForeignKey("supply_items.id"), nullable=False, index=True)
    quantity = Column(Float, nullable=False)

    # Relationships
    shipment = relationship("Shipment", back_populates="items")
    item = relationship("SupplyItem")

    __table_args__ = (CheckConstraint("quantity > 0", name="chk_shipment_item_quantity_positive"),)

    def __repr__(self) -> str:
        return f"<ShipmentItem(shipment='{self.shipment_id}', item='{self.item_id}', qty={self.quantity})>"
