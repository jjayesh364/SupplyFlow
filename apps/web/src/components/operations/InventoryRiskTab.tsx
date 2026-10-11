'use client';

import React, { useMemo, useState } from 'react';
import { InventoryRiskItem } from '@/types';
import { AlertOctagon, AlertTriangle, ArrowUpDown, CheckCircle2, Search } from 'lucide-react';

interface InventoryRiskTabProps { risks: InventoryRiskItem[] }

function formatNumber(value: number | null | undefined, digits = 1, fallback = 'Not available'): string {
  if (value == null || !Number.isFinite(value)) return fallback;
  return value.toLocaleString(undefined, { maximumFractionDigits: digits });
}

function readableRiskStatus(state: string): string {
  if (state === 'CRITICAL') return 'Urgent';
  if (state === 'WARNING') return 'Running low';
  if (['HEALTHY', 'ADEQUATE', 'EXCESS'].includes(state)) return 'Available';
  return 'Status unavailable';
}

export const InventoryRiskTab: React.FC<InventoryRiskTabProps> = ({ risks }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [riskFilter, setRiskFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState<'urgency' | 'dos' | 'node'>('urgency');
  const [selectedRecord, setSelectedRecord] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const pageSize = 12;

  const availableCategories = useMemo(() => Array.from(new Set(risks.flatMap((risk) => risk.category ? [risk.category] : []))).sort(), [risks]);
  const filteredRisks = useMemo(() => risks.filter((risk) => {
    if (typeFilter !== 'ALL' && risk.location_type !== typeFilter) return false;
    if (riskFilter === 'CRITICAL' && risk.risk_state !== 'CRITICAL') return false;
    if (riskFilter === 'WARNING' && risk.risk_state !== 'WARNING') return false;
    if (riskFilter === 'HEALTHY' && !['HEALTHY', 'ADEQUATE', 'EXCESS'].includes(risk.risk_state)) return false;
    if (categoryFilter !== 'ALL' && risk.category !== categoryFilter) return false;
    const query = searchTerm.trim().toLowerCase();
    return !query || `${risk.location_code || ''} ${risk.item_name || ''}`.toLowerCase().includes(query);
  }).sort((a, b) => {
    if (sortBy === 'urgency') return (b.urgency_score ?? Number.NEGATIVE_INFINITY) - (a.urgency_score ?? Number.NEGATIVE_INFINITY);
    if (sortBy === 'dos') return (a.days_of_supply ?? Number.POSITIVE_INFINITY) - (b.days_of_supply ?? Number.POSITIVE_INFINITY);
    return (a.location_code || '').localeCompare(b.location_code || '');
  }), [risks, typeFilter, riskFilter, categoryFilter, searchTerm, sortBy]);
  const pageCount = Math.ceil(filteredRisks.length / pageSize);
  const currentPage = Math.min(page, Math.max(0, pageCount - 1));
  const pageRisks = filteredRisks.slice(currentPage * pageSize, (currentPage + 1) * pageSize);

  const criticalCount = risks.filter((risk) => risk.risk_state === 'CRITICAL').length;
  const warningCount = risks.filter((risk) => risk.risk_state === 'WARNING').length;
  const healthyCount = risks.filter((risk) => ['HEALTHY', 'ADEQUATE', 'EXCESS'].includes(risk.risk_state)).length;

  return <div className="space-y-5">
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <article className="bg-white border border-tactical-800 p-4 rounded-xl shadow-sm flex items-center justify-between"><div><h3 className="text-sm font-medium text-tactical-400">Urgent</h3><p className="mt-1 text-2xl font-semibold text-accent-danger">{criticalCount}</p><p className="mt-1 text-xs text-tactical-500">Under 2 days of supply</p></div><AlertOctagon className="w-6 h-6 text-accent-danger" aria-hidden="true" /></article>
      <article className="bg-white border border-tactical-800 p-4 rounded-xl shadow-sm flex items-center justify-between"><div><h3 className="text-sm font-medium text-tactical-400">Running low</h3><p className="mt-1 text-2xl font-semibold text-accent-warning">{warningCount}</p><p className="mt-1 text-xs text-tactical-500">Under 5 days of supply</p></div><AlertTriangle className="w-6 h-6 text-accent-warning" aria-hidden="true" /></article>
      <article className="bg-white border border-tactical-800 p-4 rounded-xl shadow-sm flex items-center justify-between"><div><h3 className="text-sm font-medium text-tactical-400">Available</h3><p className="mt-1 text-2xl font-semibold text-accent-success">{healthyCount}</p><p className="mt-1 text-xs text-tactical-500">Marked stable by the current assessment</p></div><CheckCircle2 className="w-6 h-6 text-accent-success" aria-hidden="true" /></article>
    </div>
    <p className="text-sm text-tactical-500">Days of supply estimates how long current stock may last at the recorded daily demand rate. Status labels use the existing risk assessment and thresholds.</p>

    <section className="bg-white border border-tactical-800 rounded-xl p-4 shadow-sm space-y-4" aria-label="Inventory filters">
      <div className="flex flex-col xl:flex-row gap-3 xl:items-center">
        <label className="relative flex-1 min-w-[220px]"><span className="sr-only">Search locations or supply items</span><Search className="w-4 h-4 text-tactical-500 absolute left-3 top-3" aria-hidden="true" /><input value={searchTerm} onChange={(event) => { setSearchTerm(event.target.value); setPage(0); }} placeholder="Search a location or supply item" className="min-h-11 w-full bg-white border border-tactical-700 rounded-lg pl-9 pr-3 py-2.5 text-sm text-tactical-300 placeholder:text-tactical-500" /></label>
        <select aria-label="Filter by supply status" value={riskFilter} onChange={(event) => { setRiskFilter(event.target.value); setPage(0); }} className="min-h-11 rounded-lg border border-tactical-700 bg-white px-3 py-2.5 text-sm text-tactical-300"><option value="ALL">All supply statuses</option><option value="CRITICAL">Urgent</option><option value="WARNING">Running low</option><option value="HEALTHY">Available</option></select>
        <select aria-label="Filter by location type" value={typeFilter} onChange={(event) => { setTypeFilter(event.target.value); setPage(0); }} className="min-h-11 rounded-lg border border-tactical-700 bg-white px-3 py-2.5 text-sm text-tactical-300"><option value="ALL">All location types</option><option value="FORWARD_POST">Forward locations</option><option value="FORWARD_SUPPLY_DEPOT">Supply depots</option><option value="BASE_DEPOT">Base depots</option></select>
        <select aria-label="Filter by supply category" value={categoryFilter} onChange={(event) => { setCategoryFilter(event.target.value); setPage(0); }} className="min-h-11 rounded-lg border border-tactical-700 bg-white px-3 py-2.5 text-sm text-tactical-300"><option value="ALL">All categories</option>{availableCategories.map((category) => <option key={category} value={category}>{category}</option>)}</select>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-sm text-tactical-400"><ArrowUpDown className="w-4 h-4" aria-hidden="true" /><span>Order by:</span>
        {([['urgency', 'Priority'], ['dos', 'Fewest days left'], ['node', 'Location']] as const).map(([value, label]) => <button key={value} type="button" onClick={() => setSortBy(value)} aria-pressed={sortBy === value} className={`min-h-10 rounded-full px-3 py-1.5 ${sortBy === value ? 'bg-blue-50 text-accent-primary font-semibold' : 'bg-tactical-50 hover:bg-tactical-100'}`}>{label}</button>)}
        <span className="ml-auto text-sm tabular-nums">{filteredRisks.length ? `${currentPage * pageSize + 1}–${Math.min((currentPage + 1) * pageSize, filteredRisks.length)} of ${filteredRisks.length}` : '0'} records · {risks.length} total</span>
      </div>
    </section>

    <section className="bg-white border border-tactical-800 rounded-xl shadow-sm overflow-hidden" aria-label="Supply availability">
      <div tabIndex={0} role="region" aria-label="Scroll supply availability table horizontally" className="table-scroll overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm">
        <thead className="bg-tactical-50 text-tactical-400"><tr><th className="py-3 px-3 font-medium">Location</th><th className="py-3 px-3 font-medium">Supply item</th><th className="py-3 px-3 font-medium">Stock available</th><th className="py-3 px-3 font-medium">Days left</th><th className="py-3 px-3 font-medium">Status</th><th className="py-3 px-3"><span className="sr-only">Details</span></th></tr></thead>
        <tbody className="divide-y divide-tactical-800">{pageRisks.map((risk) => {
          const recordKey = `${risk.location_id}-${risk.item_id}`;
          const detailsOpen = selectedRecord === recordKey;
          const isCritical = risk.risk_state === 'CRITICAL';
          const isWarning = risk.risk_state === 'WARNING';
          const demand = risk.demand_rate ?? risk.daily_demand_rate ?? risk.daily_demand_p50;
          return <React.Fragment key={recordKey}>
            <tr className="hover:bg-tactical-50">
              <td className="py-3 px-3"><div className="font-medium text-tactical-100">{risk.location_code || 'Not available'}</div><div className="mt-1 text-xs text-tactical-500">{risk.location_type?.replaceAll('_', ' ').toLowerCase() || 'Location type unavailable'}</div></td>
              <td className="py-3 px-3"><div className="font-medium text-tactical-100">{risk.item_name || 'Not available'}</div><div className="mt-1 text-xs text-tactical-500">{risk.category || 'Category unavailable'}</div></td>
              <td className="py-3 px-3 tabular-nums text-tactical-300">{formatNumber(risk.current_quantity, 1)}</td>
              <td className="py-3 px-3 tabular-nums font-medium text-tactical-300">{risk.days_of_supply == null || !Number.isFinite(risk.days_of_supply) ? 'Not available' : `${formatNumber(risk.days_of_supply)} days`}</td>
              <td className="py-3 px-3"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${isCritical ? 'bg-red-50 text-accent-danger' : isWarning ? 'bg-amber-50 text-amber-800' : ['HEALTHY', 'ADEQUATE', 'EXCESS'].includes(risk.risk_state) ? 'bg-green-50 text-accent-success' : 'bg-tactical-50 text-tactical-400'}`}>{readableRiskStatus(risk.risk_state)}</span></td>
              <td className="py-3 px-3"><button type="button" aria-expanded={detailsOpen} onClick={() => setSelectedRecord(detailsOpen ? null : recordKey)} className="inline-flex min-h-10 min-w-10 items-center justify-center px-2 text-xs font-medium text-accent-primary hover:underline">{detailsOpen ? 'Hide details' : 'Details'}</button></td>
            </tr>
            {detailsOpen && <tr className="bg-tactical-50"><td colSpan={6} className="px-4 py-3"><dl className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div><dt className="text-tactical-500">Daily demand</dt><dd className="mt-1 text-tactical-300">{demand != null && Number.isFinite(demand) ? `${formatNumber(demand)} per day` : 'Not available'}</dd></div>
              <div><dt className="text-tactical-500">Safety stock</dt><dd className="mt-1 text-tactical-300">{formatNumber(risk.safety_stock)}</dd></div>
              <div><dt className="text-tactical-500">Projected stockout</dt><dd className="mt-1 text-tactical-300">{risk.projected_stockout_date || 'Not available'}</dd></div>
              <div className="sm:col-span-3"><dt className="text-tactical-500">Assessment explanation</dt><dd className="mt-1 text-tactical-300">{risk.recommendation || risk.explainability?.join(' ') || 'No explanation was supplied.'}</dd></div>
            </dl></td></tr>}
          </React.Fragment>;
        })}
        {filteredRisks.length === 0 && <tr><td colSpan={6} className="py-8 px-4 text-center text-sm text-tactical-500">{risks.length === 0 ? 'No supply assessment records are currently available.' : 'No supplies match these filters. Try changing the search or status selection.'}</td></tr>}
        </tbody>
      </table></div>
      {pageCount > 1 && <div className="flex items-center justify-between border-t border-tactical-800 px-4 py-3 text-sm"><span className="text-tactical-500">Page {currentPage + 1} of {pageCount}</span><div className="flex gap-2"><button type="button" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)} className="min-h-10 rounded-lg border border-tactical-800 px-3 text-tactical-300 hover:bg-tactical-50 disabled:opacity-50">Previous</button><button type="button" disabled={currentPage >= pageCount - 1} onClick={() => setPage(currentPage + 1)} className="min-h-10 rounded-lg border border-tactical-800 px-3 text-tactical-300 hover:bg-tactical-50 disabled:opacity-50">Next</button></div></div>}
    </section>
  </div>;
};
