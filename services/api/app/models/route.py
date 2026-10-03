"""RouteEdge SQLAlchemy model with PostGIS LineString geometry."""

import uuid
from datetime import UTC, datetime

from geoalchemy2 import Geometry
from sqlalchemy import Boolean, CheckConstraint, Column, DateTime, Float, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.base import Base


class RouteEdge(Base):
    """
    Directed road corridor segment connecting two logistics nodes.
    Features spatial LineString geometry and dynamic weather/slope friction multipliers.
    """

    __tablename__ = "route_edges"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    origin_location_id = Column(UUID(as_uuid=True), ForeignKey("locations.id"), nullable=False, index=True)
    destination_location_id = Column(UUID(as_uuid=True), ForeignKey("locations.id"), nullable=False, index=True)

    route_geometry = Column(Geometry(geometry_type="LINESTRING", srid=4326, spatial_index=True), nullable=False)

    distance_km = Column(Float, nullable=False)
    nominal_travel_time_hrs = Column(Float, nullable=False)
    average_slope_deg = Column(Float, nullable=False, default=0.0)
    max_elevation_m = Column(Float, nullable=False, default=0.0)
    road_type = Column(String(50), nullable=False, default="MOUNTAIN_ROAD")  # HIGHWAY, MOUNTAIN_ROAD, UNPAVED_TRACK

    weather_friction_multiplier = Column(Float, nullable=False, default=1.0)
    is_blocked = Column(Boolean, default=False, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    synthetic_data = Column(Boolean, default=True, nullable=False)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False)
    updated_at = Column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), onupdate=lambda: datetime.now(UTC), nullable=False
    )

    # Relationships
    origin_location = relationship("Location", foreign_keys=[origin_location_id], backref="outgoing_routes")
    destination_location = relationship("Location", foreign_keys=[destination_location_id], backref="incoming_routes")

    __table_args__ = (
        CheckConstraint("distance_km > 0", name="chk_route_distance_positive"),
        CheckConstraint("nominal_travel_time_hrs > 0", name="chk_route_travel_time_positive"),
        CheckConstraint("weather_friction_multiplier >= 1.0", name="chk_route_friction_gte_one"),
    )

    def __repr__(self) -> str:
        return f"<RouteEdge(from='{self.origin_location_id}', to='{self.destination_location_id}', dist={self.distance_km}km)>"
