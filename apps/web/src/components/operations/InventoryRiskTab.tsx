'use client';

import React, { useMemo, useState } from 'react';
import { InventoryRiskItem } from '@/types';
import {
  AlertOctagon,
  AlertTriangle,
  ArrowUpDown,
  CheckCircle2,
  Filter,
  Search,
  Shield,
} from 'lucide-react';

interface InventoryRiskTabProps {
  risks: InventoryRiskItem[];
}

export const InventoryRiskTab: React.FC<InventoryRiskTabProps> = ({ risks }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [riskFilter, setRiskFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState<'urgency' | 'dos' | 'node'>('urgency');

  const filteredRisks = useMemo(() => {
    return risks
      .filter((r) => {
        if (typeFilter !== 'ALL' && r.location_type !== typeFilter) return false;
        if (riskFilter !== 'ALL' && r.risk_state !== riskFilter) return false;
        if (categoryFilter !== 'ALL' && r.category !== categoryFilter) return false;
        if (searchTerm) {
          const matchNode = r.location_code.toLowerCase().includes(searchTerm.toLowerCase());
          const matchItem = r.item_name.toLowerCase().includes(searchTerm.toLowerCase());
          return matchNode || matchItem;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'urgency') return b.urgency_score - a.urgency_score;
        if (sortBy === 'dos') return a.days_of_supply - b.days_of_supply;
        return a.location_code.localeCompare(b.location_code);
      });
  }, [risks, typeFilter, riskFilter, categoryFilter, searchTerm, sortBy]);

  const criticalCount = risks.filter((r) => r.risk_state === 'CRITICAL').length;
  const warningCount = risks.filter((r) => r.risk_state === 'WARNING').length;
  const healthyCount = risks.filter((r) => r.risk_state === 'HEALTHY').length;

  return (
    <div className="space-y-6">
      {/* Risk Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-tactical-900 border border-accent-danger/30 p-4 rounded-lg flex items-center justify-between">
          <div>
            <div className="text-xs font-mono text-tactical-400">Critical Stockouts (DoS &lt; 2d)</div>
            <div className="text-2xl font-mono font-bold text-accent-danger">{criticalCount}</div>
            <div className="text-[11px] text-tactical-400 mt-1">Requires emergency convoy push</div>
          </div>
          <AlertOctagon className="w-8 h-8 text-accent-danger opacity-80" />
        </div>

        <div className="bg-tactical-900 border border-accent-warning/30 p-4 rounded-lg flex items-center justify-between">
          <div>
            <div className="text-xs font-mono text-tactical-400">Warning Threshold (DoS &lt; 5d)</div>
            <div className="text-2xl font-mono font-bold text-accent-warning">{warningCount}</div>
            <div className="text-[11px] text-tactical-400 mt-1">Queue replenishment dispatch</div>
          </div>
          <AlertTriangle className="w-8 h-8 text-accent-warning opacity-80" />
        </div>

        <div className="bg-tactical-900 border border-accent-success/30 p-4 rounded-lg flex items-center justify-between">
          <div>
            <div className="text-xs font-mono text-tactical-400">Stable Buffers (DoS ≥ 5d)</div>
            <div className="text-2xl font-mono font-bold text-accent-success">{healthyCount}</div>
            <div className="text-[11px] text-tactical-400 mt-1">Nominal stock levels</div>
          </div>
          <CheckCircle2 className="w-8 h-8 text-accent-success opacity-80" />
        </div>
      </div>

      {/* Filter and Control Bar */}
      <div className="bg-tactical-900 border border-tactical-800 p-4 rounded-lg flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-tactical-500 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search node or item..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-tactical-950 border border-tactical-800 rounded px-8 py-1.5 text-xs font-mono text-tactical-200 placeholder-tactical-500 focus:outline-none focus:border-accent-primary"
            />
          </div>

          {/* Risk State Filter */}
          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
            className="bg-tactical-950 border border-tactical-800 rounded px-2.5 py-1.5 text-xs font-mono text-tactical-300 focus:outline-none focus:border-accent-primary"
          >
            <option value="ALL">All Risk States</option>
            <option value="CRITICAL">Critical Only</option>
            <option value="WARNING">Warning Only</option>
            <option value="HEALTHY">Healthy Only</option>
          </select>

          {/* Node Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-tactical-950 border border-tactical-800 rounded px-2.5 py-1.5 text-xs font-mono text-tactical-300 focus:outline-none focus:border-accent-primary"
          >
            <option value="ALL">All Node Types</option>
            <option value="FORWARD_POST">Forward Posts</option>
            <option value="FORWARD_SUPPLY_DEPOT">Forward Supply Depots</option>
            <option value="BASE_DEPOT">Base Depots</option>
          </select>

          {/* Supply Class Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-tactical-950 border border-tactical-800 rounded px-2.5 py-1.5 text-xs font-mono text-tactical-300 focus:outline-none focus:border-accent-primary"
          >
            <option value="ALL">All Supply Classes</option>
            <option value="CLASS_I_RATIONS">Class I: Rations</option>
            <option value="CLASS_III_POL">Class III: POL / Fuel</option>
            <option value="CLASS_V_AMMUNITION">Class V: Ammo</option>
            <option value="CLASS_VIII_MEDICAL">Class VIII: Medical</option>
          </select>
        </div>

        {/* Sort */}
        <div className="flex items-center space-x-2 text-xs font-mono text-tactical-400">
          <ArrowUpDown className="w-3.5 h-3.5 text-tactical-500" />
          <span>Sort:</span>
          <button
            onClick={() => setSortBy('urgency')}
            className={`px-2 py-1 rounded ${
              sortBy === 'urgency' ? 'bg-tactical-800 text-tactical-100' : 'hover:text-tactical-200'
            }`}
          >
            Urgency Score
          </button>
          <button
            onClick={() => setSortBy('dos')}
            className={`px-2 py-1 rounded ${
              sortBy === 'dos' ? 'bg-tactical-800 text-tactical-100' : 'hover:text-tactical-200'
            }`}
          >
            Days of Supply
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-tactical-900 border border-tactical-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-tactical-950 text-tactical-400 border-b border-tactical-800">
              <tr>
                <th className="py-3 px-3">Location Node</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3">Supply Item</th>
                <th className="py-3 px-3">Stock on Hand</th>
                <th className="py-3 px-3">Daily Burn</th>
                <th className="py-3 px-3">Days of Supply (DoS)</th>
                <th className="py-3 px-3">Projected Stockout</th>
                <th className="py-3 px-3">Urgency Score</th>
                <th className="py-3 px-3">Operational Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-tactical-800 text-tactical-200">
              {filteredRisks.map((risk, idx) => {
                const dosPercent = Math.min(100, (risk.days_of_supply / 10) * 100);
                return (
                  <tr key={idx} className="hover:bg-tactical-800/40 transition-colors">
                    <td className="py-3 px-3">
                      <div className="font-semibold text-tactical-100">{risk.location_code}</div>
                      <div className="text-[10px] text-tactical-400">
                        {risk.location_type} • {risk.elevation_m}m
                      </div>
                    </td>
                    <td className="py-3 px-3 text-tactical-400">
                      <span className="px-1.5 py-0.5 rounded bg-tactical-950 border border-tactical-800 text-[10px]">
                        {risk.category.replace('CLASS_', 'CL-')}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-medium text-tactical-100">{risk.item_name}</div>
                      <div className="text-[10px] text-tactical-500">{risk.item_code}</div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-tactical-100 font-medium">
                        {risk.current_quantity.toLocaleString()}
                      </span>
                      <div className="text-[10px] text-tactical-500">
                        Safe: {risk.safety_stock.toLocaleString()}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-tactical-300">
                      {risk.daily_demand_rate.toFixed(1)}/day
                    </td>
                    <td className="py-3 px-3 w-40">
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span
                          className={`font-bold ${
                            risk.risk_state === 'CRITICAL'
                              ? 'text-accent-danger'
                              : risk.risk_state === 'WARNING'
                              ? 'text-accent-warning'
                              : 'text-accent-success'
                          }`}
                        >
                          {risk.days_of_supply.toFixed(1)} days
                        </span>
                      </div>
                      <div className="w-full bg-tactical-950 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            risk.risk_state === 'CRITICAL'
                              ? 'bg-accent-danger'
                              : risk.risk_state === 'WARNING'
                              ? 'bg-accent-warning'
                              : 'bg-accent-success'
                          }`}
                          style={{ width: `${dosPercent}%` }}
                        />
                      </div>
                    </td>
                    <td className="py-3 px-3 text-tactical-300">
                      {risk.projected_stockout_date ? (
                        <span className="text-accent-danger font-semibold">
                          {risk.projected_stockout_date}
                        </span>
                      ) : (
                        <span className="text-tactical-500">Buffer Secure</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`font-bold ${
                          risk.urgency_score >= 80
                            ? 'text-accent-danger'
                            : risk.urgency_score >= 50
                            ? 'text-accent-warning'
                            : 'text-tactical-400'
                        }`}
                      >
                        {risk.urgency_score}/100
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          risk.risk_state === 'CRITICAL'
                            ? 'bg-accent-danger/20 text-accent-danger border border-accent-danger/30'
                            : risk.risk_state === 'WARNING'
                            ? 'bg-accent-warning/20 text-accent-warning border border-accent-warning/30'
                            : 'bg-accent-success/20 text-accent-success border border-accent-success/30'
                        }`}
                      >
                        {risk.risk_state}
                      </span>
                    </td>
                  </tr>
                );
              })}

              {filteredRisks.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-tactical-500">
                    No items match the active filter criteria.
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
