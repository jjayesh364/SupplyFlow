"""
Inventory Risk and Stockout Prediction Service for SupplyFlow.

Calculates deterministic Days-of-Supply (DoS), projected stockout horizons,
safety stock deficit thresholds, replenishment urgency scoring, and automated alert generation.
"""

import logging
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from uuid import UUID

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.models.alert import Alert
from app.models.forecast import DemandForecast
from app.models.inventory import Inventory

logger = logging.getLogger("inventory_risk_service")


@dataclass
class ItemRiskAssessment:
    location_id: UUID
    location_code: str
    location_name: str
    location_type: str
    item_id: UUID
    sku: str
    item_name: str
    category: str
    is_critical: bool
    current_quantity: float
    safety_stock: float
    max_capacity: float
    daily_demand_p50: float
    days_of_supply: float
    projected_stockout_date: str | None
    safety_stock_breach: bool
    risk_state: str  # "CRITICAL", "WARNING", "ADEQUATE", "EXCESS"
    urgency_score: float  # 0 to 100
    explainability: list[str]


class InventoryRiskService:
    """Evaluates inventory health against forecasted consumption demand."""

    async def assess_network_inventory_risk(self, db: AsyncSession) -> list[ItemRiskAssessment]:
        """Assess all on-hand inventory positions against active P50 forward demand forecasts."""
        # 1. Fetch current inventory joined with location and item
        inv_res = await db.execute(
            select(Inventory).options(selectinload(Inventory.location), selectinload(Inventory.item))
        )
        inventories = inv_res.scalars().all()

        # 2. Fetch latest demand forecasts (average daily forward demand)
        # We take the mean P50 predicted demand over the next 7 days per location/item pair
        today = datetime.now(UTC).date()
        horizon_end = today + timedelta(days=7)

        fc_res = await db.execute(
            select(
                DemandForecast.location_id,
                DemandForecast.item_id,
                func.avg(DemandForecast.predicted_quantity).label("avg_p50"),
            )
            .where(
                DemandForecast.forecast_date >= today,
                DemandForecast.forecast_date <= horizon_end,
            )
            .group_by(DemandForecast.location_id, DemandForecast.item_id)
        )
        demand_map: dict[tuple[UUID, UUID], float] = {(row[0], row[1]): float(row[2]) for row in fc_res.all()}

        assessments: list[ItemRiskAssessment] = []
        alerts_to_create: list[Alert] = []

        for inv in inventories:
            loc = inv.location
            item = inv.item

            # Fallback demand estimation if forecasts haven't been generated yet
            daily_demand = demand_map.get((loc.id, item.id), 25.0 if loc.location_type == "FORWARD_POST" else 60.0)
            daily_demand = max(0.5, daily_demand)

            # Days of Supply calculation
            dos = round(inv.quantity / daily_demand, 1)

            # Stockout horizon
            if dos < 365:
                stockout_date_str = (today + timedelta(days=int(dos))).isoformat()
            else:
                stockout_date_str = None

            # Safety stock deficit
            safety_breach = inv.quantity < inv.safety_stock

            # Determine risk state based on configurable thresholds
            if dos < settings.DEFAULT_DOS_CRITICAL_THRESHOLD_DAYS:
                risk_state = "CRITICAL"
                base_urgency = 85.0 + min(15.0, (settings.DEFAULT_DOS_CRITICAL_THRESHOLD_DAYS - dos) * 10.0)
            elif dos < settings.DEFAULT_DOS_WARNING_THRESHOLD_DAYS:
                risk_state = "WARNING"
                base_urgency = 50.0 + min(30.0, (settings.DEFAULT_DOS_WARNING_THRESHOLD_DAYS - dos) * 10.0)
            elif inv.quantity > (inv.max_capacity * 0.92):
                risk_state = "EXCESS"
                base_urgency = 10.0
            else:
                risk_state = "ADEQUATE"
                base_urgency = 20.0

            # Critical item weighting
            if item.is_critical:
                base_urgency = min(100.0, base_urgency * 1.25)

            urgency_score = round(base_urgency, 1)

            # Explainability factor compilation
            explain: list[str] = []
            if risk_state == "CRITICAL":
                explain.append(
                    f"CRITICAL: Only {dos} Days of Supply remaining (Threshold: {settings.DEFAULT_DOS_CRITICAL_THRESHOLD_DAYS}d)."
                )
            elif risk_state == "WARNING":
                explain.append(f"WARNING: Approaching stockout ({dos} DoS). Replenishment convoy recommended.")

            if safety_breach:
                deficit = round(inv.safety_stock - inv.quantity, 1)
                explain.append(f"Safety buffer breached by {deficit} {item.unit}.")

            if item.is_critical:
                explain.append("Commodity is designated mission-critical.")

            if not explain:
                explain.append(f"Stock healthy at {dos} Days of Supply.")

            assessments.append(
                ItemRiskAssessment(
                    location_id=loc.id,
                    location_code=loc.code,
                    location_name=loc.name,
                    location_type=loc.location_type,
                    item_id=item.id,
                    sku=item.sku,
                    item_name=item.name,
                    category=item.category,
                    is_critical=item.is_critical,
                    current_quantity=inv.quantity,
                    safety_stock=inv.safety_stock,
                    max_capacity=inv.max_capacity,
                    daily_demand_p50=round(daily_demand, 1),
                    days_of_supply=dos,
                    projected_stockout_date=stockout_date_str,
                    safety_stock_breach=safety_breach,
                    risk_state=risk_state,
                    urgency_score=urgency_score,
                    explainability=explain,
                )
            )

            # Build alert for critical risks
            if risk_state in ["CRITICAL", "WARNING"]:
                stockout_dt = datetime.now(UTC) + timedelta(days=max(0, int(dos)))
                alerts_to_create.append(
                    Alert(
                        location_id=loc.id,
                        item_id=item.id,
                        alert_type="STOCKOUT_IMMINENT" if risk_state == "CRITICAL" else "LOW_STOCK",
                        severity="CRITICAL" if risk_state == "CRITICAL" else "WARNING",
                        days_of_supply=dos,
                        projected_stockout_date=stockout_dt,
                        explanation=f"{risk_state} Stockout Risk: Only {dos} Days of Supply ({inv.quantity} {item.unit}) remaining. Daily burn: {round(daily_demand, 1)} {item.unit}/day.",
                        synthetic_data=True,
                    )
                )

        # Sort by urgency descending
        assessments.sort(key=lambda x: x.urgency_score, reverse=True)
        return assessments

    async def refresh_alerts(self, db: AsyncSession) -> int:
        """Evaluate inventory and persist fresh stockout alerts."""
        assessments = await self.assess_network_inventory_risk(db)

        # Clear unacknowledged stockout alerts
        await db.execute(
            delete(Alert).where(
                Alert.alert_type.in_(["STOCKOUT_IMMINENT", "LOW_STOCK"]),
                Alert.is_acknowledged.is_(False),
            )
        )
        await db.flush()

        alerts_to_insert: list[Alert] = []
        for ass in assessments:
            if ass.risk_state in ["CRITICAL", "WARNING"]:
                stockout_dt = datetime.now(UTC) + timedelta(days=max(0, int(ass.days_of_supply)))
                alerts_to_insert.append(
                    Alert(
                        location_id=ass.location_id,
                        item_id=ass.item_id,
                        alert_type="STOCKOUT_IMMINENT" if ass.risk_state == "CRITICAL" else "LOW_STOCK",
                        severity="CRITICAL" if ass.risk_state == "CRITICAL" else "WARNING",
                        days_of_supply=ass.days_of_supply,
                        projected_stockout_date=stockout_dt,
                        explanation=f"{ass.risk_state} Risk: {ass.item_name} at {ass.location_code} has {ass.days_of_supply} Days of Supply remaining. Burn rate: {ass.daily_demand_p50} /day.",
                        synthetic_data=True,
                    )
                )

        db.add_all(alerts_to_insert)
        await db.commit()
        return len(alerts_to_insert)


# Singleton instance
inventory_risk_service = InventoryRiskService()
