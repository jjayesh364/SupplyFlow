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

export interface SafeFetchOptions extends RequestInit {
  timeoutMs?: number;
  retries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  skipDedupe?: boolean;
}

export interface ConnectionStateSnapshot {
  isWakingUp: boolean;
  isRetrying: boolean;
  activeRetriesCount: number;
}

type ConnectionStateListener = (snapshot: ConnectionStateSnapshot) => void;

const connectionListeners = new Set<ConnectionStateListener>();
let activeRetriesCount = 0;
let isWakingUpState = false;

function notifyConnectionListeners() {
  const snapshot: ConnectionStateSnapshot = {
    isWakingUp: isWakingUpState,
    isRetrying: activeRetriesCount > 0,
    activeRetriesCount,
  };
  connectionListeners.forEach((listener) => {
    try {
      listener(snapshot);
    } catch {
      // Ignore subscriber errors
    }
  });
}

export function subscribeConnectionState(listener: ConnectionStateListener): () => void {
  connectionListeners.add(listener);
  listener({
    isWakingUp: isWakingUpState,
    isRetrying: activeRetriesCount > 0,
    activeRetriesCount,
  });
  return () => {
    connectionListeners.delete(listener);
  };
}

export function getConnectionState(): ConnectionStateSnapshot {
  return {
    isWakingUp: isWakingUpState,
    isRetrying: activeRetriesCount > 0,
    activeRetriesCount,
  };
}

// In-flight deduplication map for identical GET requests
const inFlightRequests = new Map<string, Promise<unknown>>();

export function parseRetryAfter(headerValue: string | null): number | null {
  if (!headerValue) return null;
  const seconds = Number(headerValue);
  if (!Number.isNaN(seconds) && seconds >= 0) {
    return seconds * 1000;
  }
  const dateParsed = Date.parse(headerValue);
  if (!Number.isNaN(dateParsed)) {
    const diff = dateParsed - Date.now();
    return diff > 0 ? diff : 0;
  }
  return null;
}

export function calculateBackoffDelay(
  attempt: number,
  baseDelayMs: number = 1000,
  maxDelayMs: number = 10000,
  retryAfterMs?: number | null
): number {
  if (retryAfterMs != null && retryAfterMs > 0) {
    return Math.min(retryAfterMs, maxDelayMs);
  }
  const exponential = Math.min(baseDelayMs * Math.pow(2, attempt - 1), maxDelayMs);
  const jitter = Math.floor(Math.random() * 500);
  return exponential + jitter;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function safeFetch<T>(endpoint: string, options?: SafeFetchOptions): Promise<T | null> {
  const method = (options?.method || 'GET').toUpperCase();
  const isIdempotent = method === 'GET' || method === 'HEAD';
  const shouldDedupe = isIdempotent && !options?.skipDedupe;
  const dedupeKey = `${method}:${API_BASE}${endpoint}`;

  if (shouldDedupe && inFlightRequests.has(dedupeKey)) {
    return inFlightRequests.get(dedupeKey) as Promise<T | null>;
  }

  const fetchPromise = (async (): Promise<T | null> => {
    // Non-idempotent operations (POST, PUT, DELETE) must NEVER be automatically retried.
    const maxRetries = isIdempotent ? (options?.retries ?? 4) : 0;
    const timeoutMs = options?.timeoutMs ?? 15000;
    const baseDelayMs = options?.baseDelayMs ?? 1000;
    const maxDelayMs = options?.maxDelayMs ?? 10000;

    let attempt = 0;

    while (attempt <= maxRetries) {
      attempt++;
      const controller = new AbortController();
      let didTimeout = false;
      const timeoutId = setTimeout(() => {
        didTimeout = true;
        controller.abort(new Error('Request timed out'));
      }, timeoutMs);

      if (options?.signal) {
        options.signal.addEventListener('abort', () => controller.abort(options.signal?.reason), { once: true });
      }

      try {
        const res = await fetch(`${API_BASE}${endpoint}`, {
          cache: 'no-store',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            ...(options?.headers || {}),
          },
          ...options,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        const getHeader = (name: string): string | null => {
          if (!res.headers || typeof res.headers.get !== 'function') return null;
          return res.headers.get(name);
        };

        const isTransientStatus =
          res.status === 502 || res.status === 503 || res.status === 504 || res.status === 429 || res.status === 408;
        const contentType = getHeader('content-type') || '';
        const isHtmlWakeupPage = contentType.includes('text/html');

        if (isTransientStatus || isHtmlWakeupPage || !res.ok) {
          if (!res.ok) {
            console.warn(`API request ${endpoint} returned HTTP ${res.status}${isHtmlWakeupPage ? ' (HTML wake-up response)' : ''}`);
          }

          if (isIdempotent && attempt <= maxRetries && (isTransientStatus || isHtmlWakeupPage)) {
            isWakingUpState = true;
            activeRetriesCount++;
            notifyConnectionListeners();

            const retryAfterMs = parseRetryAfter(getHeader('Retry-After'));
            const delay = calculateBackoffDelay(attempt, baseDelayMs, maxDelayMs, retryAfterMs);
            await sleep(delay);

            activeRetriesCount = Math.max(0, activeRetriesCount - 1);
            if (activeRetriesCount === 0) {
              isWakingUpState = false;
            }
            notifyConnectionListeners();
            continue;
          }

          return null;
        }

        try {
          const data = (await res.json()) as T;
          return data;
        } catch (jsonErr) {
          console.error(`Failed to parse JSON response from ${endpoint}:`, jsonErr);
          return null;
        }
      } catch (err: unknown) {
        clearTimeout(timeoutId);

        const isAbortOrTimeout = didTimeout || (err instanceof Error && err.name === 'AbortError');
        const isNetworkError = err instanceof TypeError || isAbortOrTimeout;

        if (isIdempotent && attempt <= maxRetries && isNetworkError) {
          console.warn(`Transient network error on ${endpoint} (attempt ${attempt}/${maxRetries}):`, err);
          isWakingUpState = true;
          activeRetriesCount++;
          notifyConnectionListeners();

          const delay = calculateBackoffDelay(attempt, baseDelayMs, maxDelayMs, null);
          await sleep(delay);

          activeRetriesCount = Math.max(0, activeRetriesCount - 1);
          if (activeRetriesCount === 0) {
            isWakingUpState = false;
          }
          notifyConnectionListeners();
          continue;
        }

        console.error(`Network error requesting ${endpoint}:`, err);
        return null;
      }
    }

    return null;
  })();

  if (shouldDedupe) {
    inFlightRequests.set(dedupeKey, fetchPromise);
    fetchPromise.finally(() => {
      inFlightRequests.delete(dedupeKey);
    });
  }

  return fetchPromise;
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
