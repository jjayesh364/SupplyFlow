'use client';

import React from 'react';
import { InventoryRiskItem, LocationNode, RecommendationItem, ShipmentItemRecord, VehicleItem } from '@/types';
import { AlertTriangle, ArrowUpRight, Clock, MapPin, Play, RotateCcw, Shield, Truck, Zap } from 'lucide-react';
import { getRecommendationDetailRows, getRecommendationTitle } from '@/components/operations/operationDisplay';

interface OverviewTabProps {
  locations: LocationNode[];
  risks: InventoryRiskItem[];
  vehicles: VehicleItem[];
  shipments: ShipmentItemRecord[];
  recommendations: RecommendationItem[];
  recommendationsLoading: boolean;
  recommendationsLoadError: boolean;
  isDataLoading: boolean;
  onTriggerOptimization: () => void;
  onRetrainForecast: () => void;
  onNavigateTab: (tab: string) => void;
  isOptimizing: boolean;
  isForecasting: boolean;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  locations, risks, vehicles, shipments, recommendations, recommendationsLoading,
  recommendationsLoadError, onTriggerOptimization, onRetrainForecast, onNavigateTab,
  isOptimizing, isForecasting, isDataLoading,
}) => {
  const criticalRisks = risks.filter((risk) => risk.risk_state === 'CRITICAL');
  const warningRisks = risks.filter((risk) => risk.risk_state === 'WARNING');
  const attentionRisks = [...criticalRisks, ...warningRisks];
  const delayedShipments = shipments.filter((shipment) => shipment.status === 'DELAYED');
  const activeShipments = shipments.filter((shipment) => shipment.status === 'IN_TRANSIT' || shipment.status === 'DISPATCHED');
  const availableVehicles = vehicles.filter((vehicle) => (vehicle.operational_status || vehicle.status) === 'AVAILABLE').length;
  const statusName = (status: string) => status === 'CRITICAL' ? 'Urgent' : status === 'WARNING' ? 'Running low' : status;

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-blue-100 bg-gradient-to-r from-white via-white to-blue-50 p-5 shadow-sm sm:p-6" aria-labelledby="briefing-title">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-accent-primary">Current network snapshot</p>
            <h3 id="briefing-title" className="mt-1 text-xl font-semibold tracking-tight text-tactical-100">Supply briefing</h3>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-tactical-400">Start with urgent or low-stock items and any delayed deliveries. Counts below come from the latest data returned by SupplyFlow.</p>
          </div>
          <span className="rounded-full border border-blue-100 bg-white px-3 py-1.5 text-xs font-medium text-accent-primary">Synthetic demonstration data</span>
        </div>
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <button type="button" onClick={() => onNavigateTab('inventory')} className="group flex min-h-[106px] items-center justify-between rounded-xl border border-red-100 bg-white p-4 text-left hover:border-red-200 hover:bg-red-50/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary">
            <span><span className="block text-sm font-medium text-tactical-400">Urgent supplies</span><span className="mt-1 block text-3xl font-semibold tabular-nums text-accent-danger">{isDataLoading ? 'Loading' : criticalRisks.length}</span><span className="mt-1 block text-xs text-tactical-500">Review first. Under 2 days of supply</span></span><AlertTriangle className="h-5 w-5 text-accent-danger" aria-hidden="true" />
          </button>
          <button type="button" onClick={() => onNavigateTab('inventory')} className="group flex min-h-[106px] items-center justify-between rounded-xl border border-amber-100 bg-white p-4 text-left hover:border-amber-200 hover:bg-amber-50/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary">
            <span><span className="block text-sm font-medium text-tactical-400">Running low</span><span className="mt-1 block text-3xl font-semibold tabular-nums text-accent-warning">{isDataLoading ? 'Loading' : warningRisks.length}</span><span className="mt-1 block text-xs text-tactical-500">Review soon. Under 5 days of supply</span></span><Shield className="h-5 w-5 text-accent-warning" aria-hidden="true" />
          </button>
          <button type="button" onClick={() => onNavigateTab('shipments')} className="group flex min-h-[106px] items-center justify-between rounded-xl border border-orange-100 bg-white p-4 text-left hover:border-orange-200 hover:bg-orange-50/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary">
            <span><span className="block text-sm font-medium text-tactical-400">Delayed deliveries</span><span className="mt-1 block text-3xl font-semibold tabular-nums text-orange-800">{isDataLoading ? 'Loading' : delayedShipments.length}</span><span className="mt-1 block text-xs text-tactical-500">Check the current delivery status</span></span><Truck className="h-5 w-5 text-orange-800" aria-hidden="true" />
          </button>
        </div>
        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 border-t border-blue-100 pt-3 text-xs text-tactical-500" aria-label="Additional network counts">
          <span><MapPin className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" />{isDataLoading ? 'Loading' : locations.length} locations</span>
          <span><Truck className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" />{isDataLoading ? 'Loading' : availableVehicles} of {isDataLoading ? 'Loading' : vehicles.length} vehicles available</span>
          <span><Clock className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" />{isDataLoading ? 'Loading' : activeShipments.length} deliveries in progress</span>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div className="space-y-5 xl:col-span-2">
          <section className="overflow-hidden rounded-xl border border-tactical-800 bg-white shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-tactical-800 p-5">
              <div><h3 className="text-base font-semibold text-tactical-100">Items to review</h3><p className="mt-1 text-sm text-tactical-400">Urgent and low-stock records from the current assessment.</p></div>
              <button type="button" onClick={() => onNavigateTab('inventory')} className="inline-flex min-h-10 items-center gap-1 rounded-lg px-3 text-sm font-medium text-accent-primary hover:bg-blue-50">All supplies <ArrowUpRight className="h-4 w-4" aria-hidden="true" /></button>
            </div>
            {isDataLoading ? <p role="status" className="p-5 text-sm text-tactical-400">Loading supply status...</p> : attentionRisks.length ? <div tabIndex={0} role="region" aria-label="Scroll supply attention table horizontally" className="table-scroll overflow-x-auto">
              <table className="w-full min-w-[620px] text-left text-sm"><thead className="bg-tactical-50 text-tactical-400"><tr><th className="px-4 py-3 font-medium">Location</th><th className="px-4 py-3 font-medium">Supply item</th><th className="px-4 py-3 font-medium">Days left</th><th className="px-4 py-3 font-medium">Status</th></tr></thead><tbody className="divide-y divide-tactical-800">{attentionRisks.slice(0, 6).map((risk) => <tr key={`${risk.location_id}-${risk.item_id}`} className="hover:bg-tactical-50"><td className="px-4 py-3 font-medium text-tactical-100">{risk.location_code || 'Not available'}</td><td className="px-4 py-3 text-tactical-300">{risk.item_name || 'Not available'}{risk.recommendation && <span className="mt-1 block max-w-xl text-xs leading-5 text-tactical-500">{risk.recommendation}</span>}</td><td className="px-4 py-3 tabular-nums">{risk.days_of_supply == null ? 'Not available' : `${risk.days_of_supply} days`}</td><td className="px-4 py-3"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${risk.risk_state === 'CRITICAL' ? 'bg-red-50 text-accent-danger' : 'bg-amber-50 text-amber-800'}`}>{statusName(risk.risk_state)}</span></td></tr>)}</tbody></table>
              {attentionRisks.length > 6 && <p className="px-4 py-3 text-xs text-tactical-500">Showing 6 of {attentionRisks.length} records. Open Supplies to see all records.</p>}
            </div> : <p className="p-5 text-sm text-tactical-400">No urgent or low-stock records were returned in the current demonstration data.</p>}
          </section>

          <section className="rounded-xl border border-tactical-800 bg-white p-5 shadow-sm" aria-labelledby="delayed-title">
            <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 id="delayed-title" className="text-base font-semibold text-tactical-100">Deliveries requiring review</h3><p className="mt-1 text-sm text-tactical-400">Deliveries marked delayed in the current SupplyFlow records.</p></div><button type="button" onClick={() => onNavigateTab('shipments')} className="min-h-10 rounded-lg px-3 text-sm font-medium text-accent-primary hover:bg-blue-50">View deliveries</button></div>
            {isDataLoading ? <p role="status" className="mt-3 text-sm text-tactical-400">Loading delivery records...</p> : delayedShipments.length ? <ul className="mt-3 divide-y divide-tactical-800">{delayedShipments.slice(0, 4).map((shipment) => <li key={shipment.id} className="flex flex-wrap items-center justify-between gap-2 py-3"><span className="font-medium text-tactical-200">{shipment.shipment_code || shipment.shipment_number || 'Delivery identifier unavailable'}</span><span className="text-sm text-tactical-500">{shipment.origin_location?.code || 'Origin unavailable'} to {shipment.destination_location?.code || 'Destination unavailable'}</span><span className="rounded-full bg-orange-50 px-2.5 py-1 text-xs font-medium text-orange-800">Delayed</span></li>)}</ul> : <p className="mt-3 rounded-lg bg-tactical-50 p-3 text-sm text-tactical-400">No delayed deliveries were returned.</p>}
          </section>
        </div>

        <section className="h-fit space-y-4 rounded-xl border border-tactical-800 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2"><Zap className="h-4 w-4 text-accent-primary" aria-hidden="true" /><h3 className="text-base font-semibold text-tactical-100">Useful next steps</h3></div>
          <p className="text-sm leading-6 text-tactical-400">Use the planning tools to prepare proposals or refresh the demand model. Review results before taking any action.</p>
          <div className="space-y-2">
            <button type="button" onClick={onTriggerOptimization} disabled={isOptimizing} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-accent-primary px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"><Play className="h-4 w-4" aria-hidden="true" />{isOptimizing ? 'Preparing proposals...' : 'Prepare delivery proposals'}</button>
            <button type="button" onClick={onRetrainForecast} disabled={isForecasting} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-tactical-700 bg-white px-4 py-3 text-sm font-medium text-tactical-300 hover:bg-tactical-50 disabled:opacity-60"><RotateCcw className="h-4 w-4" aria-hidden="true" />{isForecasting ? 'Updating forecasts...' : 'Update demand forecasts'}</button>
          </div>
          <div className="border-t border-tactical-800 pt-4"><div className="flex items-center justify-between gap-2"><h4 className="text-sm font-semibold text-tactical-100">Latest proposal</h4><button type="button" onClick={() => onNavigateTab('recommendations')} className="min-h-9 rounded px-2 text-xs font-medium text-accent-primary hover:bg-blue-50">Review {recommendations.length}</button></div>
            {recommendationsLoading ? <p role="status" className="mt-3 text-sm text-tactical-400">Loading proposals...</p> : recommendationsLoadError ? <p role="alert" className="mt-3 text-sm text-tactical-400">Proposals could not be loaded. Refresh and try again.</p> : recommendations.length ? <div className="mt-3 rounded-lg bg-tactical-50 p-3"><p className="text-sm font-semibold text-tactical-300">{getRecommendationTitle(recommendations[0].recommendation_type)}</p><p className="mt-1 text-xs leading-5 text-tactical-500">{recommendations[0].status === 'PROPOSED' ? 'Requires human review' : recommendations[0].status || 'Status unavailable'}</p><p className="mt-2 text-xs leading-5 text-tactical-400">{getRecommendationDetailRows(recommendations[0].details).map(({ label, value }) => `${label}: ${value}`).join(' | ') || 'No additional details were provided.'}</p></div> : <p className="mt-3 text-sm text-tactical-400">No proposals were returned.</p>}
          </div>
        </section>
      </section>
    </div>
  );
};
