"""Location SQLAlchemy model with PostGIS Point geometry."""

import uuid
from datetime import UTC, datetime

from geoalchemy2 import Geometry
from sqlalchemy import Boolean, Column, DateTime, Float, String
from sqlalchemy.dialects.postgresql import UUID

from app.db.base import Base


class Location(Base):
    """
    Geographic logistics node representing depots, forward supply depots, and forward posts.
    All demonstration nodes are explicitly marked synthetic_data = True.
    """

    __tablename__ = "locations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code = Column(String(50), unique=True, nullable=False, index=True)
    name = Column(String(100), nullable=False)
    location_type = Column(String(50), nullable=False, index=True)  # BASE_DEPOT, FORWARD_SUPPLY_DEPOT, FORWARD_POST

    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    coordinates = Column(Geometry(geometry_type="POINT", srid=4326, spatial_index=True), nullable=False)

    elevation_m = Column(Float, nullable=False, default=0.0)
    synthetic_data = Column(Boolean, default=True, nullable=False, index=True)
    is_active = Column(Boolean, default=True, nullable=False)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False)
    updated_at = Column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), onupdate=lambda: datetime.now(UTC), nullable=False
    )

    def __repr__(self) -> str:
        return f"<Location(code='{self.code}', name='{self.name}', type='{self.location_type}')>"
