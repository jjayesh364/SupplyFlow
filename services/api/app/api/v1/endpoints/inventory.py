"""Inventory state endpoints."""

from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.models.inventory import Inventory
from app.schemas.inventory import InventoryRead

router = APIRouter()


@router.get(
    "/inventory",
    response_model=list[InventoryRead],
    summary="List Inventory Levels",
    description="Returns current stock levels with associated location and supply item details.",
)
async def list_inventory(
    location_id: UUID | None = Query(None, description="Filter by location UUID"),
    item_id: UUID | None = Query(None, description="Filter by supply item UUID"),
    limit: int = Query(100, ge=1, le=1000, description="Max records to return"),
    db: AsyncSession = Depends(get_db),
) -> list[InventoryRead]:
    """Retrieve inventory levels."""
    query = select(Inventory).options(selectinload(Inventory.location), selectinload(Inventory.item)).limit(limit)
    if location_id:
        query = query.where(Inventory.location_id == location_id)
    if item_id:
        query = query.where(Inventory.item_id == item_id)

    result = await db.execute(query)
    records = result.scalars().all()
    return list(records)
