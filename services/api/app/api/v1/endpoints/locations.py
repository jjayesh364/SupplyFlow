"""Logistics locations endpoints."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.location import Location
from app.schemas.location import LocationRead

router = APIRouter()


@router.get(
    "/locations",
    response_model=list[LocationRead],
    summary="List Logistics Nodes",
    description="Returns all logistics nodes (base depots, forward supply depots, forward posts). Explicitly marked synthetic.",
)
async def list_locations(
    location_type: str | None = Query(None, description="Filter by location type"),
    db: AsyncSession = Depends(get_db),
) -> list[LocationRead]:
    """Retrieve all logistics nodes."""
    query = select(Location).order_by(Location.code)
    if location_type:
        query = query.where(Location.location_type == location_type)

    result = await db.execute(query)
    locations = result.scalars().all()
    return list(locations)
