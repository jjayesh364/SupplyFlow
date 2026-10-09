"""Forecasting, Inventory Risk, and Alerts API endpoints."""

from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.models.alert import Alert
from app.models.forecast import DemandForecast
from app.services.forecast.forecasting_service import forecasting_service
from app.services.inventory.risk_service import inventory_risk_service

router = APIRouter()


@router.post(
    "/forecasts/train-and-refresh",
    summary="Train Demand Forecast Model & Generate Horizon",
    description="Trains quantile gradient-boosted trees on historical consumption and generates 14-day P10/P50/P90 forecasts.",
)
async def train_forecasts(
    horizon_days: int = Query(14, ge=1, le=60, description="Forward forecast horizon in days"),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Execute model training and write forecasts to database."""
    result = await forecasting_service.train_and_generate_forecasts(horizon_days=horizon_days, db=db)
    # Refresh alerts following updated demand
    await inventory_risk_service.refresh_alerts(db)
    return result


@router.get(
    "/forecasts",
    summary="Get Demand Forecasts",
    description="Returns time-series demand predictions with P10/P50/P90 quantile envelopes.",
)
async def get_forecasts(
    location_id: UUID | None = Query(None, description="Filter by location UUID"),
    item_id: UUID | None = Query(None, description="Filter by supply item UUID"),
    limit: int = Query(200, ge=1, le=1000),
    db: AsyncSession = Depends(get_db),
) -> list[dict[str, Any]]:
    """Query active demand forecasts."""
    query = (
        select(DemandForecast)
        .options(selectinload(DemandForecast.location), selectinload(DemandForecast.item))
        .order_by(DemandForecast.forecast_date)
        .limit(limit)
    )
    if location_id:
        query = query.where(DemandForecast.location_id == location_id)
    if item_id:
        query = query.where(DemandForecast.item_id == item_id)

    res = await db.execute(query)
    records = res.scalars().all()

    return [
        {
            "id": str(r.id),
            "location_id": str(r.location_id),
            "location_code": r.location.code if r.location else None,
            "item_id": str(r.item_id),
            "item_name": r.item.name if r.item else None,
            "forecast_date": r.forecast_date.isoformat(),
            "predicted_demand_p10": r.lower_bound,
            "predicted_demand_p50": r.predicted_quantity,
            "predicted_demand_p90": r.upper_bound,
            "model_version": r.model_version,
            "feature_contributions": r.feature_contributions,
            "synthetic_data": r.synthetic_data,
        }
        for r in records
    ]


@router.get(
    "/inventory/risk-assessment",
    summary="Get Deterministic Inventory Risk Analysis",
    description="Returns Days of Supply (DoS), stockout horizons, safety stock deficit alerts, and urgency rankings.",
)
async def get_inventory_risk(db: AsyncSession = Depends(get_db)) -> list[dict[str, Any]]:
    """Assess network-wide inventory positions."""
    assessments = await inventory_risk_service.assess_network_inventory_risk(db)
    return [
        {
            "location_id": str(a.location_id),
            "location_code": a.location_code,
            "location_name": a.location_name,
            "location_type": a.location_type,
            "elevation_m": a.elevation_m,
            "item_id": str(a.item_id),
            "sku": a.sku,
            "item_code": a.sku,
            "item_name": a.item_name,
            "category": a.category,
            "is_critical": a.is_critical,
            "current_quantity": a.current_quantity,
            "safety_stock": a.safety_stock,
            "max_capacity": a.max_capacity,
            "demand_rate": a.daily_demand_p50,
            "daily_demand_rate": a.daily_demand_p50,
            "daily_demand_p50": a.daily_demand_p50,
            "days_of_supply": a.days_of_supply,
            "safety_deficit": max(0.0, round(a.safety_stock - a.current_quantity, 1)),
            "safety_stock_deficit": max(0.0, round(a.safety_stock - a.current_quantity, 1)),
            "projected_stockout_date": a.projected_stockout_date,
            "safety_stock_breach": a.safety_stock_breach,
            "risk_state": a.risk_state,
            "urgency_score": a.urgency_score,
            "explainability": a.explainability,
        }
        for a in assessments
    ]


@router.get(
    "/alerts",
    summary="List Operational Alerts",
    description="Returns active alerts categorized by severity (CRITICAL, WARNING, INFO).",
)
async def list_alerts(
    severity: str | None = Query(None, description="Filter by severity"),
    is_acknowledged: bool | None = Query(None, description="Filter by acknowledgement status"),
    db: AsyncSession = Depends(get_db),
) -> list[dict[str, Any]]:
    """Query system alerts."""
    query = (
        select(Alert)
        .options(selectinload(Alert.location), selectinload(Alert.item))
        .order_by(Alert.created_at.desc())
        .limit(100)
    )
    if severity:
        query = query.where(Alert.severity == severity)
    if is_acknowledged is not None:
        query = query.where(Alert.is_acknowledged == is_acknowledged)

    res = await db.execute(query)
    alerts = res.scalars().all()

    return [
        {
            "id": str(alt.id),
            "location_id": str(alt.location_id) if alt.location_id else None,
            "location_code": alt.location.code if alt.location else None,
            "item_id": str(alt.item_id) if alt.item_id else None,
            "item_name": alt.item.name if alt.item else None,
            "alert_type": alt.alert_type,
            "severity": alt.severity,
            "days_of_supply": alt.days_of_supply,
            "projected_stockout_date": alt.projected_stockout_date.isoformat() if alt.projected_stockout_date else None,
            "explanation": alt.explanation,
            "is_acknowledged": alt.is_acknowledged,
            "created_at": alt.created_at.isoformat(),
            "synthetic_data": alt.synthetic_data,
        }
        for alt in alerts
    ]
