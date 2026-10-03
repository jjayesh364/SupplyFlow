"""Models package exporting all SQLAlchemy entities."""

from app.models.alert import Alert
from app.models.consumption import ConsumptionRecord
from app.models.forecast import DemandForecast
from app.models.inventory import Inventory
from app.models.location import Location
from app.models.optimization import OptimizationRun, Recommendation
from app.models.route import RouteEdge
from app.models.shipment import Shipment, ShipmentItem
from app.models.supply import SupplyItem
from app.models.vehicle import Vehicle

__all__ = [
    "Alert",
    "ConsumptionRecord",
    "DemandForecast",
    "Inventory",
    "Location",
    "OptimizationRun",
    "Recommendation",
    "RouteEdge",
    "Shipment",
    "ShipmentItem",
    "SupplyItem",
    "Vehicle",
]
