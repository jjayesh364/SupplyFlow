"""
GIS Network Routing and MapLibre GeoJSON Export Service.

Constructs directed spatial routing graphs from PostGIS RouteEdges and Locations,
calculates dynamic impedance (travel cost + terrain + weather), computes optimal routes,
and formats MapLibre-compliant GeoJSON layers for the operations dashboard.
"""

from typing import Any
from uuid import UUID

from geoalchemy2.shape import to_shape
from shapely.geometry import mapping
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.location import Location
from app.models.route import RouteEdge
from app.services.gis.terrain_service import terrain_service
from app.services.weather.weather_service import weather_service


class NetworkService:
    """Manages GIS network topology, dynamic graph routing, and GeoJSON visualization payloads."""

    async def get_maplibre_network_geojson(self, db: AsyncSession) -> dict[str, Any]:
        """
        Generate unified MapLibre-compliant GeoJSON FeatureCollection containing:
        1. Point nodes (Base Depots, FSDs, Forward Posts) with current operational metadata.
        2. LineString edges (Road corridors) with real-time dynamic friction and status.
        """
        features: list[dict[str, Any]] = []

        # 1. Fetch all locations
        loc_res = await db.execute(select(Location).where(Location.is_active.is_(True)))
        locations = loc_res.scalars().all()

        for loc in locations:
            # Query current weather for node
            weather = await weather_service.get_current_weather(loc.latitude, loc.longitude)

            features.append(
                {
                    "type": "Feature",
                    "geometry": {
                        "type": "Point",
                        "coordinates": [loc.longitude, loc.latitude],
                    },
                    "properties": {
                        "id": str(loc.id),
                        "code": loc.code,
                        "name": loc.name,
                        "location_type": loc.location_type,
                        "elevation_m": loc.elevation_m,
                        "temperature_c": weather.temperature_c,
                        "snowfall_cm": weather.snowfall_cm,
                        "synthetic_data": True,
                        "layer_type": "LOGISTICS_NODE",
                    },
                }
            )

        # 2. Fetch all route corridors
        route_res = await db.execute(
            select(RouteEdge)
            .options(
                selectinload(RouteEdge.origin_location),
                selectinload(RouteEdge.destination_location),
            )
            .where(RouteEdge.is_active.is_(True))
        )
        routes = route_res.scalars().all()

        for route in routes:
            # Get midpoint weather for route
            mid_lat = (route.origin_location.latitude + route.destination_location.latitude) / 2.0
            mid_lon = (route.origin_location.longitude + route.destination_location.longitude) / 2.0
            weather = await weather_service.get_current_weather(mid_lat, mid_lon)

            # Compute dynamic cost
            cost_info = terrain_service.compute_dynamic_travel_cost(
                route=route,
                weather_friction=weather.friction_multiplier,
                is_weather_blocked=weather.is_blocked,
            )

            # Convert PostGIS geometry to GeoJSON dict via Shapely
            geom_shape = to_shape(route.route_geometry)
            geom_dict = mapping(geom_shape)

            features.append(
                {
                    "type": "Feature",
                    "geometry": geom_dict,
                    "properties": {
                        "id": str(route.id),
                        "origin_id": str(route.origin_location_id),
                        "origin_code": route.origin_location.code,
                        "destination_id": str(route.destination_location_id),
                        "destination_code": route.destination_location.code,
                        "distance_km": route.distance_km,
                        "nominal_travel_time_hrs": route.nominal_travel_time_hrs,
                        "effective_travel_time_hrs": cost_info["effective_travel_time_hrs"],
                        "combined_cost_hrs": cost_info["combined_cost_hrs"],
                        "terrain_friction": cost_info["terrain_friction"],
                        "weather_friction": cost_info["weather_friction"],
                        "effective_friction": cost_info["effective_friction"],
                        "average_slope_deg": cost_info["average_slope_deg"],
                        "is_blocked": cost_info["is_blocked"],
                        "status": cost_info["status"],
                        "road_type": route.road_type,
                        "layer_type": "ROAD_CORRIDOR",
                        "synthetic_data": True,
                    },
                }
            )

        return {
            "type": "FeatureCollection",
            "metadata": {
                "theater": "DEMONSTRATION THEATER — SYNTHETIC LOGISTICS NETWORK",
                "synthetic_data": True,
                "total_nodes": len(locations),
                "total_corridors": len(routes),
            },
            "features": features,
        }

    async def compute_shortest_path(
        self,
        origin_id: UUID,
        destination_id: UUID,
        db: AsyncSession,
    ) -> dict[str, Any]:
        """
        Dijkstra shortest path algorithm across the dynamic route corridor graph.
        Weights edges by real-time effective travel time including terrain & weather friction.
        """
        route_res = await db.execute(
            select(RouteEdge)
            .options(
                selectinload(RouteEdge.origin_location),
                selectinload(RouteEdge.destination_location),
            )
            .where(RouteEdge.is_active.is_(True))
        )
        routes = route_res.scalars().all()

        # Build adjacency graph
        adj: dict[UUID, list[tuple[UUID, float, RouteEdge]]] = {}
        for r in routes:
            if r.origin_location_id not in adj:
                adj[r.origin_location_id] = []

            # Compute dynamic cost
            mid_lat = (r.origin_location.latitude + r.destination_location.latitude) / 2.0
            mid_lon = (r.origin_location.longitude + r.destination_location.longitude) / 2.0
            weather = await weather_service.get_current_weather(mid_lat, mid_lon)
            cost_info = terrain_service.compute_dynamic_travel_cost(r, weather.friction_multiplier, weather.is_blocked)

            # Skip blocked edges
            if cost_info["is_blocked"]:
                continue

            cost = float(cost_info["effective_travel_time_hrs"])
            adj[r.origin_location_id].append((r.destination_location_id, cost, r))

        # Dijkstra algorithm
        import heapq

        distances: dict[UUID, float] = {origin_id: 0.0}
        previous: dict[UUID, tuple[UUID, RouteEdge]] = {}
        pq: list[tuple[float, UUID]] = [(0.0, origin_id)]

        while pq:
            curr_dist, curr_node = heapq.heappop(pq)

            if curr_node == destination_id:
                break

            if curr_dist > distances.get(curr_node, float("inf")):
                continue

            for neighbor, weight, edge in adj.get(curr_node, []):
                new_dist = curr_dist + weight
                if new_dist < distances.get(neighbor, float("inf")):
                    distances[neighbor] = new_dist
                    previous[neighbor] = (curr_node, edge)
                    heapq.heappush(pq, (new_dist, neighbor))

        if destination_id not in distances or destination_id not in previous:
            return {
                "feasible": False,
                "origin_id": str(origin_id),
                "destination_id": str(destination_id),
                "message": "No unblocked path exists between specified nodes under current conditions.",
            }

        # Reconstruct path
        path_corridors: list[dict[str, Any]] = []
        path_node_ids: list[str] = [str(destination_id)]
        curr = destination_id
        total_distance_km = 0.0
        total_travel_time_hrs = 0.0
        max_friction = 1.0
        bottleneck_surface = "HIGHWAY"

        while curr in previous:
            prev_node, edge = previous[curr]
            path_node_ids.insert(0, str(prev_node))

            elev_gain = edge.destination_location.elevation_m - edge.origin_location.elevation_m
            slope_deg = terrain_service.calculate_slope_degrees(edge.distance_km, elev_gain)

            path_corridors.insert(
                0,
                {
                    "route_id": str(edge.id),
                    "origin_code": edge.origin_location.code,
                    "destination_code": edge.destination_location.code,
                    "from_code": edge.origin_location.code,
                    "to_code": edge.destination_location.code,
                    "distance_km": edge.distance_km,
                    "elevation_gain_m": round(elev_gain, 1),
                    "slope_deg": slope_deg,
                    "surface": edge.road_type,
                    "travel_time_hours": edge.nominal_travel_time_hrs,
                    "nominal_hrs": edge.nominal_travel_time_hrs,
                    "weather_friction": edge.weather_friction_multiplier,
                    "is_blocked": edge.is_blocked,
                },
            )
            max_friction = max(max_friction, edge.weather_friction_multiplier)
            bottleneck_surface = edge.road_type
            total_distance_km += edge.distance_km
            total_travel_time_hrs += edge.nominal_travel_time_hrs
            curr = prev_node

        effective_hrs = round(distances[destination_id], 2)
        return {
            "feasible": True,
            "passable": True,
            "origin_id": str(origin_id),
            "destination_id": str(destination_id),
            "path_location_ids": path_node_ids,
            "total_distance_km": round(total_distance_km, 2),
            "total_travel_time_hours": effective_hrs,
            "effective_travel_time_hrs": effective_hrs,
            "nominal_travel_time_hrs": round(total_travel_time_hrs, 2),
            "bottleneck_surface": bottleneck_surface,
            "max_friction_multiplier": max_friction,
            "path_corridors": path_corridors,
            "corridors": path_corridors,
        }


# Singleton instance
network_service = NetworkService()
