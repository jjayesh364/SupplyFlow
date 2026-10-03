/**
 * TypeScript Type Definitions for SupplyFlow
 * Matches backend Pydantic models and API schemas
 */

export interface DatabaseHealthStatus {
  connected: boolean;
  scalar_test: boolean;
  postgis_installed: boolean;
  postgis_version: string | null;
  error: string | null;
}

export interface ConfigParametersSummary {
  dos_critical_threshold_days: number;
  dos_warning_threshold_days: number;
  convoy_daylight_start_hour: number;
  convoy_daylight_end_hour: number;
  max_road_passable_snow_cm_hr: number;
  default_solver_time_limit_seconds: number;
}

export interface BackendHealthResponse {
  status: 'healthy' | 'degraded' | 'offline';
  project_name: string;
  version: string;
  environment: string;
  demo_theater_label: string;
  is_synthetic_data_only: boolean;
  database: DatabaseHealthStatus;
  configuration: ConfigParametersSummary;
}

export interface LocationNode {
  id: string;
  code: string;
  name: string;
  location_type: 'BASE_DEPOT' | 'FORWARD_SUPPLY_DEPOT' | 'FORWARD_POST';
  latitude: number;
  longitude: number;
  elevation_m: number;
  is_active: boolean;
}

export interface SupplyItem {
  id: string;
  code: string;
  name: string;
  category: 'CLASS_I_RATIONS' | 'CLASS_III_POL' | 'CLASS_V_AMMUNITION' | 'CLASS_VIII_MEDICAL';
  unit_of_measure: string;
  weight_kg_per_unit: number;
  volume_m3_per_unit: number;
  is_critical: boolean;
}

export interface InventoryRiskItem {
  location_id: string;
  location_code: string;
  location_name: string;
  location_type: string;
  elevation_m: number;
  item_id: string;
  item_code: string;
  item_name: string;
  category: string;
  is_critical: boolean;
  current_quantity: number;
  safety_stock: number;
  daily_demand_rate: number;
  days_of_supply: number;
  projected_stockout_date: string | null;
  risk_state: 'HEALTHY' | 'WARNING' | 'CRITICAL';
  safety_deficit: number;
  urgency_score: number;
  recommendation: string;
}

export interface DemandForecastItem {
  id: string;
  location_id: string;
  supply_item_id: string;
  forecast_date: string;
  horizon_days: number;
  predicted_quantity: number;
  lower_bound: number;
  upper_bound: number;
  feature_contributions?: Record<string, any>;
  location?: LocationNode;
  supply_item?: SupplyItem;
}

export interface ForecastMetrics {
  wape: number;
  mae: number;
  rmse: number;
  total_eval_samples: number;
  horizons_evaluated: number;
  is_synthetic_data: boolean;
}

export interface AlertItem {
  id: string;
  location_id: string;
  supply_item_id?: string;
  alert_type: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  days_of_supply: number;
  projected_stockout_date: string | null;
  explanation: string;
  is_acknowledged: boolean;
  created_at: string;
}

export interface GeoJSONFeature {
  type: 'Feature';
  geometry: {
    type: 'Point' | 'LineString';
    coordinates: any;
  };
  properties: Record<string, any>;
}

export interface GeoJSONFeatureCollection {
  type: 'FeatureCollection';
  features: GeoJSONFeature[];
  theater_metadata?: Record<string, any>;
}

export interface RoutePlanResult {
  origin_id: string;
  destination_id: string;
  path_location_ids: string[];
  total_distance_km: number;
  total_travel_time_hours: number;
  bottleneck_surface: string;
  max_friction_multiplier: number;
  passable: boolean;
  path_corridors: Array<{
    origin_code: string;
    destination_code: string;
    distance_km: number;
    elevation_gain_m: number;
    slope_deg: number;
    surface: string;
    travel_time_hours: number;
    weather_friction: number;
    is_blocked: boolean;
  }>;
}

export interface OptimizationRunResult {
  run_id: string;
  status: string;
  solver_version: string;
  vehicles_dispatched: number;
  total_demand_satisfied_kg: number;
  total_travel_distance_km: number;
  total_transit_time_hours: number;
  unmet_demand_kg: number;
  routes: Array<{
    vehicle_id: string;
    callsign: string;
    vehicle_type: string;
    stops: Array<{
      node_idx: number;
      location_id: string;
      location_code: string;
      location_name: string;
      delivered_load_kg: number;
      arrival_time: string;
    }>;
    total_distance_km: number;
    total_time_mins: number;
  }>;
}

export interface RecommendationItem {
  id: string;
  recommendation_type: string;
  priority: string;
  action_summary: string;
  payload: Record<string, any>;
}

export interface VehicleItem {
  id: string;
  registration_number: string;
  vehicle_type: string;
  payload_capacity_kg: number;
  volume_capacity_m3: number;
  fuel_capacity_liters: number;
  operational_status: string;
  is_active: boolean;
}

export interface ShipmentItemRecord {
  id: string;
  shipment_number: string;
  origin_location_id: string;
  destination_location_id: string;
  vehicle_id: string;
  status: string;
  dispatch_time: string | null;
  estimated_arrival: string | null;
  priority: string;
  total_weight_kg: number;
  origin_location?: LocationNode;
  destination_location?: LocationNode;
}

export interface SimulationResult {
  status: string;
  scenario_requested: string;
  theater_label: string;
  baseline: {
    total_locations: number;
    critical_stockout_locations: number;
    warning_stockout_locations: number;
    average_days_of_supply: number;
    total_unmet_demand_kg: number;
    blocked_corridors_count: number;
    average_route_friction: number;
    delayed_shipments_count: number;
  };
  simulation: {
    total_locations: number;
    critical_stockout_locations: number;
    warning_stockout_locations: number;
    average_days_of_supply: number;
    total_unmet_demand_kg: number;
    blocked_corridors_count: number;
    average_route_friction: number;
    delayed_shipments_count: number;
  };
  delta: {
    critical_stockouts_delta: number;
    average_dos_delta: number;
    unmet_demand_delta_kg: number;
    blocked_corridors_delta: number;
    route_friction_delta: number;
    delayed_shipments_delta: number;
  };
  disrupted_corridors: Array<{
    id: string;
    name: string;
    weather_friction: number;
    is_blocked: boolean;
  }>;
  critical_nodes: Array<{
    location_code: string;
    location_name: string;
    days_of_supply: number;
    urgency_score: number;
  }>;
  operational_impact_summary: string;
}
