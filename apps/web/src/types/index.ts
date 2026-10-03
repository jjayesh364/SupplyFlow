/**
 * TypeScript Type Definitions for SupplyFlow
 * Matches backend Pydantic models
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
