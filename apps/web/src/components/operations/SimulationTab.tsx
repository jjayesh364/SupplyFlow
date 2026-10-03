'use client';

import React, { useState } from 'react';
import { SimulationResult } from '@/types';
import {
  AlertOctagon,
  AlertTriangle,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Flame,
  Gauge,
  Mountain,
  Play,
  RotateCcw,
  Shield,
  Snowflake,
  TrendingDown,
  Zap,
} from 'lucide-react';

interface SimulationTabProps {
  onRunSimulation: (scenarioType: string) => void;
  simulationResult: SimulationResult | null;
  isRunning: boolean;
}

export const SimulationTab: React.FC<SimulationTabProps> = ({
  onRunSimulation,
  simulationResult,
  isRunning,
}) => {
  const [selectedScenario, setSelectedScenario] = useState<string>('SEVERE_WEATHER');

  const scenarios = [
    {
      id: 'NORMAL',
      label: 'Nominal Operations',
      desc: 'Clear weather conditions, baseline demand rates, all passes clear.',
      icon: Shield,
    },
    {
      id: 'SEVERE_WEATHER',
      label: 'Severe Blizzard / Mountain Storm',
      desc: 'Freezing conditions (< -15°C) and heavy snowfall triggering route friction spikes (μ ≥ 1.8).',
      icon: Snowflake,
    },
    {
      id: 'ROUTE_BLOCKAGE',
      label: 'Strategic Pass Landslide / Blockage',
      desc: 'Critical high-altitude corridor blocked (> 15 cm/h snow accumulation).',
      icon: Mountain,
    },
    {
      id: 'DEMAND_SURGE',
      label: 'Tactical Forward Demand Surge',
      desc: 'Forward posts experience +100% consumption burn across Class I, III & V supplies.',
      icon: Flame,
    },
    {
      id: 'REPLENISHMENT_DISPATCH',
      label: 'Emergency Forward Push',
      desc: 'Depots release safety-stock surge convoys to replenish forward posts.',
      icon: Zap,
    },
  ];

  const handleExecute = () => {
    onRunSimulation(selectedScenario);
  };

  const renderDelta = (val: number, unit: string = '', inverseGood: boolean = false) => {
    if (val === 0) return <span className="text-tactical-400 font-mono text-xs">0.0 (No change)</span>;
    const isPositive = val > 0;
    const isWorse = inverseGood ? !isPositive : isPositive;

    return (
      <div
        className={`flex items-center space-x-1 font-mono text-xs font-bold ${
          isWorse ? 'text-accent-danger' : 'text-accent-success'
        }`}
      >
        {isPositive ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />}
        <span>
          {isPositive ? `+${val}` : val}
          {unit}
        </span>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Scenario Selector Panel */}
      <div className="bg-tactical-900 border border-tactical-800 rounded-lg p-5 space-y-4">
        <div className="flex items-center space-x-2">
          <Zap className="w-4 h-4 text-accent-primary" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-tactical-100 font-mono">
            Interactive What-If Tactical Disruption Simulator
          </h3>
        </div>
        <p className="text-xs text-tactical-400">
          Simulate environmental crises, enemy interdictions, weather closures, or sudden surge demands
          to assess forward post vulnerability and test autonomous rerouting resilience.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3 pt-2">
          {scenarios.map((sc) => {
            const Icon = sc.icon;
            const isSelected = selectedScenario === sc.id;
            return (
              <div
                key={sc.id}
                onClick={() => setSelectedScenario(sc.id)}
                className={`p-3.5 rounded-lg border cursor-pointer transition-all flex flex-col justify-between space-y-2 select-none ${
                  isSelected
                    ? 'bg-accent-primary/10 border-accent-primary text-tactical-100 ring-1 ring-accent-primary'
                    : 'bg-tactical-950 border-tactical-800 text-tactical-400 hover:border-tactical-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <Icon className={`w-4 h-4 ${isSelected ? 'text-accent-primary' : 'text-tactical-500'}`} />
                  {isSelected && (
                    <span className="w-2 h-2 rounded-full bg-accent-primary animate-pulse" />
                  )}
                </div>
                <div>
                  <div className="font-mono text-xs font-bold text-tactical-100">{sc.label}</div>
                  <div className="text-[10px] text-tactical-400 mt-1 leading-snug">{sc.desc}</div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="pt-2 flex justify-end">
          <button
            onClick={handleExecute}
            disabled={isRunning}
            className="flex items-center space-x-2 px-5 py-2.5 rounded bg-accent-primary hover:bg-accent-primary/90 text-white font-mono text-xs font-medium transition-colors shadow"
          >
            <Play className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : ''}`} />
            <span>{isRunning ? 'Computing Multi-Node Disruption...' : 'Run What-If Simulation'}</span>
          </button>
        </div>
      </div>

      {/* Simulation Comparative Results */}
      {simulationResult && (
        <div className="space-y-6">
          {/* Operational Impact Banner */}
          <div className="bg-tactical-900 border border-tactical-800 rounded-lg p-5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-accent-warning flex items-center space-x-1.5">
                <AlertTriangle className="w-4 h-4 text-accent-warning" />
                <span>SCENARIO IMPACT ASSESSMENT: {simulationResult.scenario_requested}</span>
              </span>
              <span className="text-[11px] font-mono text-tactical-400">
                {simulationResult.theater_label}
              </span>
            </div>
            <p className="text-xs font-mono text-tactical-200 leading-relaxed bg-tactical-950 border border-tactical-800 p-3 rounded">
              {simulationResult.operational_impact_summary}
            </p>
          </div>

          {/* Before vs After Telemetry Matrix */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Critical Stockouts */}
            <div className="bg-tactical-900 border border-tactical-800 p-4 rounded-lg space-y-3">
              <div className="text-xs font-mono text-tactical-400">Critical Stockouts (DoS &lt; 2d)</div>
              <div className="flex items-baseline justify-between">
                <div>
                  <div className="text-xs text-tactical-500 font-mono">Baseline:</div>
                  <div className="text-lg font-mono text-tactical-300">
                    {simulationResult.baseline.critical_stockout_locations} nodes
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-tactical-600" />
                <div>
                  <div className="text-xs text-tactical-500 font-mono">Simulated:</div>
                  <div className="text-2xl font-mono font-bold text-accent-danger">
                    {simulationResult.simulation.critical_stockout_locations} nodes
                  </div>
                </div>
              </div>
              <div className="pt-2 border-t border-tactical-800 flex justify-between items-center">
                <span className="text-[11px] text-tactical-500 font-mono">Disruption Delta:</span>
                {renderDelta(simulationResult.delta.critical_stockouts_delta, ' nodes')}
              </div>
            </div>

            {/* Average Days of Supply */}
            <div className="bg-tactical-900 border border-tactical-800 p-4 rounded-lg space-y-3">
              <div className="text-xs font-mono text-tactical-400">Average Days of Supply (DoS)</div>
              <div className="flex items-baseline justify-between">
                <div>
                  <div className="text-xs text-tactical-500 font-mono">Baseline:</div>
                  <div className="text-lg font-mono text-tactical-300">
                    {simulationResult.baseline.average_days_of_supply.toFixed(1)} days
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-tactical-600" />
                <div>
                  <div className="text-xs text-tactical-500 font-mono">Simulated:</div>
                  <div className="text-2xl font-mono font-bold text-accent-primary">
                    {simulationResult.simulation.average_days_of_supply.toFixed(1)} days
                  </div>
                </div>
              </div>
              <div className="pt-2 border-t border-tactical-800 flex justify-between items-center">
                <span className="text-[11px] text-tactical-500 font-mono">Disruption Delta:</span>
                {renderDelta(simulationResult.delta.average_dos_delta, ' days', true)}
              </div>
            </div>

            {/* Blocked Corridors */}
            <div className="bg-tactical-900 border border-tactical-800 p-4 rounded-lg space-y-3">
              <div className="text-xs font-mono text-tactical-400">Blocked High-Altitude Passes</div>
              <div className="flex items-baseline justify-between">
                <div>
                  <div className="text-xs text-tactical-500 font-mono">Baseline:</div>
                  <div className="text-lg font-mono text-tactical-300">
                    {simulationResult.baseline.blocked_corridors_count} passes
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-tactical-600" />
                <div>
                  <div className="text-xs text-tactical-500 font-mono">Simulated:</div>
                  <div className="text-2xl font-mono font-bold text-accent-danger">
                    {simulationResult.simulation.blocked_corridors_count} passes
                  </div>
                </div>
              </div>
              <div className="pt-2 border-t border-tactical-800 flex justify-between items-center">
                <span className="text-[11px] text-tactical-500 font-mono">Pass Closure Delta:</span>
                {renderDelta(simulationResult.delta.blocked_corridors_delta, ' passes')}
              </div>
            </div>
          </div>

          {/* Secondary Row: Route Friction & Delayed Shipments */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-tactical-900 border border-tactical-800 p-4 rounded-lg flex items-center justify-between">
              <div>
                <div className="text-xs font-mono text-tactical-400">Average Route Weather Friction</div>
                <div className="text-xl font-mono font-bold text-accent-warning mt-1">
                  {simulationResult.simulation.average_route_friction.toFixed(2)}x
                </div>
                <div className="text-[11px] font-mono text-tactical-500">
                  Baseline: {simulationResult.baseline.average_route_friction.toFixed(2)}x
                </div>
              </div>
              <div>{renderDelta(simulationResult.delta.route_friction_delta, 'x')}</div>
            </div>

            <div className="bg-tactical-900 border border-tactical-800 p-4 rounded-lg flex items-center justify-between">
              <div>
                <div className="text-xs font-mono text-tactical-400">Delayed Convoy Dispatches</div>
                <div className="text-xl font-mono font-bold text-accent-danger mt-1">
                  {simulationResult.simulation.delayed_shipments_count} convoys
                </div>
                <div className="text-[11px] font-mono text-tactical-500">
                  Baseline: {simulationResult.baseline.delayed_shipments_count} convoys
                </div>
              </div>
              <div>{renderDelta(simulationResult.delta.delayed_shipments_delta, ' convoys')}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
