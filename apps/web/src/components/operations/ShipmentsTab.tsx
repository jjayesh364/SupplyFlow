'use client';

import React from 'react';
import { ShipmentItemRecord, VehicleItem } from '@/types';
import {
  Clock,
  Compass,
  FileText,
  MapPin,
  Shield,
  Truck,
} from 'lucide-react';

interface ShipmentsTabProps {
  shipments: ShipmentItemRecord[];
  vehicles: VehicleItem[];
}

export const ShipmentsTab: React.FC<ShipmentsTabProps> = ({ shipments, vehicles }) => {
  return (
    <div className="space-y-6">
      {/* Fleet Readiness Summary */}
      <div className="bg-tactical-900 border border-tactical-800 rounded-lg p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Truck className="w-4 h-4 text-accent-primary" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-tactical-100 font-mono">
              Simulation Fleet Telemetry &amp; Convoy Assets
            </h3>
          </div>
          <div className="text-xs font-mono text-tactical-400">
            Daylight Transit Window: <span className="text-tactical-200">0600 – 1700 hrs (Configurable)</span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {vehicles.slice(0, 4).map((veh, i) => (
            <div key={i} className="p-3 bg-tactical-950 border border-tactical-800 rounded space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-tactical-100">
                  {veh.vehicle_code || veh.registration_number || 'VEH'}
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-accent-success/20 text-accent-success">
                  {veh.status || veh.operational_status || 'AVAILABLE'}
                </span>
              </div>
              <div className="text-[11px] font-mono text-tactical-400">{veh.vehicle_type}</div>
              <div className="text-[10px] font-mono text-tactical-500">
                Payload Cap: {veh.payload_capacity_kg.toLocaleString()} kg
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Convoy Manifests Table */}
      <div className="bg-tactical-900 border border-tactical-800 rounded-lg p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileText className="w-4 h-4 text-accent-primary" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-tactical-100 font-mono">
              Active &amp; Planned Convoy Shipments
            </h3>
          </div>
          <span className="text-xs font-mono text-tactical-400">
            Total Manifests: {shipments.length}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-tactical-950 text-tactical-400 border-b border-tactical-800">
              <tr>
                <th className="py-2.5 px-3">Shipment Ref</th>
                <th className="py-2.5 px-3">Priority</th>
                <th className="py-2.5 px-3">Origin Depot</th>
                <th className="py-2.5 px-3">Forward Post</th>
                <th className="py-2.5 px-3">Cargo Payload</th>
                <th className="py-2.5 px-3">Dispatch Window</th>
                <th className="py-2.5 px-3">Estimated Arrival</th>
                <th className="py-2.5 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-tactical-800 text-tactical-200">
              {shipments.map((s, idx) => (
                <tr key={idx} className="hover:bg-tactical-800/40 transition-colors">
                  <td className="py-2.5 px-3 font-semibold text-accent-primary">
                    {s.shipment_number}
                  </td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        s.priority === 'CRITICAL'
                          ? 'bg-accent-danger/20 text-accent-danger'
                          : 'bg-tactical-800 text-tactical-300'
                      }`}
                    >
                      {s.priority}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-tactical-100">
                    {s.origin_location?.code || 'BASE-01'}
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-tactical-100">
                    {s.destination_location?.code || 'FWD-03'}
                  </td>
                  <td className="py-2.5 px-3">
                    {s.total_weight_kg ? s.total_weight_kg.toLocaleString() : '3,200'} kg
                  </td>
                  <td className="py-2.5 px-3 text-tactical-400">
                    {s.dispatch_time ? new Date(s.dispatch_time).toLocaleDateString() : '0600 hrs'}
                  </td>
                  <td className="py-2.5 px-3 text-tactical-400">
                    {s.estimated_arrival ? new Date(s.estimated_arrival).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '1530 hrs'}
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-accent-primary/20 text-accent-primary border border-accent-primary/30">
                      {s.status}
                    </span>
                  </td>
                </tr>
              ))}

              {shipments.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-tactical-500">
                    No active convoy shipments dispatched. Run the OR-Tools solver from Overview to generate dispatch schedules.
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
