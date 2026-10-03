"""Tests for SQLAlchemy models, PostGIS geometry, and check constraints."""

import pytest
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db.session import sync_engine
from app.models.location import Location
from app.models.route import RouteEdge


def test_location_spatial_point():
    """Verify PostGIS ST_AsText returns POINT coordinates."""
    with Session(sync_engine) as session:
        loc = session.query(Location).filter(Location.code == "LOC-BASE-ALPHA").first()
        assert loc is not None
        assert loc.synthetic_data is True

        # Query PostGIS spatial function directly
        res = session.execute(
            text("SELECT ST_AsText(coordinates) FROM locations WHERE id = :id"),
            {"id": loc.id},
        ).scalar()
        assert res.startswith("POINT(")
        assert f"{loc.longitude}" in res or f"{round(loc.longitude, 4)}" in res


def test_route_edge_spatial_linestring():
    """Verify PostGIS ST_AsText returns LINESTRING coordinates."""
    with Session(sync_engine) as session:
        route = session.query(RouteEdge).first()
        assert route is not None
        assert route.synthetic_data is True

        res = session.execute(
            text(
                "SELECT ST_AsText(route_geometry), ST_Length(route_geometry::geography) FROM route_edges WHERE id = :id"
            ),
            {"id": route.id},
        ).first()
        assert res[0].startswith("LINESTRING(")
        assert res[1] > 0  # geography length in meters > 0


def test_inventory_check_constraint_rejects_negative_quantity():
    """Verify database CheckConstraint rejects negative inventory quantities."""
    with Session(sync_engine) as session:
        loc = session.query(Location).first()
        from app.models.supply import SupplyItem

        item = session.query(SupplyItem).first()

        from app.models.inventory import Inventory

        invalid_inv = Inventory(
            location_id=loc.id,
            item_id=item.id,
            quantity=-50.0,
            reserved_quantity=0.0,
            safety_stock=10.0,
            max_capacity=500.0,
        )
        session.add(invalid_inv)
        with pytest.raises(IntegrityError) as exc_info:
            session.commit()
        assert "chk_inventory_quantity_non_negative" in str(exc_info.value)
        session.rollback()


def test_route_check_constraint_rejects_sub_unity_friction():
    """Verify database CheckConstraint rejects weather friction multiplier < 1.0."""
    with Session(sync_engine) as session:
        locs = session.query(Location).limit(2).all()
        invalid_route = RouteEdge(
            origin_location_id=locs[0].id,
            destination_location_id=locs[1].id,
            route_geometry=f"SRID=4326;LINESTRING({locs[0].longitude} {locs[0].latitude}, {locs[1].longitude} {locs[1].latitude})",
            distance_km=45.0,
            nominal_travel_time_hrs=2.0,
            weather_friction_multiplier=0.5,  # Invalid: friction cannot be less than 1.0
        )
        session.add(invalid_route)
        with pytest.raises(IntegrityError) as exc_info:
            session.commit()
        assert "chk_route_friction_gte_one" in str(exc_info.value)
        session.rollback()
