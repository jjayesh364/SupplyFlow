import {
  AlertItem,
  BackendHealthResponse,
  DemandForecastItem,
  ForecastTrainingResponse,
  GeoJSONFeatureCollection,
  InventoryRiskItem,
  LocationNode,
  OptimizationRunResult,
  RecommendationItem,
  RoutePlanResult,
  ShipmentItemRecord,
  SimulationResult,
  SupplyItem,
  VehicleItem,
} from '@/types';

// Production calls stay same-origin and pass through the Next.js rewrite.
// Local development may keep using the existing direct FastAPI URL.
const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

export interface AssistantStatus {
  available: boolean;
  language: 'en';
  message: string | null;
}

export type AssistantLanguage = 'en' | 'hi' | 'gu' | 'mr' | 'pa' | 'bn';

export interface AssistantFact {
  source: string;
  fact: string;
  kind?: 'inventory_risk_summary' | 'inventory_risk_record';
  inventory_summary?: {
    record_count: number;
    risk_counts: Record<string, number>;
  };
  inventory_record?: {
    item_name: string;
    location_name: string;
    risk_state: string;
    days_of_supply: number | null;
    current_quantity: number | null;
    daily_demand_p50: number | null;
    safety_stock_breach: boolean | null;
  };
  coverage?: {
    group: string;
    index: number;
    provided: number;
    total: number;
    complete: boolean;
  };
}

export interface AssistantReply {
  available: boolean;
  message?: string;
  facts: AssistantFact[];
  explanation: string | null;
  explanation_label?: string;
  synthetic_data?: boolean;
}

async function safeFetch<T>(endpoint: string, options?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      cache: 'no-store',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...(options?.headers || {}),
      },
      ...options,
    });
    if (!res.ok) {
      console.warn(`API request ${endpoint} returned HTTP ${res.status}`);
      return null;
    }
    return (await res.json()) as T;
  } catch (error) {
    console.error(`Network error requesting ${endpoint}:`, error);
    return null;
  }
}

export async function fetchBackendHealth(): Promise<BackendHealthResponse | null> {
  return safeFetch<BackendHealthResponse>('/api/v1/health');
}

export async function fetchLocations(): Promise<LocationNode[]> {
  const data = await safeFetch<LocationNode[]>('/api/v1/locations');
  return data || [];
}

export async function fetchSupplies(): Promise<SupplyItem[]> {
  const data = await safeFetch<SupplyItem[]>('/api/v1/supplies');
  return data || [];
}

export async function fetchNetworkGeoJSON(): Promise<GeoJSONFeatureCollection | null> {
  return safeFetch<GeoJSONFeatureCollection>('/api/v1/gis/network-geojson');
}

export async function fetchRoutePlan(
  originId: string,
  destinationId: string
): Promise<RoutePlanResult | null> {
  return safeFetch<RoutePlanResult>(
    `/api/v1/gis/route-plan?origin_id=${originId}&destination_id=${destinationId}`
  );
}

export async function fetchInventoryRisks(
  locationType?: string,
  riskState?: string
): Promise<InventoryRiskItem[]> {
  const params = new URLSearchParams();
  if (locationType && locationType !== 'ALL') params.append('location_type', locationType);
  if (riskState && riskState !== 'ALL') params.append('risk_state', riskState);
  const q = params.toString() ? `?${params.toString()}` : '';
  const data = await safeFetch<InventoryRiskItem[]>(`/api/v1/inventory/risk-assessment${q}`);
  return data || [];
}

export async function fetchForecasts(
  locationId?: string,
  itemId?: string,
  limit: number = 1000
): Promise<DemandForecastItem[] | null> {
  const params = new URLSearchParams();
  if (locationId) params.append('location_id', locationId);
  if (itemId) params.append('item_id', itemId);
  params.append('limit', limit.toString());
  return safeFetch<DemandForecastItem[]>(`/api/v1/forecasts?${params.toString()}`);
}

export async function triggerForecastTraining(): Promise<ForecastTrainingResponse | null> {
  return safeFetch<ForecastTrainingResponse>('/api/v1/forecasts/train-and-refresh', {
    method: 'POST',
  });
}

export async function fetchAlerts(severity?: string): Promise<AlertItem[]> {
  const q = severity && severity !== 'ALL' ? `?severity=${severity}` : '';
  const data = await safeFetch<AlertItem[]>(`/api/v1/alerts${q}`);
  return data || [];
}

export async function triggerOptimization(payload?: {
  max_solve_time_seconds?: number;
  priority_filter?: string;
}): Promise<OptimizationRunResult | null> {
  return safeFetch<OptimizationRunResult>('/api/v1/optimization/solve-dispatch', {
    method: 'POST',
    body: JSON.stringify(payload || { max_solve_time_seconds: 10 }),
  });
}

export async function fetchRecommendations(): Promise<RecommendationItem[] | null> {
  return safeFetch<RecommendationItem[]>('/api/v1/optimization/recommendations');
}

export async function fetchVehicles(): Promise<VehicleItem[]> {
  const data = await safeFetch<VehicleItem[]>('/api/v1/vehicles');
  return data || [];
}

export async function fetchShipments(): Promise<ShipmentItemRecord[]> {
  const data = await safeFetch<ShipmentItemRecord[]>('/api/v1/shipments');
  return data || [];
}

export async function runSimulation(scenarioType: string): Promise<SimulationResult | null> {
  return safeFetch<SimulationResult>('/api/v1/simulation/scenario', {
    method: 'POST',
    body: JSON.stringify({ scenario_type: scenarioType }),
  });
}

export async function fetchAssistantStatus(): Promise<AssistantStatus | null> {
  return safeFetch<AssistantStatus>('/api/v1/assistant/status');
}

export async function askAssistant(question: string, language: AssistantLanguage = 'en'): Promise<AssistantReply | null> {
  return safeFetch<AssistantReply>('/api/v1/assistant/ask', {
    method: 'POST',
    body: JSON.stringify({ question, language }),
  });
}
