'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { BackendHealthResponse } from '@/types';
import { fetchBackendHealth } from '@/lib/api';
import { Database, Server, Settings, CheckCircle2, AlertCircle, RefreshCw, Cpu, Layers } from 'lucide-react';

export default function Home() {
  const [health, setHealth] = useState<BackendHealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastChecked, setLastChecked] = useState<string>('');

  const checkStatus = async () => {
    setLoading(true);
    const data = await fetchBackendHealth();
    setHealth(data);
    setLoading(false);
    setLastChecked(new Date().toLocaleTimeString());
  };

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  const systemStatus = health ? health.status : 'offline';

  return (
    <div className="flex-1 flex flex-col">
      <Header systemStatus={systemStatus} />

      <main className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-6">
        {/* Phase 1 Status Banner */}
        <div className="bg-tactical-900 border border-tactical-800 rounded-lg p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-accent-primary/20 text-accent-primary border border-accent-primary/30">
                PHASE 1 ACTIVE
              </span>
              <h2 className="text-base font-semibold text-tactical-100">
                Development Foundation & Services Operational
              </h2>
            </div>
            <p className="text-xs text-tactical-400">
              Next.js 15 frontend and FastAPI backend communicating successfully. PostGIS relational spatial schema ready.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <span className="text-[11px] font-mono text-tactical-400">
              Last probe: {lastChecked || 'Checking...'}
            </span>
            <button
              onClick={checkStatus}
              disabled={loading}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-tactical-800 hover:bg-tactical-700 text-tactical-200 border border-tactical-700 text-xs font-mono transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Connectivity Diagnostics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Backend API Card */}
          <div className="bg-tactical-900 border border-tactical-800 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-tactical-200 text-xs font-semibold">
                <Server className="w-4 h-4 text-accent-primary" />
                <span>FastAPI Gateway</span>
              </div>
              {health ? (
                <span className="flex items-center space-x-1 text-[11px] text-accent-success font-mono">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>ONLINE</span>
                </span>
              ) : (
                <span className="flex items-center space-x-1 text-[11px] text-accent-danger font-mono">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>OFFLINE</span>
                </span>
              )}
            </div>

            <div className="text-xs font-mono space-y-1 text-tactical-400 border-t border-tactical-800 pt-3">
              <div className="flex justify-between">
                <span>Endpoint:</span>
                <span className="text-tactical-200">http://localhost:8000</span>
              </div>
              <div className="flex justify-between">
                <span>API Version:</span>
                <span className="text-tactical-200">{health?.version || '0.1.0'}</span>
              </div>
              <div className="flex justify-between">
                <span>Environment:</span>
                <span className="text-tactical-200 uppercase">{health?.environment || 'development'}</span>
              </div>
              <div className="flex justify-between">
                <span>Data Isolation:</span>
                <span className="text-accent-success font-semibold">SYNTHETIC ONLY</span>
              </div>
            </div>
          </div>

          {/* Database & PostGIS Card */}
          <div className="bg-tactical-900 border border-tactical-800 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-tactical-200 text-xs font-semibold">
                <Database className="w-4 h-4 text-accent-primary" />
                <span>PostgreSQL + PostGIS</span>
              </div>
              {health?.database.connected ? (
                <span className="flex items-center space-x-1 text-[11px] text-accent-success font-mono">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>CONNECTED</span>
                </span>
              ) : (
                <span className="flex items-center space-x-1 text-[11px] text-accent-warning font-mono">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>PENDING DB</span>
                </span>
              )}
            </div>

            <div className="text-xs font-mono space-y-1 text-tactical-400 border-t border-tactical-800 pt-3">
              <div className="flex justify-between">
                <span>Server:</span>
                <span className="text-tactical-200">PostgreSQL 16/18</span>
              </div>
              <div className="flex justify-between">
                <span>PostGIS Extension:</span>
                <span className={health?.database.postgis_installed ? 'text-accent-success' : 'text-tactical-400'}>
                  {health?.database.postgis_installed ? `Installed (v${health.database.postgis_version})` : 'Configured (Docker)'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Database:</span>
                <span className="text-tactical-200">supplyflow</span>
              </div>
              <div className="flex justify-between">
                <span>Connection Pool:</span>
                <span className="text-tactical-200">SQLAlchemy Async</span>
              </div>
            </div>
          </div>

          {/* Configurable Parameters Card */}
          <div className="bg-tactical-900 border border-tactical-800 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-tactical-200 text-xs font-semibold">
                <Settings className="w-4 h-4 text-accent-primary" />
                <span>Simulation Parameters</span>
              </div>
              <span className="text-[11px] text-tactical-400 font-mono">EXTERNALIZED</span>
            </div>

            <div className="text-xs font-mono space-y-1 text-tactical-400 border-t border-tactical-800 pt-3">
              <div className="flex justify-between">
                <span>Critical DoS Threshold:</span>
                <span className="text-accent-warning">{health?.configuration.dos_critical_threshold_days ?? 2.0} Days</span>
              </div>
              <div className="flex justify-between">
                <span>Warning DoS Threshold:</span>
                <span className="text-tactical-200">{health?.configuration.dos_warning_threshold_days ?? 5.0} Days</span>
              </div>
              <div className="flex justify-between">
                <span>Convoy Transit Window:</span>
                <span className="text-tactical-200">{health?.configuration.convoy_daylight_start_hour ?? 6}:00 - {health?.configuration.convoy_daylight_end_hour ?? 17}:00 hrs</span>
              </div>
              <div className="flex justify-between">
                <span>Passable Snow Rate:</span>
                <span className="text-tactical-200">&lt; {health?.configuration.max_road_passable_snow_cm_hr ?? 15.0} cm/hr</span>
              </div>
            </div>
          </div>
        </div>

        {/* Engineering Roadmap Module Matrix */}
        <div className="bg-tactical-900 border border-tactical-800 rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Layers className="w-4 h-4 text-accent-primary" />
              <h3 className="text-xs font-bold tracking-wide uppercase text-tactical-200 font-mono">
                System Development Pipeline Status
              </h3>
            </div>
            <span className="text-xs text-tactical-400 font-mono">14-Phase Phased Architecture</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div className="p-3 bg-tactical-950 border border-accent-success/30 rounded flex flex-col justify-between space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono font-semibold text-accent-success">PHASE 0</span>
                <span className="text-[10px] bg-accent-success/20 text-accent-success px-1.5 py-0.5 rounded font-mono">APPROVED</span>
              </div>
              <div className="text-tactical-200 font-medium">Requirements & Blueprint</div>
              <p className="text-[11px] text-tactical-400">Architecture, Free Data Sources, ER Models</p>
            </div>

            <div className="p-3 bg-tactical-950 border border-accent-primary/40 rounded flex flex-col justify-between space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono font-semibold text-accent-primary">PHASE 1</span>
                <span className="text-[10px] bg-accent-primary/20 text-accent-primary px-1.5 py-0.5 rounded font-mono">READY</span>
              </div>
              <div className="text-tactical-200 font-medium">Infrastructure Skeleton</div>
              <p className="text-[11px] text-tactical-400">FastAPI, Next.js, Docker Compose, DB Session</p>
            </div>

            <div className="p-3 bg-tactical-950 border border-tactical-800 rounded flex flex-col justify-between space-y-2 opacity-75">
              <div className="flex items-center justify-between">
                <span className="font-mono font-semibold text-tactical-400">PHASE 2</span>
                <span className="text-[10px] bg-tactical-800 text-tactical-400 px-1.5 py-0.5 rounded font-mono">NEXT</span>
              </div>
              <div className="text-tactical-200 font-medium">PostGIS & Synthetic Data</div>
              <p className="text-[11px] text-tactical-400">Relational spatial schema & generator</p>
            </div>

            <div className="p-3 bg-tactical-950 border border-tactical-800 rounded flex flex-col justify-between space-y-2 opacity-50">
              <div className="flex items-center justify-between">
                <span className="font-mono font-semibold text-tactical-500">PHASES 3–14</span>
                <span className="text-[10px] bg-tactical-800 text-tactical-500 px-1.5 py-0.5 rounded font-mono">QUEUED</span>
              </div>
              <div className="text-tactical-300 font-medium">Core Mathematical Engines</div>
              <p className="text-[11px] text-tactical-500">ML, Risk, GIS, OR-Tools, What-If UI</p>
            </div>
          </div>
        </div>
      </main>

      <footer className="w-full bg-tactical-950 border-t border-tactical-800 px-6 py-3 text-xs text-tactical-500 flex items-center justify-between">
        <div>SupplyFlow Decision Support • Smart India Hackathon 2026</div>
        <div className="font-mono text-[11px]">Strictly Synthetic / Simulation Data</div>
      </footer>
    </div>
  );
}
