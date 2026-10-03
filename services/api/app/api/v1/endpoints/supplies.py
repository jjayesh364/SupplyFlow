"""Supply items catalog endpoints."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.supply import SupplyItem
from app.schemas.supply import SupplyItemRead

router = APIRouter()


@router.get(
    "/supplies",
    response_model=list[SupplyItemRead],
    summary="List Supply Items Catalog",
    description="Returns all military logistics supply items across rations, fuel, ammunition, medical, engineering.",
)
async def list_supplies(
    category: str | None = Query(None, description="Filter by category (RATIONS, FUEL_POL, AMMUNITION, etc.)"),
    is_critical: bool | None = Query(None, description="Filter by criticality flag"),
    db: AsyncSession = Depends(get_db),
) -> list[SupplyItemRead]:
    """Retrieve supply items catalog."""
    query = select(SupplyItem).order_by(SupplyItem.category, SupplyItem.sku)
    if category:
        query = query.where(SupplyItem.category == category)
    if is_critical is not None:
        query = query.where(SupplyItem.is_critical == is_critical)

    result = await db.execute(query)
    items = result.scalars().all()
    return list(items)
