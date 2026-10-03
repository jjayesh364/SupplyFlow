"""ConsumptionRecord SQLAlchemy model for time-series forecasting."""

import uuid

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Column,
    Date,
    Float,
    ForeignKey,
    Index,
    String,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.base import Base


class ConsumptionRecord(Base):
    """
    Historical daily consumption of supply items at forward locations.
    Contains covariates for weather and operational scenario to train ML models in Phase 4.
    """

    __tablename__ = "consumption_records"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    location_id = Column(UUID(as_uuid=True), ForeignKey("locations.id", ondelete="CASCADE"), nullable=False, index=True)
    item_id = Column(UUID(as_uuid=True), ForeignKey("supply_items.id", ondelete="CASCADE"), nullable=False, index=True)

    recorded_date = Column(Date, nullable=False, index=True)
    quantity_consumed = Column(Float, nullable=False)

    weather_temp_c = Column(Float, nullable=True)
    snowfall_cm = Column(Float, nullable=True)
    rainfall_mm = Column(Float, nullable=True)

    operational_scenario = Column(
        String(50), nullable=False, default="ROUTINE"
    )  # ROUTINE, HEIGHTENED, WINTER_STOCKING, CONTINGENCY
    data_source_type = Column(String(50), nullable=False, default="SIMULATED_DEMAND")
    synthetic_data = Column(Boolean, default=True, nullable=False)

    # Relationships
    location = relationship("Location", backref="consumption_records")
    item = relationship("SupplyItem", backref="consumption_records")

    __table_args__ = (
        UniqueConstraint("location_id", "item_id", "recorded_date", name="uq_consumption_loc_item_date"),
        CheckConstraint("quantity_consumed >= 0", name="chk_consumption_non_negative"),
        Index("ix_consumption_query", "location_id", "item_id", "recorded_date"),
    )

    def __repr__(self) -> str:
        return f"<ConsumptionRecord(loc='{self.location_id}', item='{self.item_id}', date='{self.recorded_date}', qty={self.quantity_consumed})>"
