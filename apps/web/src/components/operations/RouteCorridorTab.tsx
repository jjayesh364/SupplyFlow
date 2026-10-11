'use client';

import React, { useState } from 'react';
import { LocationNode, RoutePlanResult } from '@/types';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Compass,
  Gauge,
  Mountain,
  Navigation,
  Snowflake,
  Wind,
  Zap,
} from 'lucide-react';

interface RouteCorridorTabProps {
  locations: LocationNode[];
  onCalculateRoute: (originId: string, destId: string) => void;
  routePlan: RoutePlanResult | null;
  isCalculating: boolean;
}

export const RouteCorridorTab: React.FC<RouteCorridorTabProps> = ({
  locations,
  onCalculateRoute,
  routePlan,
  isCalculating,
}) => {
  const [originId, setOriginId] = useState<string>(locations[0]?.id || '');
  const [destId, setDestId] = useState<string>(
    locations.find((l) => l.location_type === 'FORWARD_POST')?.id || locations[locations.length - 1]?.id || ''
  );

  const handleCompute = () => {
    if (originId && destId && originId !== destId) {
      onCalculateRoute(originId, destId);
    }
  };

  return (
    <div className="space-y-6">
      {/* Route Selector & Dispatch Calculation HUD */}
      <div className="rounded-xl border border-tactical-800 bg-white p-4 shadow-sm space-y-4 sm:p-5">
        <div className="flex items-center space-x-2">
          <Navigation className="w-4 h-4 text-accent-primary" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-tactical-100 font-mono">
            Compare a route
          </h3>
        </div>
        <p className="text-sm leading-6 text-tactical-400">
          Compare the selected locations using the route model and its available terrain and weather data. Results describe this synthetic demonstration network; review the details before making decisions.
        </p>

        <div className="grid grid-cols-1 gap-3 pt-1 sm:grid-cols-[1fr_auto_1fr_auto] sm:items-end">
          <div className="flex flex-col gap-1.5 text-sm text-tactical-300">
            <label htmlFor="route-origin">Starting location</label>
            <select aria-label="Starting location"
              id="route-origin"
              value={originId}
              onChange={(e) => setOriginId(e.target.value)}
              className="min-h-11 w-full rounded-lg border border-tactical-700 bg-white px-3 py-2 text-sm text-tactical-200"
            >
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.code} — {loc.name} ({loc.location_type.replaceAll('_', ' ').toLowerCase()})
                </option>
              ))}
            </select>
          </div>

          <ArrowRight className="w-4 h-4 text-tactical-500 hidden sm:block" />

          <div className="flex flex-col gap-1.5 text-sm text-tactical-300">
            <label htmlFor="route-destination">Destination</label>
            <select aria-label="Destination"
              id="route-destination"
              value={destId}
              onChange={(e) => setDestId(e.target.value)}
              className="min-h-11 w-full rounded-lg border border-tactical-700 bg-white px-3 py-2 text-sm text-tactical-200"
            >
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.code} — {loc.name} ({loc.elevation_m} m elevation)
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleCompute}
            disabled={isCalculating || originId === destId}
            className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-accent-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50 sm:min-w-36"
          >
            <Gauge className={`w-3.5 h-3.5 ${isCalculating ? 'animate-spin' : ''}`} />
            <span>{isCalculating ? 'Comparing route...' : 'Compare route'}</span>
          </button>
        </div>
      </div>

      {/* Route Performance Telemetry Cards */}
      {routePlan && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white border border-tactical-800 p-4 rounded-xl shadow-sm space-y-1">
                <div className="text-sm text-tactical-400">Route distance</div>
              <div className="text-2xl font-mono font-bold text-tactical-100">
                {routePlan.total_distance_km.toFixed(1)} km
              </div>
              <div className="text-xs leading-5 text-tactical-500">Total distance along the modelled route.</div>
            </div>

            <div className="bg-white border border-tactical-800 p-4 rounded-xl shadow-sm space-y-1">
                <div className="text-sm text-tactical-400">Estimated travel time</div>
              <div className="text-2xl font-mono font-bold text-accent-primary">
                {routePlan.total_travel_time_hours.toFixed(1)} hrs
              </div>
              <div className="text-xs leading-5 text-tactical-500">Estimated using the conditions available to the model.</div>
            </div>

            <div className="bg-white border border-tactical-800 p-4 rounded-xl shadow-sm space-y-1">
                <div className="text-sm text-tactical-400">Highest terrain adjustment</div>
              <div className="text-2xl font-mono font-bold text-accent-warning">
                {routePlan.max_friction_multiplier.toFixed(2)}x
              </div>
              <div className="text-xs leading-5 text-tactical-500">Multiplier applied for terrain and surface conditions.</div>
            </div>

            <div className="bg-white border border-tactical-800 p-4 rounded-xl shadow-sm space-y-1">
                <div className="text-sm text-tactical-400">Route model result</div>
              <div
                className={`text-2xl font-mono font-bold ${
                  routePlan.passable ? 'text-accent-success' : 'text-accent-danger'
                }`}
              >
                {routePlan.passable ? 'Model indicates passable' : 'Model indicates blocked'}
              </div>
              <div className="text-xs leading-5 text-tactical-500">
                This model result is for the synthetic network; it does not verify route safety or operational authorization.
              </div>
            </div>
          </div>

          {/* Corridor Waypoint Sequence Table */}
          <div className="overflow-hidden rounded-xl border border-tactical-800 bg-white p-4 shadow-sm space-y-4 sm:p-5">
            <div className="flex items-center space-x-2">
              <Mountain className="w-4 h-4 text-accent-primary" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-tactical-100 font-mono">
                Route segment details
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="bg-tactical-950 text-tactical-400 border-b border-tactical-800">
                  <tr>
                    <th className="py-2.5 px-3">Leg</th>
                    <th className="py-2.5 px-3">Corridor</th>
                    <th className="py-2.5 px-3">Distance</th>
                    <th className="py-2.5 px-3">Elevation Gain</th>
                    <th className="py-2.5 px-3">Slope</th>
                    <th className="py-2.5 px-3">Road Surface</th>
                    <th className="py-2.5 px-3">Weather adjustment</th>
                    <th className="py-2.5 px-3">Transit Time</th>
                    <th className="py-2.5 px-3">Pass Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-tactical-800 text-tactical-200">
                  {routePlan.path_corridors.map((leg, idx) => (
                    <tr key={idx} className="hover:bg-tactical-800/40 transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-accent-primary">Leg #{idx + 1}</td>
                      <td className="py-2.5 px-3">
                        <span className="font-semibold text-tactical-100">{leg.origin_code}</span>
                        <span className="text-tactical-500 mx-1.5">→</span>
                        <span className="font-semibold text-tactical-100">{leg.destination_code}</span>
                      </td>
                      <td className="py-2.5 px-3">{leg.distance_km.toFixed(1)} km</td>
                      <td className="py-2.5 px-3">
                        {leg.elevation_gain_m > 0 ? (
                          <span className="text-accent-warning">+{leg.elevation_gain_m}m</span>
                        ) : (
                          <span className="text-tactical-400">{leg.elevation_gain_m}m</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">{leg.slope_deg.toFixed(1)}°</td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-1 rounded bg-tactical-50 border border-tactical-800 text-xs">
                          {leg.surface}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`font-semibold ${
                            leg.weather_friction >= 1.3 ? 'text-accent-warning' : 'text-accent-success'
                          }`}
                        >
                          {leg.weather_friction.toFixed(2)}x
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-tactical-100">
                        {leg.travel_time_hours.toFixed(1)} hrs
                      </td>
                      <td className="py-2.5 px-3">
                        {leg.is_blocked ? (
                          <span className="px-2.5 py-1 rounded text-xs font-semibold bg-red-50 text-accent-danger border border-red-200">
                            BLOCKED
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded text-xs font-semibold bg-green-50 text-accent-success border border-green-200">
                            CLEAR
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
