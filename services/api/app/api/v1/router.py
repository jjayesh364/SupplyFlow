"""API v1 master router."""

from fastapi import APIRouter

from app.api.v1.endpoints import (
    gis,
    health,
    intelligence,
    inventory,
    locations,
    operations,
    routes,
    shipments,
    supplies,
    vehicles,
)

api_router = APIRouter()
api_router.include_router(health.router, tags=["Health & System"])
api_router.include_router(locations.router, tags=["Locations"])
api_router.include_router(supplies.router, tags=["Supply Catalog"])
api_router.include_router(inventory.router, tags=["Inventory"])
api_router.include_router(vehicles.router, tags=["Fleet Vehicles"])
api_router.include_router(shipments.router, tags=["Shipments"])
api_router.include_router(routes.router, tags=["Route Corridors"])
api_router.include_router(gis.router, tags=["GIS & Weather"])
api_router.include_router(intelligence.router, tags=["Intelligence & Forecasting"])
api_router.include_router(operations.router, tags=["Operations & Simulation"])
