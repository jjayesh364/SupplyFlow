'use client';

import React from 'react';
import { RecommendationItem } from '@/types';
import {
  getRecommendationDetailRows,
  getRecommendationStateMessage,
  getRecommendationStatusMessage,
  getRecommendationTitle,
} from '@/components/operations/operationDisplay';
import {
  CheckCircle2,
  Clock3,
  ShieldAlert,
  Zap,
} from 'lucide-react';

interface RecommendationsTabProps {
  recommendations: RecommendationItem[];
  onTriggerOptimization: () => void;
  isOptimizing: boolean;
  isLoading: boolean;
  hasLoadError: boolean;
}

export const RecommendationsTab: React.FC<RecommendationsTabProps> = ({
  recommendations,
  onTriggerOptimization,
  isOptimizing,
  isLoading,
  hasLoadError,
}) => {
  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-tactical-800 rounded-xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <ShieldAlert className="w-4 h-4 text-accent-warning" />
            <h3 className="text-base font-semibold text-tactical-100">
              Suggested delivery proposals
            </h3>
          </div>
          <p className="text-sm text-tactical-400">
            Each card is a separate proposal returned from the synthetic network. A proposal requires human review and is not an approval to act.
          </p>
        </div>

        <button
          onClick={onTriggerOptimization}
          disabled={isOptimizing}
          className="flex items-center space-x-2 px-4 py-2.5 rounded-lg bg-accent-primary hover:bg-blue-700 text-white text-sm font-semibold transition-colors shadow-sm disabled:opacity-60"
        >
          <Zap className={`w-3.5 h-3.5 ${isOptimizing ? 'animate-spin' : ''}`} />
          <span>{isOptimizing ? 'Preparing proposals…' : 'Prepare new proposals'}</span>
        </button>
      </div>

      {/* Recommendations Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {!isLoading && !hasLoadError && recommendations.map((rec, i) => (
          <div
            key={rec.id || i}
            className="bg-white border border-tactical-800 rounded-xl p-5 shadow-sm space-y-4 flex flex-col justify-between"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-amber-50 text-amber-900">
                  {rec.status === 'PROPOSED' ? 'PROPOSED · review required' : `Status: ${rec.status || 'Not available'}`}
                </span>
                <span className="text-xs text-tactical-500">
                  {getRecommendationTitle(rec.recommendation_type)}
                </span>
              </div>

              <h4 className="text-base font-semibold text-tactical-100">
                {getRecommendationTitle(rec.recommendation_type)}
              </h4>

              {getRecommendationDetailRows(rec.details).length > 0 && (
                <dl className="bg-tactical-50 p-3 rounded-lg text-sm text-tactical-300 space-y-2">
                  {getRecommendationDetailRows(rec.details).map(({ label, value }) => (
                    <div key={label} className="flex flex-col sm:flex-row sm:justify-between gap-1">
                      <dt className="text-tactical-500">{label}</dt>
                      <dd className="text-tactical-300 text-left sm:text-right break-words">{value}</dd>
                    </div>
                  ))}
                </dl>
              )}
              {getRecommendationDetailRows(rec.details).length === 0 && <p className="rounded-lg bg-tactical-50 p-3 text-sm text-tactical-400">No additional route or vehicle details were provided for this proposal.</p>}
            </div>

            <div className="pt-3 border-t border-tactical-800 flex items-start gap-2 text-sm text-tactical-400">
              {rec.status === 'PROPOSED' && <Clock3 className="w-3.5 h-3.5 text-accent-warning" aria-hidden="true" />}
              <span>{getRecommendationStatusMessage(rec.status)}</span>
            </div>
            {rec.id && <details className="text-xs text-tactical-500"><summary className="min-h-9 w-fit cursor-pointer py-2 font-medium hover:text-tactical-300">Technical details</summary><p className="break-all">Record ID: {rec.id}</p></details>}
          </div>
        ))}

        {isLoading && (
          <div className="col-span-2 p-10 bg-white border border-tactical-800 rounded-xl text-center text-sm text-tactical-400" role="status">
            {getRecommendationStateMessage(isLoading, hasLoadError, recommendations.length)}
          </div>
        )}

        {!isLoading && hasLoadError && (
          <div className="col-span-2 p-10 bg-white border border-tactical-800 rounded-xl text-center space-y-2" role="alert">
            <h4 className="text-base font-semibold text-tactical-200">Proposals are unavailable</h4>
            <p className="text-xs text-tactical-400">{getRecommendationStateMessage(isLoading, hasLoadError, recommendations.length)}</p>
          </div>
        )}

        {!isLoading && !hasLoadError && recommendations.length === 0 && (
          <div className="col-span-2 p-10 bg-white border border-tactical-800 rounded-xl text-center space-y-2">
            <CheckCircle2 className="w-8 h-8 text-accent-success mx-auto opacity-70" />
            <h4 className="text-base font-semibold text-tactical-200">No proposals were returned</h4>
            <p className="text-xs text-tactical-400 max-w-md mx-auto">
              {getRecommendationStateMessage(isLoading, hasLoadError, recommendations.length)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
