"""Vehicle fleet SQLAlchemy model."""

import uuid
from datetime import UTC, datetime

from sqlalchemy import Boolean, CheckConstraint, Column, DateTime, Float, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.base import Base


class Vehicle(Base):
    """
    Fleet asset representation for transport capacity planning and route allocation.
    All vehicles belong to a synthetic fleet with non-negative physical capacities.
    """

    __tablename__ = "vehicles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    vehicle_code = Column(String(50), unique=True, nullable=False, index=True)
    vehicle_type = Column(
        String(50), nullable=False, index=True
    )  # MEDIUM_TRUCK, HEAVY_TRUCK, FUEL_TANKER, UTILITY_VEHICLE

    home_location_id = Column(UUID(as_uuid=True), ForeignKey("locations.id"), nullable=False, index=True)
    current_location_id = Column(UUID(as_uuid=True), ForeignKey("locations.id"), nullable=True, index=True)

    payload_capacity_kg = Column(Float, nullable=False)
    volume_capacity_m3 = Column(Float, nullable=False)
    status = Column(String(30), nullable=False, default="AVAILABLE")  # AVAILABLE, IN_TRANSIT, MAINTENANCE, ASSIGNED

    is_active = Column(Boolean, default=True, nullable=False)
    synthetic_data = Column(Boolean, default=True, nullable=False)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False)
    updated_at = Column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), onupdate=lambda: datetime.now(UTC), nullable=False
    )

    # Relationships
    home_location = relationship("Location", foreign_keys=[home_location_id], backref="home_vehicles")
    current_location = relationship("Location", foreign_keys=[current_location_id], backref="stationed_vehicles")

    __table_args__ = (
        CheckConstraint("payload_capacity_kg > 0", name="chk_vehicle_payload_positive"),
        CheckConstraint("volume_capacity_m3 > 0", name="chk_vehicle_volume_positive"),
    )

    def __repr__(self) -> str:
        return f"<Vehicle(code='{self.vehicle_code}', type='{self.vehicle_type}', cap_kg={self.payload_capacity_kg})>"
