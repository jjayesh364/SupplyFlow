"""Alembic environment configuration for SupplyFlow."""

import sys
from logging.config import fileConfig
from pathlib import Path

from sqlalchemy import engine_from_config, pool

from alembic import context

# Ensure services/api is on sys.path
api_root = Path(__file__).resolve().parent.parent
if str(api_root) not in sys.path:
    sys.path.insert(0, str(api_root))

import app.models  # noqa: F401 - ensure all models are registered on Base.metadata
from app.core.config import settings
from app.db.base import Base

config = context.config

# Interpret the config file for Python logging
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Set dynamic database URL from settings
config.set_main_option("sqlalchemy.url", settings.SYNC_DATABASE_URL)

target_metadata = Base.metadata


def include_object(object, name, type_, reflected, compare_to):
    """Exclude PostGIS internal spatial tables from migrations."""
    return not (
        type_ == "table"
        and name
        in [
            "spatial_ref_sys",
            "geometry_columns",
            "geography_columns",
            "raster_columns",
            "raster_overviews",
        ]
    )


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        include_object=include_object,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            include_object=include_object,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
