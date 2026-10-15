'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Header, SystemStatus } from '@/components/layout/Header';
import { TacticalMapViewer } from '@/components/gis/TacticalMapViewer';
import { OverviewTab } from '@/components/operations/OverviewTab';
import { InventoryRiskTab } from '@/components/operations/InventoryRiskTab';
import { ForecastingTab } from '@/components/operations/ForecastingTab';
import { RouteCorridorTab } from '@/components/operations/RouteCorridorTab';
import { ShipmentsTab } from '@/components/operations/ShipmentsTab';
import { RecommendationsTab } from '@/components/operations/RecommendationsTab';
import { SimulationTab } from '@/components/operations/SimulationTab';
import { AssistantPanel } from '@/components/operations/AssistantPanel';
import { getTrainingEvaluationMetrics } from '@/components/operations/operationDisplay';
import {
  fetchBackendHealth,
  fetchForecasts,
  fetchInventoryRisks,
  fetchLocations,
  fetchNetworkGeoJSON,
  fetchRecommendations,
  fetchRoutePlan,
  fetchShipments,
  fetchSupplies,
  fetchVehicles,
  runSimulation,
  subscribeConnectionState,
  triggerForecastTraining,
  triggerOptimization,
} from '@/lib/api';
import {
  BackendHealthResponse,
  DemandForecastItem,
  ForecastMetrics,
  GeoJSONFeatureCollection,
  InventoryRiskItem,
  LocationNode,
  OptimizationRunResult,
  RecommendationItem,
  RoutePlanResult,
  ShipmentItemRecord,
  SimulationResult,
  SupplyItem,
  VehicleItem,
} from '@/types';
import {
  Activity,
  BarChart2,
  FileText,
  Map as MapIcon,
  MessageCircle,
  Navigation,
  RefreshCw,
  Shield,
  Truck,
  Zap,
} from 'lucide-react';

export default function Home() {
  const forecastSelectionRef = useRef<{ locationId: string; itemId: string }>({ locationId: '', itemId: '' });
  const forecastRequestRef = useRef<number>(0);
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [health, setHealth] = useState<BackendHealthResponse | null>(null);
  const [locations, setLocations] = useState<LocationNode[]>([]);
  const [supplies, setSupplies] = useState<SupplyItem[]>([]);
  const [geoJson, setGeoJson] = useState<GeoJSONFeatureCollection | null>(null);
  const [risks, setRisks] = useState<InventoryRiskItem[]>([]);
  const [forecasts, setForecasts] = useState<DemandForecastItem[]>([]);
  const [forecastMetrics, setForecastMetrics] = useState<ForecastMetrics | null>(null);
  const [forecastLoadError, setForecastLoadError] = useState<boolean>(false);
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [recommendationsLoadError, setRecommendationsLoadError] = useState<boolean>(false);
  const [vehicles, setVehicles] = useState<VehicleItem[]>([]);
  const [shipments, setShipments] = useState<ShipmentItemRecord[]>([]);
  const [selectedNode, setSelectedNode] = useState<LocationNode | null>(null);
  const [routePlan, setRoutePlan] = useState<RoutePlanResult | null>(null);
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);

  // Connection lifecycle and data freshness states
  const [systemStatus, setSystemStatus] = useState<SystemStatus>('waking_up');
  const [isStaleData, setIsStaleData] = useState<boolean>(false);
  const hasLoadedInitialDataRef = useRef<boolean>(false);

  // Loading states
  const [loading, setLoading] = useState<boolean>(true);
  const [isOptimizing, setIsOptimizing] = useState<boolean>(false);
  const [isForecasting, setIsForecasting] = useState<boolean>(false);
  const [isRouting, setIsRouting] = useState<boolean>(false);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);

  useEffect(() => {
    const unsubscribe = subscribeConnectionState(({ isWakingUp, isRetrying }) => {
      if (isWakingUp || isRetrying) {
        setSystemStatus((current) => {
          if (current === 'healthy') return 'reconnecting';
          if (!hasLoadedInitialDataRef.current) return 'waking_up';
          return 'reconnecting';
        });
      }
    });
    return unsubscribe;
  }, []);

  const loadAllData = useCallback(async () => {
    setLoading(true);
    if (hasLoadedInitialDataRef.current) {
      setIsStaleData(true);
    }
    try {
      const [
        healthData,
        locsData,
        suppliesData,
        geoData,
        risksData,
        recsData,
        vehData,
        shipData,
      ] = await Promise.all([
        fetchBackendHealth(),
        fetchLocations(),
        fetchSupplies(),
        fetchNetworkGeoJSON(),
        fetchInventoryRisks(),
        fetchRecommendations(),
        fetchVehicles(),
        fetchShipments(),
      ]);

      const locationId = forecastSelectionRef.current.locationId || locsData[0]?.id || '';
      const itemId = forecastSelectionRef.current.itemId || suppliesData[0]?.id || '';
      forecastSelectionRef.current = { locationId, itemId };
      const fcData = await fetchForecasts(locationId || undefined, itemId || undefined);

      const anyDataSucceeded =
        Boolean(healthData) ||
        locsData.length > 0 ||
        suppliesData.length > 0 ||
        risksData.length > 0 ||
        vehData.length > 0 ||
        shipData.length > 0 ||
        recsData !== null;

      if (healthData) {
        setHealth(healthData);
        setSystemStatus(healthData.status);
      } else if (anyDataSucceeded) {
        setSystemStatus('healthy');
      } else if (!hasLoadedInitialDataRef.current) {
        setSystemStatus('offline');
      } else {
        setSystemStatus('reconnecting');
      }

      if (locsData.length > 0) {
        setLocations(locsData);
        setSelectedNode((prev) => prev || locsData[0]);
      }
      if (suppliesData.length > 0) setSupplies(suppliesData);
      if (geoData) setGeoJson(geoData);
      if (risksData.length > 0) setRisks(risksData);
      if (fcData !== null) setForecasts(fcData);
      setForecastLoadError(fcData === null && !hasLoadedInitialDataRef.current);
      if (recsData !== null) setRecommendations(recsData);
      setRecommendationsLoadError(recsData === null && !hasLoadedInitialDataRef.current);
      if (vehData.length > 0) setVehicles(vehData);
      if (shipData.length > 0) setShipments(shipData);

      if (anyDataSucceeded) {
        hasLoadedInitialDataRef.current = true;
        setIsStaleData(false);
      }
    } catch (err) {
      console.error('Error loading initial SupplyFlow data:', err);
      if (!hasLoadedInitialDataRef.current) {
        setSystemStatus('offline');
      } else {
        setIsStaleData(true);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  const handleTriggerOptimization = async () => {
    setIsOptimizing(true);
    try {
      const result = await triggerOptimization({ max_solve_time_seconds: 10 });
      if (result) {
        // Refresh recommendations and shipments
        const [recs, ships] = await Promise.all([
          fetchRecommendations(),
          fetchShipments(),
        ]);
        if (recs === null) {
          setRecommendationsLoadError(true);
        } else {
          setRecommendations(recs);
          setRecommendationsLoadError(false);
        }
        setShipments(ships);
      }
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleRetrainForecasts = async () => {
    setIsForecasting(true);
    setForecastMetrics(null);
    try {
      const res = await triggerForecastTraining();
      if (res) {
        setForecastMetrics(getTrainingEvaluationMetrics(res));
        const { locationId, itemId } = forecastSelectionRef.current;
        const fc = await fetchForecasts(locationId || undefined, itemId || undefined);
        if (fc === null) {
          setForecastLoadError(true);
        } else {
          setForecasts(fc);
          setForecastLoadError(false);
        }
      }
    } finally {
      setIsForecasting(false);
    }
  };

  const handleForecastFiltersChange = async (locationId: string, itemId: string): Promise<boolean> => {
    forecastSelectionRef.current = { locationId, itemId };
    const requestId = ++forecastRequestRef.current;
    const data = await fetchForecasts(locationId || undefined, itemId || undefined);
    if (requestId !== forecastRequestRef.current) return false;
    if (data === null) {
      setForecastLoadError(true);
      return false;
    }
    setForecasts(data);
    setForecastLoadError(false);
    return true;
  };

  const handleCalculateRoute = async (originId: string, destId: string) => {
    setIsRouting(true);
    try {
      const plan = await fetchRoutePlan(originId, destId);
      if (plan) {
        setRoutePlan(plan);
      }
    } finally {
      setIsRouting(false);
    }
  };

  const handleRunSimulation = async (scenarioType: string) => {
    setIsSimulating(true);
    try {
      const res = await runSimulation(scenarioType);
      if (res) {
        setSimulationResult(res);
      }
    } finally {
      setIsSimulating(false);
    }
  };

  const tabs = [
    { id: 'overview', label: "Today's Supply Situation", icon: Activity },
    { id: 'gis', label: 'Network Map', icon: MapIcon },
    { id: 'inventory', label: 'Stock & Availability', icon: Shield },
    { id: 'forecasting', label: 'Demand Forecasts', icon: BarChart2 },
    { id: 'routing', label: 'Plan a Route', icon: Navigation },
    { id: 'shipments', label: 'Deliveries & Manifests', icon: Truck },
    { id: 'recommendations', label: 'Recommendations', icon: FileText },
    { id: 'simulation', label: 'What-If Planning', icon: Zap },
    { id: 'assistant', label: 'AI Help', icon: MessageCircle },
  ];
  const navigationGroups = [
    { label: 'Home', ids: ['overview'] },
    { label: 'Supplies', ids: ['inventory'] },
    { label: 'Deliveries', ids: ['shipments'] },
    { label: 'Routes & Map', ids: ['routing', 'gis'] },
    { label: 'Planning', ids: ['forecasting', 'recommendations', 'simulation'] },
    { label: 'AI Help', ids: ['assistant'] },
  ];
  const activeNavigationGroup = navigationGroups.find((group) => group.ids.includes(activeTab));

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <Header systemStatus={systemStatus} isStale={isStaleData} />
      <div className="flex flex-1 min-h-0">
        <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-tactical-800 bg-white px-3 py-5">
          <p className="px-3 pb-3 text-[10px] font-semibold uppercase tracking-[.14em] text-tactical-500">Workspace</p>
          <nav aria-label="Main navigation" className="space-y-1">
            {navigationGroups.map((group) => (
              <div key={group.label}>
                <div className="space-y-1">
                  {group.ids.map((id) => {
                    const tab = tabs.find((item) => item.id === id);
                    if (!tab) return null;
                    const Icon = tab.icon;
                    const groupActive = group.ids.includes(activeTab);
                    const primaryId = group.ids[0];
                    const isPrimary = id === primaryId;
                    if (!isPrimary) return null;
                    return <button key={group.label} onClick={() => setActiveTab(primaryId)} aria-current={groupActive ? 'page' : undefined}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm font-medium transition-colors ${groupActive ? 'bg-blue-50 text-accent-primary' : 'text-tactical-400 hover:bg-tactical-50 hover:text-tactical-100'}`}>
                      <Icon className="w-4 h-4 shrink-0" aria-hidden="true" /><span>{group.label}</span>
                    </button>;
                  })}
                  {group.ids.length > 1 && activeNavigationGroup?.label === group.label && (
                    <div className="ml-5 space-y-1 border-l border-tactical-800 pl-3">
                      {group.ids.map((id) => {
                        const tab = tabs.find((item) => item.id === id);
                        if (!tab || id === group.ids[0]) return null;
                        const Icon = tab.icon;
                        const isActive = activeTab === id;
                        return <button key={id} onClick={() => setActiveTab(id)} aria-current={isActive ? 'page' : undefined}
                          className={`min-h-10 w-full flex items-center gap-2 px-2 rounded-md text-left text-xs font-medium transition-colors ${isActive ? 'bg-blue-50 text-accent-primary' : 'text-tactical-400 hover:bg-tactical-50 hover:text-tactical-100'}`}>
                          <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" /><span>{tab.label}</span>
                        </button>;
                      })}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </nav>
          <div className="mt-auto mx-2 rounded-lg border border-tactical-800 bg-tactical-50 p-3 text-xs text-tactical-400">
            <div className="font-semibold text-tactical-200">SIH 2026 · PS 26251</div>
            <div className="mt-1">Synthetic logistics network</div>
          </div>
        </aside>

        <main className="flex-1 min-w-0 p-4 md:p-7 max-w-[1600px] mx-auto w-full space-y-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs text-tactical-500">SupplyFlow <span className="mx-1">/</span> Operations</p>
            <h2 className="mt-1 text-xl md:text-2xl font-semibold tracking-tight text-tactical-100">{tabs.find((tab) => tab.id === activeTab)?.label}</h2>
            <p className="mt-1 text-sm text-tactical-400">Decision support for predictive logistics and forward supply planning.</p>
          </div>
          <button onClick={loadAllData} disabled={loading} title="Refresh all operational data" aria-label="Refresh all operational data"
            className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-tactical-800 bg-white px-3 py-2 text-sm font-medium text-tactical-300 hover:bg-tactical-50 disabled:opacity-60">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /><span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
        <div className="md:hidden space-y-2">
          <label htmlFor="mobile-navigation" className="sr-only">Choose a section</label>
          <select id="mobile-navigation" value={activeTab} onChange={(event) => setActiveTab(event.target.value)}
            className="w-full rounded-lg border border-tactical-800 bg-white px-3 py-2.5 text-sm font-medium text-tactical-300">
            {navigationGroups.map((group) => <optgroup key={group.label} label={group.label}>
              {group.ids.map((id) => {
                const tab = tabs.find((item) => item.id === id);
                return tab ? <option key={tab.id} value={tab.id}>{tab.label}</option> : null;
              })}
            </optgroup>)}
          </select>
        </div>
        <div className="space-y-6">
          {activeTab === 'assistant' && <AssistantPanel />}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <OverviewTab
                locations={locations}
                risks={risks}
                vehicles={vehicles}
                shipments={shipments}
                recommendations={recommendations}
                recommendationsLoading={loading && !hasLoadedInitialDataRef.current}
                recommendationsLoadError={recommendationsLoadError}
                isDataLoading={loading && !hasLoadedInitialDataRef.current}
                onTriggerOptimization={handleTriggerOptimization}
                onRetrainForecast={handleRetrainForecasts}
                onNavigateTab={(tab) => setActiveTab(tab)}
                isOptimizing={isOptimizing}
                isForecasting={isForecasting}
              />

              {/* Embedded Map Section in Overview */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <MapIcon className="w-4 h-4 text-accent-primary" />
                      <h3 className="text-sm font-semibold text-tactical-100">
                      Demonstration network map
                    </h3>
                  </div>
                  <button
                    onClick={() => setActiveTab('gis')}
                    className="text-xs font-mono text-accent-primary hover:underline"
                  >
                    Open Full Map &rarr;
                  </button>
                </div>
                <TacticalMapViewer
                  geoJson={geoJson}
                  locations={locations}
                  selectedNode={selectedNode}
                  onSelectNode={(node) => setSelectedNode(node)}
                  routePlan={routePlan}
                  activeScenario={simulationResult?.scenario_requested}
                />
              </div>
            </div>
          )}

          {activeTab === 'gis' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-tactical-100 font-mono">
                    Synthetic logistics network map
                  </h2>
                  <p className="text-xs text-tactical-400">
                    Explore demonstration locations, routes, and available map layers. Map data is synthetic and is not an operational source.
                  </p>
                </div>
              </div>
              <TacticalMapViewer
                geoJson={geoJson}
                locations={locations}
                selectedNode={selectedNode}
                onSelectNode={(node) => setSelectedNode(node)}
                routePlan={routePlan}
                activeScenario={simulationResult?.scenario_requested}
              />
            </div>
          )}

          {activeTab === 'inventory' && <InventoryRiskTab risks={risks} />}

          {activeTab === 'forecasting' && (
            <ForecastingTab
              forecasts={forecasts}
              locations={locations}
              supplies={supplies}
              onRetrainForecast={handleRetrainForecasts}
              onFiltersChange={handleForecastFiltersChange}
              isRetraining={isForecasting}
              metrics={forecastMetrics}
              isLoading={loading && !hasLoadedInitialDataRef.current}
              hasLoadError={forecastLoadError}
            />
          )}

          {activeTab === 'routing' && (
            <div className="space-y-6">
              <RouteCorridorTab
                locations={locations}
                onCalculateRoute={handleCalculateRoute}
                routePlan={routePlan}
                isCalculating={isRouting}
              />
              <TacticalMapViewer
                geoJson={geoJson}
                locations={locations}
                selectedNode={selectedNode}
                onSelectNode={(node) => setSelectedNode(node)}
                routePlan={routePlan}
                activeScenario={simulationResult?.scenario_requested}
              />
            </div>
          )}

          {activeTab === 'shipments' && (
            <ShipmentsTab shipments={shipments} vehicles={vehicles} />
          )}

          {activeTab === 'recommendations' && (
            <RecommendationsTab
              recommendations={recommendations}
              isLoading={loading && !hasLoadedInitialDataRef.current}
              hasLoadError={recommendationsLoadError}
              onTriggerOptimization={handleTriggerOptimization}
              isOptimizing={isOptimizing}
            />
          )}

          {activeTab === 'simulation' && (
            <div className="space-y-6">
              <SimulationTab
                onRunSimulation={handleRunSimulation}
                simulationResult={simulationResult}
                isRunning={isSimulating}
              />
              <TacticalMapViewer
                geoJson={geoJson}
                locations={locations}
                selectedNode={selectedNode}
                onSelectNode={(node) => setSelectedNode(node)}
                routePlan={routePlan}
                activeScenario={simulationResult?.scenario_requested}
              />
            </div>
          )}
        </div>
        </main>
      </div>

      <footer className="w-full bg-white border-t border-tactical-800 px-6 py-3 text-xs text-tactical-500 flex flex-wrap gap-2 items-center justify-between">
        <div>SupplyFlow Decision Support • Smart India Hackathon 2026 • PS 26251</div>
        <div className="font-mono text-[11px]">Strictly Synthetic / Simulation Data</div>
      </footer>
    </div>
  );
}
