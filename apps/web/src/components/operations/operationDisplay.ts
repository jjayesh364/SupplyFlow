import type { DemandForecastItem, ForecastMetrics, ForecastTrainingResponse, RecommendationItem } from '@/types';

export function filterForecastsForSelection(
  forecasts: DemandForecastItem[],
  locationId: string,
  itemId: string,
): DemandForecastItem[] {
  return forecasts
    .filter((forecast) => forecast.location_id === locationId && forecast.item_id === itemId)
    .slice()
    .sort((a, b) => a.forecast_date.localeCompare(b.forecast_date));
}

export function getRecommendationTitle(type: string): string {
  return type
    .split('_')
    .filter(Boolean)
    .map((part) => part[0] + part.slice(1).toLowerCase())
    .join(' ');
}

export function getRecommendationStatusMessage(status: string): string {
  return status === 'PROPOSED'
    ? 'Proposal requires human review; it is not approved for execution.'
    : `Current status: ${status || 'Not available'}`;
}

export function getRecommendationStateMessage(
  isLoading: boolean,
  hasError: boolean,
  recommendationCount: number,
): string | null {
  if (isLoading) return 'Loading recommendations…';
  if (hasError) return 'Recommendations could not be loaded. Refresh the data and try again.';
  if (recommendationCount === 0) {
    return 'No recommendations were returned. This does not indicate that all supplies are adequate.';
  }
  return null;
}

export function getRecommendationDetailRows(
  details: RecommendationItem['details'],
): Array<{ label: string; value: string }> {
  if (!details || typeof details !== 'object') return [];

  const rows: Array<{ label: string; value: string }> = [];
  if (typeof details.vehicle_code === 'string' && details.vehicle_code.trim()) {
    rows.push({ label: 'Vehicle', value: details.vehicle_code });
  }
  if (Array.isArray(details.stops)) {
    const stops = details.stops.filter((stop): stop is string => typeof stop === 'string' && !!stop.trim());
    if (stops.length > 0) rows.push({ label: 'Stops', value: stops.join(' → ') });
  }
  if (typeof details.allocated_payload_kg === 'number' && Number.isFinite(details.allocated_payload_kg)) {
    rows.push({ label: 'Allocated payload', value: `${details.allocated_payload_kg.toLocaleString()} kg` });
  }
  if (typeof details.capacity_kg === 'number' && Number.isFinite(details.capacity_kg)) {
    rows.push({ label: 'Vehicle capacity', value: `${details.capacity_kg.toLocaleString()} kg` });
  }
  if (typeof details.estimated_hours === 'number' && Number.isFinite(details.estimated_hours)) {
    rows.push({ label: 'Estimated duration', value: `${details.estimated_hours.toLocaleString()} hours` });
  }
  if (typeof details.total_distance_km === 'number' && Number.isFinite(details.total_distance_km)) {
    rows.push({ label: 'Total distance', value: `${details.total_distance_km.toLocaleString()} km` });
  }
  return rows;
}

export function formatForecastValue(value: number | null, unit?: string): string {
  if (value === null || !Number.isFinite(value)) return 'Not available';
  return `${value.toFixed(1)}${unit ? ` ${unit}` : ''}`;
}

export function getForecastQuantiles(forecast: DemandForecastItem): {
  p10: number | null;
  p50: number | null;
  p90: number | null;
} {
  return {
    p10: forecast.predicted_demand_p10,
    p50: forecast.predicted_demand_p50,
    p90: forecast.predicted_demand_p90,
  };
}

export function getTrainingEvaluationMetrics(
  response: ForecastTrainingResponse | null,
): ForecastMetrics | null {
  return response?.evaluation_metrics ?? null;
}

export function getForecastStateMessage(
  isLoading: boolean,
  hasError: boolean,
  hasRecords: boolean,
  location: string,
  item: string,
): string | null {
  if (isLoading) return 'Loading forecast data…';
  if (hasError) return 'Forecast records could not be loaded. Refresh the data and try again.';
  if (!hasRecords) return `No forecasts are available for ${location} and ${item}. Try another selection or generate forecasts.`;
  return null;
}

export function getForecastHorizon(forecast: DemandForecastItem): number | null {
  const horizon = forecast.feature_contributions?.horizon_days;
  return typeof horizon === 'number' && Number.isFinite(horizon) ? horizon : null;
}
