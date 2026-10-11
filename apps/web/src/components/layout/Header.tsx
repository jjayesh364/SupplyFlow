import React from 'react';
import { Layers } from 'lucide-react';

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
          <span>System available</span>
          </span>
        );
      case 'degraded':
        return (
          <span className="flex items-center space-x-1.5 text-xs text-accent-warning bg-accent-warning/10 border border-accent-warning/20 px-2 py-0.5 rounded font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-warning" />
          <span>Service issue</span>
          </span>
        );
      default:
        return (
          <span className="flex items-center space-x-1.5 text-xs text-tactical-400 bg-tactical-800 border border-tactical-700 px-2 py-0.5 rounded font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-tactical-500" />
            <span>Not connected</span>
          </span>
        );
    }
  };

  return (
    <header className="sticky top-0 z-30 w-full bg-white/95 backdrop-blur border-b border-tactical-800 px-4 md:px-7 py-3 flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <div className="bg-blue-50 border border-blue-100 p-2.5 rounded-xl">
          <Layers className="w-5 h-5 text-accent-primary" aria-hidden="true" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="font-bold text-lg tracking-tight text-tactical-100">SupplyFlow</h1>
            <span className="text-[10px] font-semibold text-accent-primary bg-blue-50 px-2 py-0.5 rounded-full">SIH 2026</span>
          </div>
          <p className="text-xs text-tactical-400">
            Predictive Logistics &amp; Forward Supply Chain
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span className="hidden sm:inline-flex items-center gap-2 text-xs text-tactical-400"><span className="w-2 h-2 rounded-full bg-accent-warning" />Demonstration environment</span>
        {getStatusBadge()}
      </div>
    </header>
  );
};
