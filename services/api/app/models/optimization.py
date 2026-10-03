"""OptimizationRun and Recommendation SQLAlchemy models."""

import uuid
from datetime import UTC, datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship

from app.db.base import Base


class OptimizationRun(Base):
    """
    Log of an operations research solver execution (Google OR-Tools CVRPTW in Phase 7).
    """

    __tablename__ = "optimization_runs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    run_timestamp = Column(DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False)
    solver_version = Column(String(50), nullable=False)
    input_configuration = Column(JSONB, nullable=False)
    status = Column(String(30), nullable=False)  # OPTIMAL, FEASIBLE, INFEASIBLE, FAILED
    summary = Column(JSONB, nullable=True)
    synthetic_data = Column(Boolean, default=True, nullable=False)

    # Relationships
    recommendations = relationship("Recommendation", back_populates="optimization_run", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<OptimizationRun(id='{self.id}', status='{self.status}', time='{self.run_timestamp}')>"


class Recommendation(Base):
    """
    Actionable recommendation produced by the optimization engine.
    """

    __tablename__ = "recommendations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    optimization_run_id = Column(
        UUID(as_uuid=True), ForeignKey("optimization_runs.id", ondelete="CASCADE"), nullable=False, index=True
    )
    recommendation_type = Column(
        String(50), nullable=False
    )  # REPLENISHMENT_DISPATCH, ROUTE_DIVERSION, PRIORITY_RATIONING
    details = Column(JSONB, nullable=False)
    status = Column(String(30), nullable=False, default="PROPOSED")  # PROPOSED, ACCEPTED, REJECTED, EXECUTED
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False)

    # Relationships
    optimization_run = relationship("OptimizationRun", back_populates="recommendations")

    def __repr__(self) -> str:
        return f"<Recommendation(type='{self.recommendation_type}', status='{self.status}')>"
