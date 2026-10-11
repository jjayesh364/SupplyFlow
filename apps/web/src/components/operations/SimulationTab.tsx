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
      label: 'Usual conditions',
      desc: 'Explore a baseline with clear weather and the model’s current demand assumptions.',
      icon: Shield,
    },
    {
      id: 'SEVERE_WEATHER',
      label: 'Severe weather',
      desc: 'Explore how freezing conditions and heavy snowfall could affect routes.',
      icon: Snowflake,
    },
    {
      id: 'ROUTE_BLOCKAGE',
      label: 'Route blockage',
      desc: 'Explore how a blocked high-altitude corridor could affect the network.',
      icon: Mountain,
    },
    {
      id: 'DEMAND_SURGE',
      label: 'Higher supply demand',
      desc: 'Explore increased consumption at forward locations across selected supply classes.',
      icon: Flame,
    },
    {
      id: 'REPLENISHMENT_DISPATCH',
      label: 'Replenishment proposal',
      desc: 'Explore a depot replenishment scenario for forward locations.',
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
            Explore a What-If scenario
          </h3>
        </div>
        <p className="text-xs text-tactical-400">
          A simulation explores a hypothetical situation using demonstration data. Its results are not a forecast or an approved operational plan.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3 pt-2">
          {scenarios.map((sc) => {
            const Icon = sc.icon;
            const isSelected = selectedScenario === sc.id;
            return (
              <button
                type="button"
                key={sc.id}
                onClick={() => setSelectedScenario(sc.id)}
                aria-pressed={isSelected}
                aria-label={`${sc.label}. ${sc.desc}`}
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
                  <div className="text-xs text-tactical-400 mt-1 leading-snug">{sc.desc}</div>
                </div>
              </button>
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
            <span>{isRunning ? 'Running simulation…' : 'Run What-If simulation'}</span>
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
                <span>Hypothetical result: {simulationResult.scenario_requested.replaceAll('_', ' ').toLowerCase()}</span>
              </span>
              <span className="text-xs font-mono text-tactical-400">
                {simulationResult.scenario.name}
              </span>
            </div>
            <p className="text-xs font-mono text-tactical-200 leading-relaxed bg-tactical-950 border border-tactical-800 p-3 rounded">
              {simulationResult.scenario.description}
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
                    {simulationResult.scenario.critical_stockout_locations} nodes
                  </div>
                </div>
              </div>
              <div className="pt-2 border-t border-tactical-800 flex justify-between items-center">
                <span className="text-xs text-tactical-500 font-mono">Disruption Delta:</span>
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
                    {simulationResult.scenario.average_days_of_supply.toFixed(1)} days
                  </div>
                </div>
              </div>
              <div className="pt-2 border-t border-tactical-800 flex justify-between items-center">
                <span className="text-xs text-tactical-500 font-mono">Disruption Delta:</span>
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
                    {simulationResult.scenario.blocked_corridors_count} passes
                  </div>
                </div>
              </div>
              <div className="pt-2 border-t border-tactical-800 flex justify-between items-center">
                <span className="text-xs text-tactical-500 font-mono">Pass Closure Delta:</span>
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
                  {simulationResult.scenario.average_route_friction.toFixed(2)}x
                </div>
                <div className="text-xs font-mono text-tactical-500">
                  Baseline: {simulationResult.baseline.average_route_friction.toFixed(2)}x
                </div>
              </div>
              <div>{renderDelta(simulationResult.delta.route_friction_delta, 'x')}</div>
            </div>

            <div className="bg-tactical-900 border border-tactical-800 p-4 rounded-lg flex items-center justify-between">
              <div>
                <div className="text-xs font-mono text-tactical-400">Delayed Convoy Dispatches</div>
                <div className="text-xl font-mono font-bold text-accent-danger mt-1">
                  {simulationResult.scenario.delayed_shipments_count} convoys
                </div>
                <div className="text-xs font-mono text-tactical-500">
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
