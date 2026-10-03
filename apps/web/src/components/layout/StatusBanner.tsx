import React from 'react';
import { AlertTriangle, ShieldCheck } from 'lucide-react';

interface StatusBannerProps {
  label?: string;
  isSynthetic?: boolean;
}

export const StatusBanner: React.FC<StatusBannerProps> = ({
  label = 'DEMONSTRATION THEATER — SYNTHETIC LOGISTICS NETWORK',
  isSynthetic = true,
}) => {
  return (
    <div className="w-full bg-tactical-900 border-b border-tactical-800 text-xs px-4 py-1.5 flex items-center justify-between text-tactical-400">
      <div className="flex items-center space-x-2">
        <span className="inline-block w-2 h-2 rounded-full bg-accent-warning animate-pulse" />
        <span className="font-mono font-semibold tracking-wider text-tactical-200 uppercase">
          {label}
        </span>
      </div>
      <div className="flex items-center space-x-3 text-[11px]">
        {isSynthetic && (
          <span className="bg-tactical-800 border border-tactical-700 text-tactical-300 px-2 py-0.5 rounded font-mono">
            SYNTHETIC SIMULATION DATA ONLY
          </span>
        )}
        <span className="text-tactical-500">PS 26251 • SIH 2026</span>
      </div>
    </div>
  );
};
