import React from 'react';
import { Layers, Shield, Cpu, Database, Activity } from 'lucide-react';

interface HeaderProps {
  systemStatus?: 'healthy' | 'degraded' | 'offline';
}

export const Header: React.FC<HeaderProps> = ({ systemStatus = 'offline' }) => {
  const getStatusBadge = () => {
    switch (systemStatus) {
      case 'healthy':
        return (
          <span className="flex items-center space-x-1.5 text-xs text-accent-success bg-accent-success/10 border border-accent-success/20 px-2 py-0.5 rounded font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-success" />
            <span>CORE ONLINE</span>
          </span>
        );
      case 'degraded':
        return (
          <span className="flex items-center space-x-1.5 text-xs text-accent-warning bg-accent-warning/10 border border-accent-warning/20 px-2 py-0.5 rounded font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-warning" />
            <span>DB DEGRADED</span>
          </span>
        );
      default:
        return (
          <span className="flex items-center space-x-1.5 text-xs text-tactical-400 bg-tactical-800 border border-tactical-700 px-2 py-0.5 rounded font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-tactical-500" />
            <span>DISCONNECTED</span>
          </span>
        );
    }
  };

  return (
    <header className="w-full bg-tactical-950 border-b border-tactical-800 px-6 py-3 flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <div className="bg-tactical-800 border border-tactical-700 p-2 rounded">
          <Layers className="w-5 h-5 text-accent-primary" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="font-bold text-base tracking-wide text-tactical-100">SupplyFlow</h1>
            <span className="text-[11px] font-mono text-tactical-400 bg-tactical-800/80 px-1.5 py-0.5 rounded">v0.1.0</span>
          </div>
          <p className="text-xs text-tactical-400">
            Predictive Logistics & Forward Supply Chain Decision-Support System
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        {getStatusBadge()}
      </div>
    </header>
  );
};
