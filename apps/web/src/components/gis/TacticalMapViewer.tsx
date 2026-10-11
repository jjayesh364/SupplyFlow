'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  GeoJSONFeature,
  GeoJSONFeatureCollection,
  LocationNode,
  RoutePlanResult,
} from '@/types';
import {
  Compass,
  Layers,
  MapPin,
  Maximize2,
  Minimize2,
  Navigation,
  Shield,
  Snowflake,
  Truck,
  Wind,
  Zap,
} from 'lucide-react';

interface TacticalMapViewerProps {
  geoJson: GeoJSONFeatureCollection | null;
  locations: LocationNode[];
  selectedNode: LocationNode | null;
  onSelectNode: (node: LocationNode) => void;
  routePlan: RoutePlanResult | null;
  activeScenario?: string;
}

export const TacticalMapViewer: React.FC<TacticalMapViewerProps> = ({
  geoJson,
  locations,
  selectedNode,
  onSelectNode,
  routePlan,
  activeScenario,
}) => {
  const [viewMode, setViewMode] = useState<'TACTICAL_SVG' | 'MAPLIBRE'>('TACTICAL_SVG');
  const [zoomLevel, setZoomLevel] = useState(1);
  const [hoveredNode, setHoveredNode] = useState<any | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapLibreInstanceRef = useRef<any>(null);

  // Geographic bounds for Synthetic Demonstration Theater
  // Min/Max coordinates from Synthetic Network: Lat 32.5 to 35.0, Lon 75.5 to 78.5
  const MIN_LON = 75.2;
  const MAX_LON = 78.6;
  const MIN_LAT = 32.4;
  const MAX_LAT = 35.1;

  // Convert Lon/Lat to normalized SVG percentage coordinates (0-1000 x 0-600)
  const projectCoords = (lon: number, lat: number) => {
    const x = ((lon - MIN_LON) / (MAX_LON - MIN_LON)) * 900 + 50;
    // Invert Y because latitude goes North (+) but SVG Y goes Down (+)
    const y = 550 - ((lat - MIN_LAT) / (MAX_LAT - MIN_LAT)) * 500;
    return { x, y };
  };

  const nodeFeatures =
    geoJson?.features.filter((f) => f.geometry.type === 'Point') || [];
  const edgeFeatures =
    geoJson?.features.filter((f) => f.geometry.type === 'LineString') || [];

  // Initialize MapLibre GL dynamically if requested and WebGL is available
  useEffect(() => {
    if (viewMode !== 'MAPLIBRE' || !mapContainerRef.current) return;

    let isMounted = true;
    import('maplibre-gl').then((maplibregl) => {
      if (!isMounted || !mapContainerRef.current) return;

      try {
        // Point MapLibre to local self-hosted bundled worker to avoid Webpack blob/import.meta chunk 404s
        if (typeof (maplibregl as any).setWorkerUrl === 'function') {
          (maplibregl as any).setWorkerUrl('/maplibre/maplibre-gl-worker.mjs');
        }

        const MapClass = (maplibregl as any).Map || maplibregl.Map;
        const NavControlClass = (maplibregl as any).NavigationControl || maplibregl.NavigationControl;

        const map = new MapClass({
          container: mapContainerRef.current,
          style: {
            version: 8,
            sources: {
              'osm-tiles': {
                type: 'raster',
                tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
                tileSize: 256,
                attribution: '&copy; OpenStreetMap contributors',
              },
            },
            layers: [
              {
                id: 'osm-layer',
                type: 'raster',
                source: 'osm-tiles',
                minzoom: 0,
                maxzoom: 19,
              },
            ],
          },
          center: [77.0, 33.8],
          zoom: 6.8,
        });

        // Graceful error listener to prevent uncaught runtime overlays
        map.on('error', (e: any) => {
          const errMsg = e?.error?.message || String(e?.message || '');
          console.warn('MapLibre GL non-fatal notice:', errMsg);
          if (errMsg.includes('Worker failed to load')) {
            setMapError('Spatial GL Worker unavailable; operating in Tactical Vector Mesh mode.');
            setViewMode('TACTICAL_SVG');
          }
        });

        map.addControl(new NavControlClass(), 'top-right');
        mapLibreInstanceRef.current = map;

        map.on('load', () => {
          if (!geoJson || !isMounted) return;

          map.addSource('tactical-network', {
            type: 'geojson',
            data: geoJson as any,
          });

          map.addLayer({
            id: 'corridor-lines',
            type: 'line',
            source: 'tactical-network',
            filter: ['==', '$type', 'LineString'],
            paint: {
              'line-color': '#0ea5e9',
              'line-width': 3,
              'line-opacity': 0.8,
            },
          });

          map.addLayer({
            id: 'logistics-nodes',
            type: 'circle',
            source: 'tactical-network',
            filter: ['==', '$type', 'Point'],
            paint: {
              'circle-radius': 8,
              'circle-color': '#10b981',
              'circle-stroke-width': 2,
              'circle-stroke-color': '#ffffff',
            },
          });
        });
      } catch (err) {
        console.warn('MapLibre GL initialization fallback to Tactical SVG:', err);
        setMapError('Spatial GL initialization fell back to Tactical Vector Mesh.');
        setViewMode('TACTICAL_SVG');
      }
    });

    return () => {
      isMounted = false;
      if (mapLibreInstanceRef.current) {
        mapLibreInstanceRef.current.remove();
        mapLibreInstanceRef.current = null;
      }
    };
  }, [viewMode, geoJson]);

  const getNodeColor = (type: string, code: string) => {
    if (selectedNode?.code === code) return '#38bdf8'; // Active highlight cyan
    if (type === 'BASE_DEPOT') return '#3b82f6'; // Blue
    if (type === 'FORWARD_SUPPLY_DEPOT') return '#f59e0b'; // Amber
    return '#10b981'; // Green forward post
  };

  const isCorridorInRoutePlan = (originCode: string, destCode: string) => {
    if (!routePlan) return false;
    return routePlan.path_corridors.some(
      (c) =>
        (c.origin_code === originCode && c.destination_code === destCode) ||
        (c.origin_code === destCode && c.destination_code === originCode)
    );
  };

  return (
    <div className="relative flex h-[420px] w-full flex-col overflow-hidden rounded-xl border border-tactical-800 bg-tactical-50 shadow-sm sm:h-[520px] lg:h-[580px]">
      {/* Top Map HUD Controls */}
      <div className="absolute top-3 left-3 z-20 flex flex-wrap items-center gap-1 bg-white/95 backdrop-blur border border-tactical-800 p-1.5 rounded-lg text-xs shadow-sm">
        <button
          type="button"
          onClick={() => setViewMode('TACTICAL_SVG')}
          aria-pressed={viewMode === 'TACTICAL_SVG'}
          className={`min-h-10 rounded-md px-3 py-2 text-xs font-semibold transition-colors ${
            viewMode === 'TACTICAL_SVG'
              ? 'bg-accent-primary text-white shadow'
              : 'text-tactical-400 hover:text-tactical-200'
          }`}
        >
          Network schematic
        </button>
        <button
          type="button"
          onClick={() => setViewMode('MAPLIBRE')}
          aria-pressed={viewMode === 'MAPLIBRE'}
          className={`min-h-10 rounded-md px-3 py-2 text-xs font-semibold transition-colors ${
            viewMode === 'MAPLIBRE'
              ? 'bg-accent-primary text-white shadow'
              : 'text-tactical-400 hover:text-tactical-200'
          }`}
        >
          Street map
        </button>
      </div>

      {/* Map Fallback Notice if triggered */}
      {mapError && (
          <div className="absolute top-24 left-3 z-20 flex items-center space-x-2 bg-amber-50 border border-amber-200 text-amber-800 px-3 py-1 rounded text-xs sm:top-14">
          <span>{mapError}</span>
          <button onClick={() => setMapError(null)} className="ml-2 hover:text-white font-bold">×</button>
        </div>
      )}

      {/* Disruption / Status Badge Overlay */}
      <div className="absolute top-16 right-3 z-20 flex items-center space-x-2 sm:top-3">
        {activeScenario && activeScenario !== 'NORMAL' && (
          <div className="flex items-center space-x-1.5 bg-red-50 border border-red-200 text-red-800 px-2.5 py-1 rounded text-xs">
            <Zap className="w-3.5 h-3.5" />
            <span>DISRUPTION ACTIVE: {activeScenario}</span>
          </div>
        )}
        <div className="bg-white/95 backdrop-blur border border-tactical-800 px-2.5 py-1 rounded text-xs text-tactical-300 shadow-sm">
          SYNTHETIC NETWORK
        </div>
      </div>

      {/* Main Map Canvas Area */}
      {viewMode === 'TACTICAL_SVG' ? (
        <div className="relative w-full h-full flex-1 overflow-hidden bg-[#edf1f2] select-none">
          {/* Tactical Background Grid */}
          <svg className="w-full h-full" viewBox="0 0 1000 600" preserveAspectRatio="xMidYMid meet">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#dce4e6" strokeWidth="0.7" />
              </pattern>
              <linearGradient id="routeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#285ea8" />
                <stop offset="100%" stopColor="#39765b" />
              </linearGradient>
            </defs>

            <rect width="1000" height="600" fill="url(#grid)" />

            {/* Elevation Contour Rings (Stylized Mountain Topography) */}
            <circle cx="750" cy="180" r="140" fill="none" stroke="#cbd5d8" strokeWidth="1" strokeDasharray="3 4" />
            <circle cx="750" cy="180" r="90" fill="none" stroke="#cbd5d8" strokeWidth="1" strokeDasharray="3 4" />
            <circle cx="480" cy="310" r="120" fill="none" stroke="#cbd5d8" strokeWidth="1" strokeDasharray="3 4" />
            <text x="760" y="70" fill="#687b89" fontSize="10" fontFamily="monospace">
              ZONE NORTH (ELEV &gt; 4,500m)
            </text>
            <text x="180" y="520" fill="#475569" fontSize="10" fontFamily="monospace">
              ZONE SOUTH (BASE STAGING)
            </text>

            {/* Road Corridors / Edges */}
            {edgeFeatures.map((edge, i) => {
              const coords = edge.geometry.coordinates;
              const p1 = projectCoords(coords[0][0], coords[0][1]);
              const p2 = projectCoords(coords[1][0], coords[1][1]);
              const props = edge.properties;
              const isBlocked = props.is_blocked || (activeScenario === 'ROUTE_BLOCKAGE' && props.code === 'CORR-004');
              const inPlannedRoute = isCorridorInRoutePlan(props.origin_code, props.destination_code);
              const friction = props.weather_friction_multiplier || 1.0;

              let strokeColor = '#82949b'; // standard corridor
              let strokeWidth = 2.5;

              if (inPlannedRoute) {
                strokeColor = '#285ea8';
                strokeWidth = 4.5;
              } else if (isBlocked) {
                strokeColor = '#b83d3d';
                strokeWidth = 3.5;
              } else if (friction >= 1.3) {
                strokeColor = '#a86d0a';
                strokeWidth = 3;
              }

              return (
                <g key={`edge-${i}`}>
                  <line
                    x1={p1.x}
                    y1={p1.y}
                    x2={p2.x}
                    y2={p2.y}
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    strokeDasharray={isBlocked ? '6 4' : undefined}
                    className="transition-all duration-300"
                  />
                  {/* Distance / Slope Badge at Midpoint */}
                  <circle
                    cx={(p1.x + p2.x) / 2}
                    cy={(p1.y + p2.y) / 2}
                    r={3}
                    fill={isBlocked ? '#b83d3d' : inPlannedRoute ? '#285ea8' : '#687b89'}
                  />
                </g>
              );
            })}

            {/* Logistics Nodes */}
            {nodeFeatures.map((node, i) => {
              const [lon, lat] = node.geometry.coordinates;
              const p = projectCoords(lon, lat);
              const props = node.properties;
              const isSelected = selectedNode?.code === props.code;
              const locObj = locations.find((l) => l.code === props.code) || {
                id: props.id,
                code: props.code,
                name: props.name,
                location_type: props.location_type,
                latitude: lat,
                longitude: lon,
                elevation_m: props.elevation_m,
                is_active: true,
              };

              return (
                <g
                  key={`node-${i}`}
                  className="cursor-pointer group"
                  role="button"
                  tabIndex={0}
                  aria-label={`${props.code}, ${props.name}, ${props.location_type.replaceAll('_', ' ').toLowerCase()}`}
                  aria-pressed={isSelected}
                  onClick={() => onSelectNode(locObj as LocationNode)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      onSelectNode(locObj as LocationNode);
                    }
                  }}
                  onMouseEnter={() => setHoveredNode(props)}
                  onMouseLeave={() => setHoveredNode(null)}
                >
                  <circle cx={p.x} cy={p.y} r={18} fill="transparent" aria-hidden="true" />
                  {/* Selection Ring */}
                  {isSelected && (
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={14}
                      fill="none"
                      stroke="#38bdf8"
                      strokeWidth={2}
                      className="animate-pulse"
                    />
                  )}

                  {/* Node Symbol */}
                  {props.location_type === 'BASE_DEPOT' ? (
                    <rect
                      x={p.x - 7}
                      y={p.y - 7}
                      width={14}
                      height={14}
                      rx={2}
                      fill={getNodeColor(props.location_type, props.code)}
                      stroke="#ffffff"
                      strokeWidth={1.5}
                    />
                  ) : props.location_type === 'FORWARD_SUPPLY_DEPOT' ? (
                    <polygon
                      points={`${p.x},${p.y - 8} ${p.x + 8},${p.y} ${p.x},${p.y + 8} ${p.x - 8},${p.y}`}
                      fill={getNodeColor(props.location_type, props.code)}
                      stroke="#ffffff"
                      strokeWidth={1.5}
                    />
                  ) : (
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={6}
                      fill={getNodeColor(props.location_type, props.code)}
                      stroke="#ffffff"
                      strokeWidth={1.5}
                    />
                  )}

                  {/* Node Label */}
                  <text
                    x={p.x + 10}
                    y={p.y + 4}
                    fill={isSelected ? '#174f8c' : '#18334a'}
                    fontSize="11"
                    fontFamily="monospace"
                    fontWeight="600"
                    stroke="#edf1f2"
                    strokeWidth="3"
                    strokeLinejoin="round"
                    paintOrder="stroke"
                    className="select-none pointer-events-none"
                  >
                    {props.code}
                  </text>
                  <text
                    x={p.x + 10}
                    y={p.y + 15}
                    fill="#526571"
                    fontSize="9"
                    fontFamily="sans-serif"
                    stroke="#edf1f2"
                    strokeWidth="2.5"
                    strokeLinejoin="round"
                    paintOrder="stroke"
                    className="select-none pointer-events-none"
                  >
                    {props.elevation_m}m
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      ) : (
        <div ref={mapContainerRef} className="w-full h-full flex-1" />
      )}

      {/* Floating Tactical Inspector Card (Bottom Left) */}
      <div className="absolute bottom-3 left-3 z-20 max-w-[calc(100%-1.5rem)] space-y-1.5 rounded-xl border border-tactical-800 bg-white/95 p-3 text-xs shadow-lg backdrop-blur sm:max-w-sm">
        <div className="flex items-center justify-between border-b border-tactical-800 pb-1.5">
          <span className="font-bold text-tactical-200 flex items-center space-x-1.5">
            <MapPin className="w-3.5 h-3.5 text-accent-primary" />
            <span>{selectedNode ? selectedNode.code : 'SELECT A NODE'}</span>
          </span>
          <span className="text-xs text-accent-primary uppercase px-1.5 py-0.5 rounded bg-accent-primary/10">
            {selectedNode ? selectedNode.location_type.replace('_', ' ') : 'STANDBY'}
          </span>
        </div>

        {selectedNode ? (
          <div className="space-y-1.5 text-sm text-tactical-300">
            <div className="flex justify-between">
              <span className="text-tactical-500">Designation:</span>
              <span className="text-tactical-100">{selectedNode.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-tactical-500">Elevation:</span>
              <span className="text-tactical-100">{selectedNode.elevation_m} meters</span>
            </div>
            <div className="flex justify-between">
              <span className="text-tactical-500">Coordinates:</span>
              <span className="text-tactical-100">
                {selectedNode.latitude.toFixed(3)}°N, {selectedNode.longitude.toFixed(3)}°E
              </span>
            </div>
          </div>
        ) : (
          <p className="text-xs leading-5 text-tactical-500">
            Click on any logistics depot or forward post on the map to inspect elevation, corridors, and supply status.
          </p>
        )}
      </div>

      {/* Legend & Symbology (Bottom Right) */}
      <div className="absolute bottom-44 right-3 z-20 hidden space-y-1 rounded-xl border border-tactical-800 bg-white/95 px-3 py-2 text-xs text-tactical-400 shadow-sm backdrop-blur sm:block lg:bottom-3">
        <div className="flex items-center space-x-2">
          <span className="w-2.5 h-2.5 bg-blue-500 rounded-sm" />
          <span>Base Depot (Rear)</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-2.5 h-2.5 bg-amber-500 rotate-45 inline-block" />
          <span>Forward Supply Depot</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full" />
          <span>Forward Post / Outpost</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-4 h-0.5 bg-cyan-400" />
          <span>Planned Dispatch Path</span>
        </div>
      </div>
    </div>
  );
};
