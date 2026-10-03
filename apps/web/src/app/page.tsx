'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { TacticalMapViewer } from '@/components/gis/TacticalMapViewer';
import { OverviewTab } from '@/components/operations/OverviewTab';
import { InventoryRiskTab } from '@/components/operations/InventoryRiskTab';
import { ForecastingTab } from '@/components/operations/ForecastingTab';
import { RouteCorridorTab } from '@/components/operations/RouteCorridorTab';
import { ShipmentsTab } from '@/components/operations/ShipmentsTab';
import { RecommendationsTab } from '@/components/operations/RecommendationsTab';
import { SimulationTab } from '@/components/operations/SimulationTab';
import {
  fetchAlerts,
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
  triggerForecastTraining,
  triggerOptimization,
} from '@/lib/api';
import {
  AlertItem,
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
  Layers,
  Map as MapIcon,
  Navigation,
  RefreshCw,
  Shield,
  Truck,
  Zap,
} from 'lucide-react';

export default function Home() {
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [health, setHealth] = useState<BackendHealthResponse | null>(null);
  const [locations, setLocations] = useState<LocationNode[]>([]);
  const [supplies, setSupplies] = useState<SupplyItem[]>([]);
  const [geoJson, setGeoJson] = useState<GeoJSONFeatureCollection | null>(null);
  const [risks, setRisks] = useState<InventoryRiskItem[]>([]);
  const [forecasts, setForecasts] = useState<DemandForecastItem[]>([]);
  const [forecastMetrics, setForecastMetrics] = useState<ForecastMetrics | null>(null);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [vehicles, setVehicles] = useState<VehicleItem[]>([]);
  const [shipments, setShipments] = useState<ShipmentItemRecord[]>([]);
  const [selectedNode, setSelectedNode] = useState<LocationNode | null>(null);
  const [routePlan, setRoutePlan] = useState<RoutePlanResult | null>(null);
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);

  // Loading states
  const [loading, setLoading] = useState<boolean>(true);
  const [isOptimizing, setIsOptimizing] = useState<boolean>(false);
  const [isForecasting, setIsForecasting] = useState<boolean>(false);
  const [isRouting, setIsRouting] = useState<boolean>(false);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);

  const loadAllData = useCallback(async () => {
    setLoading(true);
    try {
      const [
        healthData,
        locsData,
        suppliesData,
        geoData,
        risksData,
        fcData,
        alertsData,
        recsData,
        vehData,
        shipData,
      ] = await Promise.all([
        fetchBackendHealth(),
        fetchLocations(),
        fetchSupplies(),
        fetchNetworkGeoJSON(),
        fetchInventoryRisks(),
        fetchForecasts(),
        fetchAlerts(),
        fetchRecommendations(),
        fetchVehicles(),
        fetchShipments(),
      ]);

      if (healthData) setHealth(healthData);
      if (locsData.length > 0) {
        setLocations(locsData);
        setSelectedNode((prev) => prev || locsData[0]);
      }
      if (suppliesData.length > 0) setSupplies(suppliesData);
      if (geoData) setGeoJson(geoData);
      if (risksData.length > 0) setRisks(risksData);
      if (fcData.length > 0) setForecasts(fcData);
      if (alertsData.length > 0) setAlerts(alertsData);
      if (recsData.length > 0) setRecommendations(recsData);
      if (vehData.length > 0) setVehicles(vehData);
      if (shipData.length > 0) setShipments(shipData);
    } catch (err) {
      console.error('Error loading initial SupplyFlow data:', err);
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
        setRecommendations(recs);
        setShipments(ships);
      }
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleRetrainForecasts = async () => {
    setIsForecasting(true);
    try {
      const res = await triggerForecastTraining();
      if (res && res.metrics) {
        setForecastMetrics(res.metrics);
        const fc = await fetchForecasts();
        setForecasts(fc);
      }
    } finally {
      setIsForecasting(false);
    }
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
    { id: 'overview', label: 'Operations Overview', icon: Activity },
    { id: 'gis', label: 'Tactical GIS Map', icon: MapIcon },
    { id: 'inventory', label: 'Inventory & DoS Risk', icon: Shield },
    { id: 'forecasting', label: 'Demand Forecasting', icon: BarChart2 },
    { id: 'routing', label: 'Route Corridors', icon: Navigation },
    { id: 'shipments', label: 'Convoy Manifests', icon: Truck },
    { id: 'recommendations', label: 'Recommendations', icon: FileText },
    { id: 'simulation', label: 'What-If Simulation', icon: Zap },
  ];

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <Header systemStatus={health ? health.status : 'offline'} />

      <main className="flex-1 p-4 md:p-6 max-w-7xl mx-auto w-full space-y-6">
        {/* Navigation Tabs Bar */}
        <div className="bg-tactical-900 border border-tactical-800 rounded-lg p-1.5 flex items-center justify-between overflow-x-auto shadow-sm">
          <div className="flex items-center space-x-1 min-w-max">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-3 py-2 rounded text-xs font-mono font-medium transition-all ${
                    isActive
                      ? 'bg-accent-primary text-white shadow-sm'
                      : 'text-tactical-400 hover:text-tactical-200 hover:bg-tactical-800/60'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <button
            onClick={loadAllData}
            disabled={loading}
            title="Refresh All Telemetry"
            className="p-2 rounded text-tactical-400 hover:text-tactical-100 hover:bg-tactical-800 transition-colors ml-2"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Tab Content Render */}
        <div className="space-y-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <OverviewTab
                locations={locations}
                risks={risks}
                alerts={alerts}
                vehicles={vehicles}
                shipments={shipments}
                recommendations={recommendations}
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
                    <h3 className="text-xs font-bold uppercase tracking-wider text-tactical-100 font-mono">
                      Demonstration Logistics Theater — Spatial Corridor Network
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
                    High-Altitude GIS Logistics Network Viewer
                  </h2>
                  <p className="text-xs text-tactical-400">
                    MapLibre &amp; Tactical Vector rendering of 14 logistics nodes and 18 high-altitude corridors.
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
              isRetraining={isForecasting}
              metrics={forecastMetrics}
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

      <footer className="w-full bg-tactical-950 border-t border-tactical-800 px-6 py-3 text-xs text-tactical-500 flex items-center justify-between">
        <div>SupplyFlow Decision Support • Smart India Hackathon 2026 • PS 26251</div>
        <div className="font-mono text-[11px]">Strictly Synthetic / Simulation Data</div>
      </footer>
    </div>
  );
}
