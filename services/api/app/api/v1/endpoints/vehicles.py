"""Fleet vehicle status endpoints."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.models.vehicle import Vehicle
from app.schemas.vehicle import VehicleRead

router = APIRouter()


@router.get(
    "/vehicles",
    response_model=list[VehicleRead],
    summary="List Fleet Vehicles",
    description="Returns fleet vehicles with current readiness status and payload/volume capacities.",
)
async def list_vehicles(
    vehicle_type: str | None = Query(None, description="Filter by vehicle type"),
    status: str | None = Query(None, description="Filter by status (AVAILABLE, IN_TRANSIT, MAINTENANCE)"),
    db: AsyncSession = Depends(get_db),
) -> list[VehicleRead]:
    """Retrieve fleet vehicles."""
    query = (
        select(Vehicle)
        .options(selectinload(Vehicle.home_location), selectinload(Vehicle.current_location))
        .order_by(Vehicle.vehicle_code)
    )
    if vehicle_type:
        query = query.where(Vehicle.vehicle_type == vehicle_type)
    if status:
        query = query.where(Vehicle.status == status)

    result = await db.execute(query)
    vehicles = result.scalars().all()
    return list(vehicles)
