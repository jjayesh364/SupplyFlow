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
      <div className="bg-tactical-900 border border-tactical-800 rounded-lg p-5 space-y-4">
        <div className="flex items-center space-x-2">
          <Navigation className="w-4 h-4 text-accent-primary" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-tactical-100 font-mono">
            High-Altitude Corridor Terrain &amp; Dynamic Impedance Router
          </h3>
        </div>
        <p className="text-xs text-tactical-400">
          Computes dynamic Dijkstra shortest-path incorporating elevation gradients, road surface resistance,
          live Open-Meteo snowfall/wind friction, and mountain pass blockage criteria.
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <div className="flex items-center space-x-2 text-xs font-mono text-tactical-300">
            <span>Origin Depot:</span>
            <select
              value={originId}
              onChange={(e) => setOriginId(e.target.value)}
              className="bg-tactical-950 border border-tactical-800 rounded px-3 py-1.5 text-xs font-mono text-tactical-100 focus:outline-none focus:border-accent-primary"
            >
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.code} — {loc.name} ({loc.location_type})
                </option>
              ))}
            </select>
          </div>

          <ArrowRight className="w-4 h-4 text-tactical-500 hidden sm:block" />

          <div className="flex items-center space-x-2 text-xs font-mono text-tactical-300">
            <span>Forward Destination:</span>
            <select
              value={destId}
              onChange={(e) => setDestId(e.target.value)}
              className="bg-tactical-950 border border-tactical-800 rounded px-3 py-1.5 text-xs font-mono text-tactical-100 focus:outline-none focus:border-accent-primary"
            >
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.code} — {loc.name} ({loc.elevation_m}m)
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleCompute}
            disabled={isCalculating || originId === destId}
            className="flex items-center space-x-2 px-4 py-1.5 rounded bg-accent-primary hover:bg-accent-primary/90 text-white font-mono text-xs font-medium transition-colors shadow disabled:opacity-50"
          >
            <Gauge className={`w-3.5 h-3.5 ${isCalculating ? 'animate-spin' : ''}`} />
            <span>{isCalculating ? 'Computing Optimal Path...' : 'Analyze Route Corridor'}</span>
          </button>
        </div>
      </div>

      {/* Route Performance Telemetry Cards */}
      {routePlan && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-tactical-900 border border-tactical-800 p-4 rounded-lg space-y-1">
              <div className="text-[11px] font-mono text-tactical-400">Total Route Distance</div>
              <div className="text-2xl font-mono font-bold text-tactical-100">
                {routePlan.total_distance_km.toFixed(1)} km
              </div>
              <div className="text-[10px] text-tactical-500">PostGIS Great-Circle Metric</div>
            </div>

            <div className="bg-tactical-900 border border-tactical-800 p-4 rounded-lg space-y-1">
              <div className="text-[11px] font-mono text-tactical-400">Dynamic Transit Time</div>
              <div className="text-2xl font-mono font-bold text-accent-primary">
                {routePlan.total_travel_time_hours.toFixed(1)} hrs
              </div>
              <div className="text-[10px] text-tactical-500">Terrain + Weather Adjusted</div>
            </div>

            <div className="bg-tactical-900 border border-tactical-800 p-4 rounded-lg space-y-1">
              <div className="text-[11px] font-mono text-tactical-400">Max Friction Multiplier</div>
              <div className="text-2xl font-mono font-bold text-accent-warning">
                {routePlan.max_friction_multiplier.toFixed(2)}x
              </div>
              <div className="text-[10px] text-tactical-500">Icing / Grade / Surface</div>
            </div>

            <div className="bg-tactical-900 border border-tactical-800 p-4 rounded-lg space-y-1">
              <div className="text-[11px] font-mono text-tactical-400">Passability Status</div>
              <div
                className={`text-2xl font-mono font-bold ${
                  routePlan.passable ? 'text-accent-success' : 'text-accent-danger'
                }`}
              >
                {routePlan.passable ? 'OPEN' : 'BLOCKED'}
              </div>
              <div className="text-[10px] text-tactical-500">
                {routePlan.passable ? 'Passable by 4x4 convoys' : 'Snowpass closure > 15 cm/h'}
              </div>
            </div>
          </div>

          {/* Corridor Waypoint Sequence Table */}
          <div className="bg-tactical-900 border border-tactical-800 rounded-lg p-5 space-y-4">
            <div className="flex items-center space-x-2">
              <Mountain className="w-4 h-4 text-accent-primary" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-tactical-100 font-mono">
                Corridor Waypoint Legs &amp; Grade Friction Analysis
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-tactical-950 text-tactical-400 border-b border-tactical-800">
                  <tr>
                    <th className="py-2.5 px-3">Leg</th>
                    <th className="py-2.5 px-3">Corridor</th>
                    <th className="py-2.5 px-3">Distance</th>
                    <th className="py-2.5 px-3">Elevation Gain</th>
                    <th className="py-2.5 px-3">Slope Gradient</th>
                    <th className="py-2.5 px-3">Road Surface</th>
                    <th className="py-2.5 px-3">Weather Friction</th>
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
                        <span className="px-1.5 py-0.5 rounded bg-tactical-950 border border-tactical-800 text-[10px]">
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
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-accent-danger/20 text-accent-danger border border-accent-danger/30">
                            BLOCKED
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-accent-success/20 text-accent-success border border-accent-success/30">
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
