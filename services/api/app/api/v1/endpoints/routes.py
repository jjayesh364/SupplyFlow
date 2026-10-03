"""Route edge corridor endpoints."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.models.route import RouteEdge
from app.schemas.route import RouteEdgeRead

router = APIRouter()


@router.get(
    "/routes",
    response_model=list[RouteEdgeRead],
    summary="List Road Corridor Edges",
    description="Returns road network corridors with distance, slope, elevation, and weather friction multipliers.",
)
async def list_routes(
    is_blocked: bool | None = Query(None, description="Filter by blocked status"),
    road_type: str | None = Query(None, description="Filter by road type"),
    db: AsyncSession = Depends(get_db),
) -> list[RouteEdgeRead]:
    """Retrieve road corridor network edges."""
    query = (
        select(RouteEdge)
        .options(
            selectinload(RouteEdge.origin_location),
            selectinload(RouteEdge.destination_location),
        )
        .order_by(RouteEdge.distance_km)
    )
    if is_blocked is not None:
        query = query.where(RouteEdge.is_blocked == is_blocked)
    if road_type:
        query = query.where(RouteEdge.road_type == road_type)

    result = await db.execute(query)
    edges = result.scalars().all()
    return list(edges)
