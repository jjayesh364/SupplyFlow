-- SupplyFlow PostGIS Database Initialization Script
-- Ensures spatial extensions are installed in supplyflow database

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "postgis_topology";

-- Display PostGIS and GEOS versions
DO $$
BEGIN
    RAISE NOTICE 'SupplyFlow PostGIS Initialized: %', postgis_full_version();
END $$;
