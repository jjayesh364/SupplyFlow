"""Shipment logistics tracking endpoints."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.models.shipment import Shipment, ShipmentItem
from app.schemas.shipment import ShipmentRead

router = APIRouter()


@router.get(
    "/shipments",
    response_model=list[ShipmentRead],
    summary="List Shipments",
    description="Returns logistics cargo movements and their item manifests.",
)
async def list_shipments(
    status: str | None = Query(None, description="Filter by shipment status (PLANNED, IN_TRANSIT, DELIVERED, etc.)"),
    db: AsyncSession = Depends(get_db),
) -> list[ShipmentRead]:
    """Retrieve cargo shipments."""
    query = (
        select(Shipment)
        .options(
            selectinload(Shipment.origin_location),
            selectinload(Shipment.destination_location),
            selectinload(Shipment.vehicle),
            selectinload(Shipment.items).selectinload(ShipmentItem.item),
        )
        .order_by(Shipment.departure_time.desc())
    )
    if status:
        query = query.where(Shipment.status == status)

    result = await db.execute(query)
    shipments = result.scalars().all()
    return list(shipments)
