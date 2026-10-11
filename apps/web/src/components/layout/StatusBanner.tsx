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
    <div className="w-full bg-[#edf1f2] border-b border-tactical-800 text-[11px] px-4 md:px-7 py-2 flex flex-wrap gap-y-1 items-center justify-between text-tactical-400">
      <div className="flex items-center space-x-2">
        <span className="inline-block w-2 h-2 rounded-full bg-accent-warning" />
        <span className="font-semibold tracking-wide text-tactical-200 uppercase">
          {label}
        </span>
      </div>
      <div className="flex items-center space-x-3 text-[11px]">
        {isSynthetic && (
          <span className="bg-white border border-tactical-800 text-tactical-300 px-2 py-1 rounded-full font-medium">
            SYNTHETIC SIMULATION DATA ONLY
          </span>
        )}
        <span className="text-tactical-500">PS 26251 • SIH 2026</span>
      </div>
    </div>
  );
};
