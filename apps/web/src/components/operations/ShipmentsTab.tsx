'use client';

import React, { useMemo, useState } from 'react';
import { ShipmentItemRecord, VehicleItem } from '@/types';
import { FileText, Search, Truck } from 'lucide-react';

function shipmentLabel(status: string): string {
  return status.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function shipmentDate(value: string | null | undefined): string {
  if (!value) return 'Not available';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Not available' : date.toLocaleString();
}

export const ShipmentsTab: React.FC<{ shipments: ShipmentItemRecord[]; vehicles: VehicleItem[] }> = ({ shipments, vehicles }) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const availableStatuses = useMemo(() => Array.from(new Set(shipments.map((shipment) => shipment.status))), [shipments]);
  const visibleShipments = useMemo(() => shipments.filter((record) => {
    const shipment = record;
    if (statusFilter !== 'ALL' && shipment.status !== statusFilter) return false;
    const query = search.trim().toLowerCase();
    return !query || [shipment.shipment_code, shipment.shipment_number, shipment.origin_location?.code, shipment.origin_location?.name, shipment.destination_location?.code, shipment.destination_location?.name]
      .some((value) => value?.toLowerCase().includes(query));
  }), [shipments, statusFilter, search]);

  return <div className="space-y-5">
    <section className="bg-white border border-tactical-800 rounded-xl p-5 shadow-sm space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><Truck className="w-5 h-5 text-accent-primary" aria-hidden="true" /><div><h3 className="text-base font-semibold text-tactical-100">Available vehicles</h3><p className="mt-1 text-sm text-tactical-400">Vehicle information returned by the synthetic demonstration network.</p></div></div><span className="text-sm text-tactical-500">{vehicles.length} records</span></div>
      {vehicles.length ? <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">{vehicles.map((vehicle) => <article key={vehicle.id} className="rounded-lg border border-tactical-800 p-4">
        <div className="flex items-start justify-between gap-3"><h4 className="font-semibold text-tactical-100">{vehicle.vehicle_code || vehicle.registration_number || 'Identifier not available'}</h4><span className="rounded-full bg-tactical-50 px-2.5 py-1 text-xs text-tactical-300">{shipmentLabel(vehicle.status || vehicle.operational_status || 'Status unavailable')}</span></div>
        <p className="mt-2 text-sm text-tactical-400">{vehicle.vehicle_type?.replaceAll('_', ' ').toLowerCase() || 'Vehicle type not available'}</p><p className="mt-1 text-xs text-tactical-500">Capacity: {Number.isFinite(vehicle.payload_capacity_kg) ? `${vehicle.payload_capacity_kg.toLocaleString()} kg` : 'Not available'}</p>
      </article>)}</div> : <p className="rounded-lg bg-tactical-50 p-4 text-sm text-tactical-400">Vehicle information is not available.</p>}
    </section>

    <section className="bg-white border border-tactical-800 rounded-xl shadow-sm overflow-hidden">
      <div className="p-5 border-b border-tactical-800 flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><FileText className="w-5 h-5 text-accent-primary" aria-hidden="true" /><div><h3 className="text-base font-semibold text-tactical-100">Deliveries and manifests</h3><p className="mt-1 text-sm text-tactical-400">Origin, destination, current status, and available shipment details.</p></div></div><span className="text-sm text-tactical-500">{visibleShipments.length} of {shipments.length}</span></div>
      <div className="p-4 flex flex-col sm:flex-row gap-3"><label className="relative flex-1"><span className="sr-only">Search deliveries</span><Search className="absolute left-3 top-3 w-4 h-4 text-tactical-500" aria-hidden="true" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by delivery or location" className="w-full rounded-lg border border-tactical-800 pl-9 pr-3 py-2.5 text-sm text-tactical-300 placeholder:text-tactical-500" /></label><select aria-label="Filter deliveries by status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-lg border border-tactical-800 bg-white px-3 py-2.5 text-sm text-tactical-300"><option value="ALL">All delivery statuses</option>{availableStatuses.map((status) => <option key={status} value={status}>{shipmentLabel(status)}</option>)}</select></div>
      <div tabIndex={0} role="region" aria-label="Scroll delivery table horizontally" className="table-scroll overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-tactical-50 text-tactical-400"><tr><th className="py-3 px-3 font-medium">Delivery</th><th className="py-3 px-3 font-medium">From</th><th className="py-3 px-3 font-medium">To</th><th className="py-3 px-3 font-medium">Status</th><th className="py-3 px-3 font-medium">Estimated arrival</th><th className="py-3 px-3"><span className="sr-only">Details</span></th></tr></thead>
        <tbody className="divide-y divide-tactical-800">{visibleShipments.map((record) => {
          const shipment = record;
          const id = shipment.id;
          const expanded = expandedId === id;
          const items = Array.isArray(shipment.items) ? shipment.items : [];
          const departure = shipment.departure_time ?? shipment.dispatch_time;
          const arrival = shipment.estimated_arrival_time ?? shipment.estimated_arrival;
          return <React.Fragment key={id}><tr className="hover:bg-tactical-50">
            <td className="py-3 px-3 font-medium text-tactical-100">{shipment.shipment_code || shipment.shipment_number || 'Identifier not available'}</td>
            <td className="py-3 px-3 text-tactical-300">{shipment.origin_location?.code || 'Not available'}{shipment.origin_location?.name ? <span className="block mt-1 text-xs text-tactical-500">{shipment.origin_location.name.replace(/^\[SYNTHETIC\]\s*/, '')}</span> : null}</td>
            <td className="py-3 px-3 text-tactical-300">{shipment.destination_location?.code || 'Not available'}{shipment.destination_location?.name ? <span className="block mt-1 text-xs text-tactical-500">{shipment.destination_location.name.replace(/^\[SYNTHETIC\]\s*/, '')}</span> : null}</td>
            <td className="py-3 px-3"><span className="inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-accent-primary">{shipmentLabel(shipment.status || 'Status unavailable')}</span></td>
            <td className="py-3 px-3 text-tactical-400">{shipmentDate(arrival)}</td>
            <td className="py-3 px-3"><button type="button" aria-expanded={expanded} onClick={() => setExpandedId(expanded ? null : id)} className="inline-flex min-h-10 min-w-10 items-center justify-center px-2 text-xs font-medium text-accent-primary hover:underline">{expanded ? 'Hide details' : 'Details'}</button></td>
          </tr>{expanded && <tr className="bg-tactical-50"><td colSpan={6} className="px-4 py-3"><dl className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div><dt className="text-tactical-500">Dispatch time</dt><dd className="mt-1 text-tactical-300">{shipmentDate(departure)}</dd></div><div><dt className="text-tactical-500">Vehicle</dt><dd className="mt-1 text-tactical-300">{shipment.vehicle?.vehicle_code || 'Not available'}</dd></div><div><dt className="text-tactical-500">Payload weight</dt><dd className="mt-1 text-tactical-300">{shipment.total_weight_kg == null ? 'Not available' : `${shipment.total_weight_kg.toLocaleString()} kg`}</dd></div>
            <div className="sm:col-span-3"><dt className="text-tactical-500">Manifest items</dt><dd className="mt-1 text-tactical-300">{items.length ? items.map((item, index) => `${item.item?.name || 'Item name unavailable'}: ${item.quantity == null ? 'quantity unavailable' : `${item.quantity.toLocaleString()} ${item.item?.unit || 'units'}`}`).join(' · ') : 'No item details were included in this shipment record.'}</dd></div>
          </dl></td></tr>}</React.Fragment>;
        })}
        {visibleShipments.length === 0 && <tr><td colSpan={6} className="py-8 px-4 text-center text-sm text-tactical-500">{shipments.length ? 'No deliveries match this search and status filter.' : 'No delivery or manifest records are available.'}</td></tr>}</tbody>
      </table></div>
    </section>
  </div>;
};
