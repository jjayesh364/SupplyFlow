'use client';

import React from 'react';
import {
  AlertItem,
  InventoryRiskItem,
  LocationNode,
  OptimizationRunResult,
  RecommendationItem,
  ShipmentItemRecord,
  VehicleItem,
} from '@/types';
import {
  Activity,
  AlertOctagon,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Layers,
  MapPin,
  Play,
  RotateCcw,
  Shield,
  Truck,
  Zap,
} from 'lucide-react';

interface OverviewTabProps {
  locations: LocationNode[];
  risks: InventoryRiskItem[];
  alerts: AlertItem[];
  vehicles: VehicleItem[];
  shipments: ShipmentItemRecord[];
  recommendations: RecommendationItem[];
  onTriggerOptimization: () => void;
  onRetrainForecast: () => void;
  onNavigateTab: (tab: string) => void;
  isOptimizing: boolean;
  isForecasting: boolean;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  locations,
  risks,
  alerts,
  vehicles,
  shipments,
  recommendations,
  onTriggerOptimization,
  onRetrainForecast,
  onNavigateTab,
  isOptimizing,
  isForecasting,
}) => {
  const criticalRisks = risks.filter((r) => r.risk_state === 'CRITICAL');
  const warningRisks = risks.filter((r) => r.risk_state === 'WARNING');
  const criticalAlerts = alerts.filter((a) => a.severity === 'CRITICAL');

  const baseDepots = locations.filter((l) => l.location_type === 'BASE_DEPOT').length;
  const fsds = locations.filter((l) => l.location_type === 'FORWARD_SUPPLY_DEPOT').length;
  const forwardPosts = locations.filter((l) => l.location_type === 'FORWARD_POST').length;

  const activeVehicles = vehicles.filter(
    (v) => (v.operational_status || v.status) === 'AVAILABLE'
  ).length;
  const activeShipments = shipments.filter(
    (s) => s.status === 'IN_TRANSIT' || s.status === 'DISPATCHED'
  ).length;

  // Network Readiness Index calculation: 100 - (critical * 8 + warning * 2)
  const readinessIndex = Math.max(
    55,
    Math.min(98, Math.round(100 - (criticalRisks.length * 7 + warningRisks.length * 1.5)))
  );

  return (
    <div className="space-y-6">
      {/* Top Tactical KPI Bar */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-tactical-900 border border-tactical-800 p-3.5 rounded-lg space-y-1">
          <div className="flex items-center justify-between text-tactical-400 text-xs">
            <span>Readiness Index</span>
            <Activity className="w-3.5 h-3.5 text-accent-primary" />
          </div>
          <div className="text-2xl font-mono font-bold text-accent-primary">
            {readinessIndex}%
          </div>
          <div className="text-[11px] font-mono text-accent-success flex items-center space-x-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>THEATER OPERATIONAL</span>
          </div>
        </div>

        <div className="bg-tactical-900 border border-tactical-800 p-3.5 rounded-lg space-y-1">
          <div className="flex items-center justify-between text-tactical-400 text-xs">
            <span>Critical Stockouts</span>
            <AlertOctagon className="w-3.5 h-3.5 text-accent-danger" />
          </div>
          <div className="text-2xl font-mono font-bold text-accent-danger">
            {criticalRisks.length}
          </div>
          <div className="text-[11px] font-mono text-tactical-400">
            DoS &lt; 2.0 Days Deficit
          </div>
        </div>

        <div className="bg-tactical-900 border border-tactical-800 p-3.5 rounded-lg space-y-1">
          <div className="flex items-center justify-between text-tactical-400 text-xs">
            <span>Stock Warnings</span>
            <Shield className="w-3.5 h-3.5 text-accent-warning" />
          </div>
          <div className="text-2xl font-mono font-bold text-accent-warning">
            {warningRisks.length}
          </div>
          <div className="text-[11px] font-mono text-tactical-400">
            DoS &lt; 5.0 Days Buffer
          </div>
        </div>

        <div className="bg-tactical-900 border border-tactical-800 p-3.5 rounded-lg space-y-1">
          <div className="flex items-center justify-between text-tactical-400 text-xs">
            <span>Logistics Nodes</span>
            <MapPin className="w-3.5 h-3.5 text-tactical-300" />
          </div>
          <div className="text-2xl font-mono font-bold text-tactical-100">
            {locations.length}
          </div>
          <div className="text-[11px] font-mono text-tactical-400">
            {baseDepots} BD • {fsds} FSD • {forwardPosts} FP
          </div>
        </div>

        <div className="bg-tactical-900 border border-tactical-800 p-3.5 rounded-lg space-y-1">
          <div className="flex items-center justify-between text-tactical-400 text-xs">
            <span>Available Fleet</span>
            <Truck className="w-3.5 h-3.5 text-tactical-300" />
          </div>
          <div className="text-2xl font-mono font-bold text-tactical-100">
            {activeVehicles}/{vehicles.length || 18}
          </div>
          <div className="text-[11px] font-mono text-accent-success">
            All-Terrain Convoys Ready
          </div>
        </div>

        <div className="bg-tactical-900 border border-tactical-800 p-3.5 rounded-lg space-y-1">
          <div className="flex items-center justify-between text-tactical-400 text-xs">
            <span>Active Convoys</span>
            <Clock className="w-3.5 h-3.5 text-tactical-300" />
          </div>
          <div className="text-2xl font-mono font-bold text-tactical-100">
            {activeShipments}
          </div>
          <div className="text-[11px] font-mono text-tactical-400">
            0600–1700 Window
          </div>
        </div>
      </div>

      {/* Operational Actions & Recommendations Banner */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Quick Operational Commands */}
        <div className="bg-tactical-900 border border-tactical-800 rounded-lg p-5 space-y-4">
          <div className="flex items-center space-x-2">
            <Zap className="w-4 h-4 text-accent-primary" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-tactical-200 font-mono">
              Autonomous Operations Dispatch
            </h3>
          </div>
          <p className="text-xs text-tactical-400">
            Execute Google OR-Tools multi-depot vehicle routing to generate optimal replenishment
            convoys based on current stockout urgency and terrain resistance.
          </p>
          <div className="space-y-2.5 pt-2">
            <button
              onClick={onTriggerOptimization}
              disabled={isOptimizing}
              className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 rounded bg-accent-primary hover:bg-accent-primary/90 text-white font-mono text-xs font-medium transition-colors shadow"
            >
              <Play className={`w-3.5 h-3.5 ${isOptimizing ? 'animate-spin' : ''}`} />
              <span>{isOptimizing ? 'Solving CVRPTW Model...' : 'Solve Optimal Convoy Dispatch'}</span>
            </button>

            <button
              onClick={onRetrainForecast}
              disabled={isForecasting}
              className="w-full flex items-center justify-center space-x-2 px-4 py-2 rounded bg-tactical-800 hover:bg-tactical-700 border border-tactical-700 text-tactical-200 font-mono text-xs font-medium transition-colors"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isForecasting ? 'animate-spin' : ''}`} />
              <span>{isForecasting ? 'Training Quantile Trees...' : 'Retrain Quantile Forecasts'}</span>
            </button>
          </div>
        </div>

        {/* Decision-Support Recommendations Preview */}
        <div className="lg:col-span-2 bg-tactical-900 border border-tactical-800 rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Shield className="w-4 h-4 text-accent-warning" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-tactical-200 font-mono">
                Priority Decision Recommendations
              </h3>
            </div>
            <button
              onClick={() => onNavigateTab('recommendations')}
              className="text-xs font-mono text-accent-primary hover:underline flex items-center space-x-1"
            >
              <span>View All ({recommendations.length})</span>
              <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-2.5">
            {recommendations.slice(0, 3).map((rec, idx) => (
              <div
                key={rec.id || idx}
                className="p-3 bg-tactical-950 border border-tactical-800 rounded flex items-start justify-between space-x-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-semibold ${
                        rec.priority === 'CRITICAL'
                          ? 'bg-accent-danger/20 text-accent-danger border border-accent-danger/30'
                          : 'bg-accent-warning/20 text-accent-warning border border-accent-warning/30'
                      }`}
                    >
                      {rec.priority}
                    </span>
                    <span className="font-mono text-tactical-300 font-medium">
                      {rec.recommendation_type.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-tactical-400">{rec.action_summary}</p>
                </div>
              </div>
            ))}

            {recommendations.length === 0 && (
              <div className="p-4 text-center text-xs font-mono text-tactical-500 bg-tactical-950 rounded">
                No active critical recommendations. All inventory above DoS warning thresholds.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Critical Stockout Alerts Table Preview */}
      <div className="bg-tactical-900 border border-tactical-800 rounded-lg p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertOctagon className="w-4 h-4 text-accent-danger" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-tactical-200 font-mono">
              Immediate High-Urgency Deficit Items
            </h3>
          </div>
          <button
            onClick={() => onNavigateTab('inventory')}
            className="text-xs font-mono text-accent-primary hover:underline flex items-center space-x-1"
          >
            <span>Open Inventory Matrix</span>
            <ArrowUpRight className="w-3 h-3" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-tactical-950 text-tactical-400 border-b border-tactical-800">
              <tr>
                <th className="py-2.5 px-3">Node</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Supply Item</th>
                <th className="py-2.5 px-3">Stock on Hand</th>
                <th className="py-2.5 px-3">Days of Supply</th>
                <th className="py-2.5 px-3">Urgency Score</th>
                <th className="py-2.5 px-3">Action Required</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-tactical-800 text-tactical-200">
              {criticalRisks.slice(0, 5).map((risk, i) => (
                <tr key={i} className="hover:bg-tactical-800/40 transition-colors">
                  <td className="py-2.5 px-3 font-semibold text-tactical-100">
                    {risk.location_code || '—'}
                  </td>
                  <td className="py-2.5 px-3 text-tactical-400">{risk.location_type || 'NODE'}</td>
                  <td className="py-2.5 px-3">
                    <span className="text-tactical-200">{risk.item_name || '—'}</span>
                    <span className="text-[10px] text-tactical-500 ml-1.5">
                      ({(risk.category || '').replace('CLASS_', 'CL-') || '—'})
                    </span>
                  </td>
                  <td className="py-2.5 px-3">
                    {risk.current_quantity != null ? risk.current_quantity.toLocaleString() : '—'} units
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="px-2 py-0.5 rounded bg-accent-danger/20 text-accent-danger font-bold">
                      {risk.days_of_supply != null ? `${risk.days_of_supply}d` : '—'}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-bold text-accent-danger">
                    {risk.urgency_score != null ? `${Math.round(risk.urgency_score)}/100` : '—'}
                  </td>
                  <td className="py-2.5 px-3 text-tactical-300 text-[11px]">
                    {risk.recommendation || risk.explainability?.[0] || 'Replenishment dispatch recommended'}
                  </td>
                </tr>
              ))}
              {criticalRisks.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-4 text-center text-tactical-500">
                    No critical stockout risks detected across demonstration forward posts.
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
