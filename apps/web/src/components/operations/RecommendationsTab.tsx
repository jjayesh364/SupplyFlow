'use client';

import React from 'react';
import { RecommendationItem } from '@/types';
import {
  AlertOctagon,
  ArrowRight,
  CheckCircle2,
  FileCheck,
  ShieldAlert,
  Truck,
  Zap,
} from 'lucide-react';

interface RecommendationsTabProps {
  recommendations: RecommendationItem[];
  onTriggerOptimization: () => void;
  isOptimizing: boolean;
}

export const RecommendationsTab: React.FC<RecommendationsTabProps> = ({
  recommendations,
  onTriggerOptimization,
  isOptimizing,
}) => {
  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-tactical-900 border border-tactical-800 rounded-lg p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <ShieldAlert className="w-4 h-4 text-accent-warning" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-tactical-100 font-mono">
              Optimization &amp; Decision-Support Recommendations
            </h3>
          </div>
          <p className="text-xs text-tactical-400">
            Synthesized by the OR-Tools optimization engine and deterministic risk threshold rules.
          </p>
        </div>

        <button
          onClick={onTriggerOptimization}
          disabled={isOptimizing}
          className="flex items-center space-x-2 px-3.5 py-2 rounded bg-accent-primary hover:bg-accent-primary/90 text-white font-mono text-xs font-medium transition-colors shadow"
        >
          <Zap className={`w-3.5 h-3.5 ${isOptimizing ? 'animate-spin' : ''}`} />
          <span>{isOptimizing ? 'Re-optimizing Fleet...' : 'Re-Run Optimization Engine'}</span>
        </button>
      </div>

      {/* Recommendations Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {recommendations.map((rec, i) => (
          <div
            key={rec.id || i}
            className="bg-tactical-900 border border-tactical-800 rounded-lg p-5 space-y-3 flex flex-col justify-between"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                    rec.priority === 'CRITICAL'
                      ? 'bg-accent-danger/20 text-accent-danger border border-accent-danger/30'
                      : 'bg-accent-warning/20 text-accent-warning border border-accent-warning/30'
                  }`}
                >
                  PRIORITY: {rec.priority}
                </span>
                <span className="text-[11px] font-mono text-tactical-400">
                  {rec.recommendation_type.replace('_', ' ')}
                </span>
              </div>

              <h4 className="text-sm font-semibold text-tactical-100 font-mono">
                {rec.action_summary}
              </h4>

              {rec.payload && (
                <div className="bg-tactical-950 border border-tactical-800 p-2.5 rounded text-[11px] font-mono text-tactical-300 space-y-1">
                  {rec.payload.node_code && (
                    <div className="flex justify-between">
                      <span className="text-tactical-500">Target Node:</span>
                      <span className="font-semibold text-accent-primary">
                        {rec.payload.node_code}
                      </span>
                    </div>
                  )}
                  {rec.payload.deficit_units && (
                    <div className="flex justify-between">
                      <span className="text-tactical-500">Deficit:</span>
                      <span className="text-accent-danger font-semibold">
                        {rec.payload.deficit_units.toLocaleString()} units
                      </span>
                    </div>
                  )}
                  {rec.payload.recommended_vehicle && (
                    <div className="flex justify-between">
                      <span className="text-tactical-500">Asset Recommendation:</span>
                      <span className="text-tactical-200">{rec.payload.recommended_vehicle}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="pt-2 flex items-center justify-end">
              <span className="text-[11px] font-mono text-accent-success flex items-center space-x-1">
                <FileCheck className="w-3.5 h-3.5" />
                <span>Action Approved by Decision Model</span>
              </span>
            </div>
          </div>
        ))}

        {recommendations.length === 0 && (
          <div className="col-span-2 p-10 bg-tactical-900 border border-tactical-800 rounded-lg text-center space-y-2">
            <CheckCircle2 className="w-8 h-8 text-accent-success mx-auto opacity-70" />
            <h4 className="font-mono text-sm text-tactical-200">All Forward Posts Fully Supplied</h4>
            <p className="text-xs text-tactical-400 max-w-md mx-auto">
              No immediate emergency dispatches or rationing advisories are currently pending.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
