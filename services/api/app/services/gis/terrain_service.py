"""
Terrain and Slope Analysis Service for SupplyFlow.

Models high-altitude mountain topography, elevation profiles, slope angles,
and surface-friction resistance factors for freight transport vehicles.
"""

import math
from dataclasses import dataclass
from typing import ClassVar

from app.models.route import RouteEdge


@dataclass
class TerrainProfile:
    """Terrain profile metrics for a route edge corridor."""

    distance_km: float
    origin_elevation_m: float
    destination_elevation_m: float
    elevation_gain_m: float
    average_slope_deg: float
    max_slope_deg: float
    surface_friction_factor: float
    grade_friction_factor: float
    terrain_friction_multiplier: float


class TerrainService:
    """Calculates topographic friction factors based on gradient, elevation, and road surface."""

    # Surface resistance multipliers based on road engineering classifications
    SURFACE_FACTORS: ClassVar[dict[str, float]] = {
        "HIGHWAY": 1.0,
        "PAVED_SURFACE": 1.1,
        "MOUNTAIN_ROAD": 1.25,
        "UNPAVED_TRACK": 1.55,
        "OFF_ROAD_TRAIL": 2.0,
    }

    def calculate_slope_degrees(self, distance_km: float, elev_diff_m: float) -> float:
        """Calculate average slope angle in degrees from elevation difference and 2D distance."""
        if distance_km <= 0.0:
            return 0.0
        distance_m = distance_km * 1000.0
        gradient = elev_diff_m / distance_m
        angle_rad = math.atan(gradient)
        return round(math.degrees(angle_rad), 2)

    def calculate_grade_friction(self, slope_deg: float) -> float:
        """
        Calculate vehicle grade resistance factor based on mountain slope.
        Steep inclines severely degrade speed and payload efficiency of multi-axle freight trucks.
        """
        abs_slope = abs(slope_deg)
        if abs_slope < 1.0:
            return 1.0

        # Grade resistance curve: moderate on mild slope, exponential on steep passes (> 8 deg)
        grade_multiplier = 1.0 + (0.035 * abs_slope) + (0.002 * (abs_slope**2))
        return round(max(1.0, grade_multiplier), 3)

    def analyze_route_terrain(
        self,
        distance_km: float,
        origin_elev_m: float,
        dest_elev_m: float,
        road_type: str = "MOUNTAIN_ROAD",
    ) -> TerrainProfile:
        """Compute full terrain profile for a road corridor."""
        elev_gain = dest_elev_m - origin_elev_m
        slope_deg = self.calculate_slope_degrees(distance_km, elev_gain)

        surface_factor = self.SURFACE_FACTORS.get(road_type.upper(), 1.25)
        grade_factor = self.calculate_grade_friction(slope_deg)

        # Combined terrain multiplier (surface * grade)
        terrain_multiplier = round(surface_factor * grade_factor, 3)

        return TerrainProfile(
            distance_km=distance_km,
            origin_elevation_m=origin_elev_m,
            destination_elevation_m=dest_elev_m,
            elevation_gain_m=round(elev_gain, 1),
            average_slope_deg=slope_deg,
            max_slope_deg=round(abs(slope_deg) * 1.3, 2),  # Estimated peak pass gradient
            surface_friction_factor=surface_factor,
            grade_friction_factor=grade_factor,
            terrain_friction_multiplier=terrain_multiplier,
        )

    def compute_dynamic_travel_cost(
        self,
        route: RouteEdge,
        weather_friction: float = 1.0,
        is_weather_blocked: bool = False,
    ) -> dict[str, float | bool | str]:
        """
        Calculate unified operational transit cost in effective travel hours.
        Accounts for distance, nominal speed, topography, road surface, and weather friction.
        """
        is_blocked = route.is_blocked or is_weather_blocked

        terrain_profile = self.analyze_route_terrain(
            distance_km=route.distance_km,
            origin_elev_m=route.origin_location.elevation_m if route.origin_location else 2000.0,
            dest_elev_m=route.destination_location.elevation_m if route.destination_location else 2500.0,
            road_type=route.road_type,
        )

        effective_friction = round(terrain_profile.terrain_friction_multiplier * weather_friction, 3)
        effective_travel_time_hrs = round(route.nominal_travel_time_hrs * effective_friction, 2)

        # Cost metric in hours (infinite if road corridor is severed)
        effective_cost = 99999.0 if is_blocked else effective_travel_time_hrs

        return {
            "route_id": str(route.id),
            "distance_km": route.distance_km,
            "nominal_travel_time_hrs": route.nominal_travel_time_hrs,
            "effective_travel_time_hrs": effective_travel_time_hrs,
            "combined_cost_hrs": effective_cost,
            "terrain_friction": terrain_profile.terrain_friction_multiplier,
            "weather_friction": weather_friction,
            "effective_friction": effective_friction,
            "average_slope_deg": terrain_profile.average_slope_deg,
            "is_blocked": is_blocked,
            "status": "BLOCKED" if is_blocked else ("DEGRADED" if effective_friction > 1.8 else "NORMAL"),
        }


# Singleton instance
terrain_service = TerrainService()
