'use client';

import React, { useMemo, useState } from 'react';
import { DemandForecastItem, ForecastMetrics, LocationNode, SupplyItem } from '@/types';
import {
  filterForecastsForSelection,
  formatForecastValue,
  getForecastHorizon,
  getForecastQuantiles,
  getForecastStateMessage,
} from '@/components/operations/operationDisplay';
import { Cpu, RefreshCw, TrendingUp } from 'lucide-react';

interface ForecastingTabProps {
  forecasts: DemandForecastItem[];
  locations: LocationNode[];
  supplies: SupplyItem[];
  onRetrainForecast: () => void;
  onFiltersChange: (locationId: string, itemId: string) => Promise<boolean>;
  isRetraining: boolean;
  metrics?: ForecastMetrics | null;
  isLoading: boolean;
  hasLoadError: boolean;
}

export const ForecastingTab: React.FC<ForecastingTabProps> = ({
  forecasts,
  locations,
  supplies,
  onRetrainForecast,
  onFiltersChange,
  isRetraining,
  metrics,
  isLoading,
  hasLoadError,
}) => {
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');
  const [selectedSupplyId, setSelectedSupplyId] = useState<string>('');
  const [isSelectionLoading, setIsSelectionLoading] = useState<boolean>(false);

  // Default to first location and first supply item if none selected
  const activeLocId = selectedLocationId || (locations[0]?.id ?? '');
  const activeSupId = selectedSupplyId || (supplies[0]?.id ?? '');

  const activeLocation = locations.find((l) => l.id === activeLocId);
  const activeSupply = supplies.find((s) => s.id === activeSupId);
  const loadingForecasts = isLoading || isSelectionLoading;

  const updateSelection = async (locationId: string, itemId: string) => {
    setIsSelectionLoading(true);
    try {
      await onFiltersChange(locationId, itemId);
    } finally {
      setIsSelectionLoading(false);
    }
  };

  // Forecast API rows use item_id and location_id; keep the selected pair exact.
  const pairForecasts = useMemo(() => {
    return filterForecastsForSelection(forecasts, activeLocId, activeSupId);
  }, [forecasts, activeLocId, activeSupId]);

  // Scaled max for SVG chart
  const chartForecasts = pairForecasts.filter(
    (forecast): forecast is DemandForecastItem & { predicted_demand_p50: number } =>
      typeof forecast.predicted_demand_p50 === 'number' && Number.isFinite(forecast.predicted_demand_p50),
  );
  const bandForecasts = chartForecasts.filter(
    (forecast): forecast is DemandForecastItem & {
      predicted_demand_p50: number;
      predicted_demand_p10: number;
      predicted_demand_p90: number;
    } => typeof forecast.predicted_demand_p10 === 'number' && Number.isFinite(forecast.predicted_demand_p10)
      && typeof forecast.predicted_demand_p90 === 'number' && Number.isFinite(forecast.predicted_demand_p90),
  );
  const maxVal = Math.max(
    100,
    ...pairForecasts.flatMap((forecast) => [forecast.predicted_demand_p90, forecast.predicted_demand_p50])
      .filter((value): value is number => value !== null && Number.isFinite(value))
      .map((value) => value * 1.25),
  );

  return (
    <div className="space-y-6">
      {/* Current training evaluation; forecast records are shown separately below. */}
      <div className="bg-tactical-900 border border-tactical-800 rounded-lg p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <Cpu className="w-4 h-4 text-accent-primary" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-tactical-100 font-mono">
                Model Evaluation
              </h3>
            </div>
            <p className="text-sm text-tactical-400">These measures describe model evaluation from the latest training request. They do not mean that forecast records are available for the selected item and location.</p>
          </div>

          <button
            onClick={onRetrainForecast}
            disabled={isRetraining}
            className="flex items-center space-x-2 px-3.5 py-2 rounded bg-accent-primary hover:bg-accent-primary/90 text-white font-mono text-xs font-medium transition-colors shadow"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRetraining ? 'animate-spin' : ''}`} />
            <span>{isRetraining ? 'Updating the model…' : 'Update forecast model'}</span>
          </button>
        </div>

        {metrics ? <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="p-3 bg-tactical-50 border border-tactical-800 rounded">
            <div className="text-sm text-tactical-400">Training WAPE (percentage error)</div>
            <div className="text-2xl font-mono font-bold text-accent-success mt-0.5">
              {(metrics.wape * 100).toFixed(2)}%
            </div>
            <div className="text-xs text-tactical-500 mt-1">Synthetic evaluation samples only</div>
          </div>

          <div className="p-3 bg-tactical-50 border border-tactical-800 rounded">
            <div className="text-sm text-tactical-400">MAE (average prediction error)</div>
            <div className="text-2xl font-mono font-bold text-tactical-100 mt-0.5">
              {metrics.mae.toFixed(2)}
            </div>
            <div className="text-xs text-tactical-500 mt-1">Average difference in demand units per day</div>
          </div>

          <div className="p-3 bg-tactical-50 border border-tactical-800 rounded">
            <div className="text-sm text-tactical-400">RMSE (larger misses count more)</div>
            <div className="text-2xl font-mono font-bold text-tactical-100 mt-0.5">
              {metrics.rmse.toFixed(2)}
            </div>
            <div className="text-xs text-tactical-500 mt-1">Average error, with larger misses weighted more</div>
          </div>

          <div className="p-3 bg-tactical-50 border border-tactical-800 rounded">
            <div className="text-sm text-tactical-400">Evaluation samples</div>
            <div className="text-2xl font-mono font-bold text-tactical-100 mt-0.5">
              {metrics.samples_evaluated.toLocaleString()}
            </div>
            <div className="text-xs text-tactical-500 mt-1">Samples used to evaluate this training run</div>
          </div>
        </div> : <p className="rounded border border-tactical-800 bg-tactical-950 p-3 text-xs text-tactical-400">
          No training evaluation is available in this session. Run model training to view metrics returned by the backend.
        </p>}
      </div>

      {/* Selector Filters */}
      <div className="bg-tactical-900 border border-tactical-800 p-4 rounded-lg flex flex-wrap gap-4 items-center">
        <div className="flex items-center space-x-2 text-xs font-mono text-tactical-300">
          <label htmlFor="forecast-location">Location:</label>
          <select
            id="forecast-location"
            value={activeLocId}
            onChange={(e) => {
              const locationId = e.target.value;
              setSelectedLocationId(locationId);
              void updateSelection(locationId, activeSupId);
            }}
            className="bg-tactical-950 border border-tactical-800 rounded px-3 py-1.5 text-xs font-mono text-tactical-100 focus:outline-none focus:border-accent-primary"
          >
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.code} - {loc.name} ({loc.location_type})
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center space-x-2 text-xs font-mono text-tactical-300">
          <label htmlFor="forecast-item">Supply item:</label>
          <select
            id="forecast-item"
            value={activeSupId}
            onChange={(e) => {
              const itemId = e.target.value;
              setSelectedSupplyId(itemId);
              void updateSelection(activeLocId, itemId);
            }}
            className="bg-tactical-950 border border-tactical-800 rounded px-3 py-1.5 text-xs font-mono text-tactical-100 focus:outline-none focus:border-accent-primary"
          >
            {supplies.map((sup) => (
              <option key={sup.id} value={sup.id}>
                [{sup.category.replace('CLASS_', 'CL-')}] {sup.name} ({sup.unit_of_measure})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Forecast chart */}
      <div className="bg-tactical-900 border border-tactical-800 rounded-lg p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-4 h-4 text-accent-primary" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-tactical-100 font-mono">
              Forecast demand range
            </h3>
          </div>
          <div className="flex items-center space-x-3 text-xs font-mono">
          <span className="flex items-center space-x-1 text-accent-primary" title="P50 is the median estimate: half of modeled outcomes fall below it and half above it.">
              <span className="w-2.5 h-0.5 bg-accent-primary" />
              <span>Middle estimate (P50)</span>
            </span>
          <span className="flex items-center space-x-1 text-tactical-400" title="P10 to P90 shows the lower-to-upper prediction range supplied by the model.">
              <span className="w-2.5 h-2.5 bg-accent-primary/20 border border-accent-primary/40 rounded-sm" />
              <span>Lower to upper range (P10–P90)</span>
            </span>
          </div>
        </div>

        {/* Quantile Chart Visualization */}
        <div className="min-h-64 w-full bg-white border border-tactical-800 rounded-lg p-4 relative overflow-hidden flex flex-col justify-end">
          {loadingForecasts ? (
            <p className="py-20 text-center text-sm text-tactical-400" role="status">{getForecastStateMessage(true, false, false, '', '')}</p>
          ) : hasLoadError ? (
            <p className="py-20 text-center text-sm text-accent-danger" role="alert">{getForecastStateMessage(false, true, false, '', '')}</p>
          ) : pairForecasts.length === 0 ? (
            <p className="py-20 text-center text-sm text-tactical-400">
              {getForecastStateMessage(false, false, false, activeLocation?.code ?? 'the selected location', activeSupply?.name ?? 'the selected item')}
            </p>
          ) : chartForecasts.length === 0 ? (
            <p className="py-20 text-center text-sm text-tactical-400">Forecast records exist for this selection, but no median prediction values are available to plot.</p>
          ) : (
            <>
          <svg className="w-full h-full" viewBox="0 0 700 200" preserveAspectRatio="none">
            {/* Horizontal Grid lines */}
            <line x1="0" y1="50" x2="700" y2="50" stroke="#d7e0e5" strokeDasharray="3 3" />
            <line x1="0" y1="100" x2="700" y2="100" stroke="#d7e0e5" strokeDasharray="3 3" />
            <line x1="0" y1="150" x2="700" y2="150" stroke="#d7e0e5" strokeDasharray="3 3" />

            {/* P10 - P90 Polygon Area */}
            {bandForecasts.length > 1 && (
              <polygon
                points={
                  bandForecasts
                    .map((f, i) => {
                      const x = (i / (bandForecasts.length - 1)) * 680 + 10;
                      const y = 190 - (f.predicted_demand_p90 / maxVal) * 170;
                      return `${x},${y}`;
                    })
                    .join(' ') +
                  ' ' +
                  bandForecasts
                    .slice()
                    .reverse()
                    .map((f, i) => {
                      const origIndex = bandForecasts.length - 1 - i;
                      const x = (origIndex / (bandForecasts.length - 1)) * 680 + 10;
                      const y = 190 - (f.predicted_demand_p10 / maxVal) * 170;
                      return `${x},${y}`;
                    })
                    .join(' ')
                }
                fill="rgba(40, 94, 168, 0.14)"
                stroke="rgba(40, 94, 168, 0.3)"
                strokeWidth="1"
              />
            )}

            {/* P50 Line */}
            {chartForecasts.length > 1 && (
              <polyline
                points={chartForecasts
                  .map((f, i) => {
                    const x = (i / (chartForecasts.length - 1)) * 680 + 10;
                    const y = 190 - (f.predicted_demand_p50 / maxVal) * 170;
                    return `${x},${y}`;
                  })
                  .join(' ')}
                fill="none"
                stroke="#285ea8"
                strokeWidth="2.5"
              />
            )}

            {/* Point circles */}
            {chartForecasts.map((f, i) => {
              const x = (i / Math.max(1, chartForecasts.length - 1)) * 680 + 10;
              const y = 190 - (f.predicted_demand_p50 / maxVal) * 170;
              return (
                <circle
                  key={f.id}
                  cx={x}
                  cy={y}
                  r="3.5"
                  fill="#285ea8"
                  stroke="#ffffff"
                  strokeWidth="1"
                />
              );
            })}
          </svg>

          {/* Horizon Day Labels */}
          <div className="flex justify-between text-xs font-mono text-tactical-500 pt-2 border-t border-tactical-800">
            {chartForecasts.map((f) => (
              <span key={f.id}>{getForecastHorizon(f) !== null ? `D+${getForecastHorizon(f)}` : f.forecast_date}</span>
            ))}
          </div>
            </>
          )}
        </div>

        {/* Forecast values table */}
        <div tabIndex={0} role="region" aria-label="Scroll forecast values table horizontally" className="table-scroll overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-tactical-950 text-tactical-400 border-b border-tactical-800">
              <tr>
                <th className="py-2.5 px-3">Horizon</th>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Lower estimate (P10)</th>
                <th className="py-2.5 px-3">Middle estimate (P50)</th>
                <th className="py-2.5 px-3">Upper estimate (P90)</th>
                <th className="py-2.5 px-3">Range width</th>
                <th className="py-2.5 px-3">Model explanation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-tactical-800 text-tactical-200">
              {!loadingForecasts && !hasLoadError && pairForecasts.map((f) => {
                const { p10: low, p50, p90: high } = getForecastQuantiles(f);
                const spread = low !== null && high !== null ? (high - low) / 2 : null;
                const factors = f.feature_contributions?.explainability ?? [];
                const horizon = getForecastHorizon(f);
                return (
                  <tr key={f.id} className="hover:bg-tactical-800/40 transition-colors">
                    <td className="py-2.5 px-3 font-semibold text-accent-primary">
                      {horizon !== null ? `Day +${horizon}` : 'Not available'}
                    </td>
                    <td className="py-2.5 px-3 text-tactical-400">{f.forecast_date}</td>
                    <td className="py-2.5 px-3 text-tactical-400">
                      {formatForecastValue(low, activeSupply?.unit_of_measure)}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-tactical-100">
                      {formatForecastValue(p50, activeSupply?.unit_of_measure)}
                    </td>
                    <td className="py-2.5 px-3 text-accent-warning">
                      {formatForecastValue(high, activeSupply?.unit_of_measure)}
                    </td>
                    <td className="py-2.5 px-3 text-tactical-400">
                      {spread === null ? 'Not available' : `+/-${spread.toFixed(1)} ${activeSupply?.unit_of_measure ?? ''}`}
                    </td>
                    <td className="py-2.5 px-3 text-xs text-tactical-400">
                      {factors.length > 0 ? (
                        <span className="text-tactical-300">{factors.join(' | ')}</span>
                      ) : (
                        <span>No explanation supplied by the model.</span>
                      )}
                    </td>
                  </tr>
                );
              })}

              {loadingForecasts && <tr><td colSpan={7} className="py-6 text-center text-tactical-500" role="status">Loading forecast records...</td></tr>}
              {!loadingForecasts && hasLoadError && <tr><td colSpan={7} className="py-6 text-center text-accent-danger" role="alert">{getForecastStateMessage(false, true, false, '', '')}</td></tr>}
              {!loadingForecasts && !hasLoadError && pairForecasts.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-tactical-500">
                    {getForecastStateMessage(false, false, false, activeLocation?.code ?? 'the selected location', activeSupply?.name ?? 'the selected item')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
