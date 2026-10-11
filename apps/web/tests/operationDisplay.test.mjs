import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import Module from 'node:module';
import {
  filterForecastsForSelection,
  formatForecastValue,
  getForecastQuantiles,
  getForecastStateMessage,
  getRecommendationDetailRows,
  getRecommendationStateMessage,
  getRecommendationStatusMessage,
  getRecommendationTitle,
  getTrainingEvaluationMetrics,
} from '../src/components/operations/operationDisplay.ts';

const require = createRequire(new URL('../package.json', import.meta.url));
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const helperExports = {
  filterForecastsForSelection,
  formatForecastValue,
  getForecastHorizon: (record) => record.feature_contributions?.horizon_days ?? null,
  getForecastQuantiles,
  getForecastStateMessage,
  getRecommendationDetailRows,
  getRecommendationStateMessage,
  getRecommendationStatusMessage,
  getRecommendationTitle,
};

function renderComponent(relativePath, exportName, props) {
  const filename = fileURLToPath(new URL(relativePath, import.meta.url));
  const source = readFileSync(filename, 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
  }).outputText;
  const componentModule = new Module(filename);
  componentModule.filename = filename;
  componentModule.paths = Module._nodeModulePaths(path.dirname(filename));
  const originalLoad = Module._load;
  Module._load = function (request, parent, isMain) {
    if (request === '@/components/operations/operationDisplay') return helperExports;
    if (request === 'lucide-react') {
      return new Proxy({}, {
        get: (_, iconName) => (iconProps) => React.createElement('svg', {
          'aria-hidden': true,
          'data-test-icon': String(iconName),
          ...iconProps,
        }),
      });
    }
    return originalLoad.call(this, request, parent, isMain);
  };
  try {
    componentModule._compile(compiled, filename);
  } finally {
    Module._load = originalLoad;
  }
  return renderToStaticMarkup(React.createElement(componentModule.exports[exportName], props));
}

const recommendation = {
  id: 'recommendation-1',
  optimization_run_id: 'run-1',
  recommendation_type: 'REPLENISHMENT_DISPATCH',
  details: {
    stops: ['LOC-BASE-ALPHA', 'LOC-POST-PASS-B'],
    capacity_kg: 7500,
    stops_count: 2,
    vehicle_code: 'VEH-TK-03',
    estimated_hours: 24.83,
    total_distance_km: 728.5,
    allocated_payload_kg: 3000,
  },
  status: 'PROPOSED',
  created_at: '2026-10-03T18:17:09.785478+00:00',
};

const forecast = {
  id: 'forecast-1',
  location_id: 'location-a',
  location_code: 'LOC-POST-FRONTIER',
  item_id: 'item-a',
  item_name: '[SYNTHETIC] Filter Pack',
  forecast_date: '2026-10-10',
  predicted_demand_p10: 3.69,
  predicted_demand_p50: 3.99,
  predicted_demand_p90: 6.32,
  model_version: 'HistGradientBoosting_Quantile-v1.0',
  feature_contributions: {
    wape: 0.0915,
    horizon_days: 1,
    explainability: ['Recent upward consumption velocity (+15.8% over 7-day window).'],
  },
  synthetic_data: true,
};

test('recommendation mapping displays actual dispatch details and PROPOSED status', () => {
  assert.equal(getRecommendationTitle(recommendation.recommendation_type), 'Replenishment Dispatch');
  assert.deepEqual(getRecommendationDetailRows(recommendation.details), [
    { label: 'Vehicle', value: 'VEH-TK-03' },
    { label: 'Stops', value: 'LOC-BASE-ALPHA → LOC-POST-PASS-B' },
    { label: 'Allocated payload', value: '3,000 kg' },
    { label: 'Vehicle capacity', value: '7,500 kg' },
    { label: 'Estimated duration', value: '24.83 hours' },
    { label: 'Total distance', value: '728.5 km' },
  ]);
  assert.equal(
    getRecommendationStatusMessage(recommendation.status),
    'Proposal requires human review; it is not approved for execution.',
  );
});

test('recommendation component renders API fields and review status', () => {
  const markup = renderComponent('../src/components/operations/RecommendationsTab.tsx', 'RecommendationsTab', {
    recommendations: [recommendation],
    onTriggerOptimization() {},
    isOptimizing: false,
    isLoading: false,
    hasLoadError: false,
  });
  for (const value of ['Replenishment Dispatch', 'VEH-TK-03', 'LOC-BASE-ALPHA', '3,000 kg', '7,500 kg', '24.83 hours', '728.5 km', 'PROPOSED', 'requires human review']) {
    assert.ok(markup.includes(value), `expected recommendation markup to include ${value}`);
  }
  assert.ok(!markup.includes('Action Approved by Decision Model'));
  assert.match(markup, /<details[^>]*>.*Technical details/s);
});

test('recommendation component handles missing details plus understandable empty and error states', () => {
  const common = { onTriggerOptimization() {}, isOptimizing: false, isLoading: false };
  const withoutDetails = renderComponent('../src/components/operations/RecommendationsTab.tsx', 'RecommendationsTab', {
    ...common,
    recommendations: [{ ...recommendation, details: null }],
    hasLoadError: false,
  });
  assert.ok(withoutDetails.includes('Proposal requires human review'));
  assert.ok(!withoutDetails.includes('Allocated payload'));

  const empty = renderComponent('../src/components/operations/RecommendationsTab.tsx', 'RecommendationsTab', {
    ...common,
    recommendations: [],
    hasLoadError: false,
  });
  assert.ok(empty.includes('No proposals were returned'));

  const failed = renderComponent('../src/components/operations/RecommendationsTab.tsx', 'RecommendationsTab', {
    ...common,
    recommendations: [],
    hasLoadError: true,
  });
  assert.ok(failed.includes('Proposals are unavailable'));
});

test('recommendation details safely omit absent or malformed optional values', () => {
  assert.deepEqual(getRecommendationDetailRows(null), []);
  assert.deepEqual(getRecommendationDetailRows({ stops: [null, '', 'LOC-POST-A'] }), [
    { label: 'Stops', value: 'LOC-POST-A' },
  ]);
  assert.equal(
    getRecommendationStateMessage(false, false, 0),
    'No recommendations were returned. This does not indicate that all supplies are adequate.',
  );
  assert.match(getRecommendationStateMessage(false, true, 0), /could not be loaded/);
});

test('shipment view displays the current backend shipment identifiers and status', () => {
  const shipment = {
    id: 'shipment-1',
    shipment_code: 'SHP-SYNTH-001',
    origin_location_id: 'origin-1',
    destination_location_id: 'destination-1',
    vehicle_id: 'vehicle-1',
    status: 'IN_TRANSIT',
    departure_time: '2026-10-10T07:00:00Z',
    estimated_arrival_time: '2026-10-10T14:30:00Z',
    origin_location: { id: 'origin-1', code: 'LOC-BASE-A', name: '[SYNTHETIC] Depot A' },
    destination_location: { id: 'destination-1', code: 'LOC-POST-B', name: '[SYNTHETIC] Post B' },
    vehicle: { id: 'vehicle-1', vehicle_code: 'VEH-SYNTH-1' },
    items: [{ quantity: 12, item: { name: 'Synthetic supply item', unit: 'kg' } }],
  };
  const markup = renderComponent('../src/components/operations/ShipmentsTab.tsx', 'ShipmentsTab', {
    shipments: [shipment],
    vehicles: [],
  });
  for (const value of ['SHP-SYNTH-001', 'LOC-BASE-A', 'LOC-POST-B', 'In Transit', 'Details']) {
    assert.ok(markup.includes(value), `expected shipment markup to include ${value}`);
  }
  assert.ok(!markup.includes('BASE-01'));
  assert.ok(!markup.includes('1530 hrs'));
});

test('forecast mapping preserves API quantiles and filters by API location_id and item_id', () => {
  const otherLocation = { ...forecast, id: 'forecast-2', location_id: 'location-b' };
  const otherItem = { ...forecast, id: 'forecast-3', item_id: 'item-b' };
  const result = filterForecastsForSelection([otherItem, forecast, otherLocation], 'location-a', 'item-a');
  assert.deepEqual(result, [forecast]);
  assert.deepEqual(getForecastQuantiles(result[0]), { p10: 3.69, p50: 3.99, p90: 6.32 });
  assert.equal(result[0].feature_contributions.horizon_days, 1);
});

test('forecast component plots and tabulates P10, P50, and P90 from the API fields', () => {
  const markup = renderComponent('../src/components/operations/ForecastingTab.tsx', 'ForecastingTab', {
    forecasts: [forecast],
    locations: [{ id: 'location-a', code: 'LOC-POST-FRONTIER', name: 'Frontier', location_type: 'FORWARD_POST' }],
    supplies: [{ id: 'item-a', name: 'Synthetic Filter Pack', category: 'CLASS_I_RATIONS', unit_of_measure: 'kg' }],
    onRetrainForecast() {},
    onFiltersChange: async () => true,
    isRetraining: false,
    isLoading: false,
    hasLoadError: false,
    metrics: null,
  });
  assert.ok(markup.includes('3.7 kg'));
  assert.ok(markup.includes('4.0 kg'));
  assert.ok(markup.includes('6.3 kg'));
  assert.ok(markup.includes('Recent upward consumption velocity'));
  assert.ok(markup.includes('Day +1'));
});

test('forecast component shows scoped empty state and does not replace missing values with zero', () => {
  const props = {
    forecasts: [],
    locations: [{ id: 'location-a', code: 'LOC-POST-FRONTIER', name: 'Frontier', location_type: 'FORWARD_POST' }],
    supplies: [{ id: 'item-a', name: 'Synthetic Filter Pack', category: 'CLASS_I_RATIONS', unit_of_measure: 'kg' }],
    onRetrainForecast() {},
    onFiltersChange: async () => true,
    isRetraining: false,
    isLoading: false,
    hasLoadError: false,
    metrics: null,
  };
  const empty = renderComponent('../src/components/operations/ForecastingTab.tsx', 'ForecastingTab', props);
  assert.ok(empty.includes('No forecasts are available for LOC-POST-FRONTIER and Synthetic Filter Pack'));
  assert.ok(!empty.includes('9.15%'));

  const missing = renderComponent('../src/components/operations/ForecastingTab.tsx', 'ForecastingTab', {
    ...props,
    forecasts: [{ ...forecast, predicted_demand_p10: null, predicted_demand_p50: null, predicted_demand_p90: null }],
  });
  assert.ok(missing.includes('Forecast records exist for this selection'));
  assert.ok(missing.includes('Not available'));
  assert.ok(!missing.includes('0.0 kg'));
});

test('forecast training evaluation reads evaluation_metrics and samples_evaluated', () => {
  const response = {
    status: 'success',
    total_forecasts_generated: 280,
    horizon_days: 14,
    evaluation_metrics: {
      wape: 0.0915,
      baseline_wape: 0.14,
      wape_improvement_pct: 34.64,
      mae: 11.99,
      rmse: 30.94,
      samples_evaluated: 8880,
    },
  };
  assert.deepEqual(getTrainingEvaluationMetrics(response), response.evaluation_metrics);
  assert.equal(getTrainingEvaluationMetrics(null), null);
  const metricsMarkup = renderComponent('../src/components/operations/ForecastingTab.tsx', 'ForecastingTab', {
    forecasts: [],
    locations: [],
    supplies: [],
    onRetrainForecast() {},
    onFiltersChange: async () => true,
    isRetraining: false,
    isLoading: false,
    hasLoadError: false,
    metrics: getTrainingEvaluationMetrics(response),
  });
  assert.ok(metricsMarkup.includes('Training WAPE'));
  assert.ok(metricsMarkup.includes('9.15%'));
  assert.ok(metricsMarkup.includes('8,880'));
  assert.ok(!metricsMarkup.includes('Synthetic Benchmark'));
});

test('forecast missing values stay unavailable and selected-pair empty state is explicit', () => {
  assert.equal(formatForecastValue(null, 'units'), 'Not available');
  assert.equal(formatForecastValue(0, 'units'), '0.0 units');
  assert.match(
    getForecastStateMessage(false, false, false, 'LOC-BASE-ALPHA', 'Tea Mix'),
    /LOC-BASE-ALPHA and Tea Mix/,
  );
  assert.match(getForecastStateMessage(false, true, false, '', ''), /could not be loaded/);
});

test('home briefing prioritizes current supply risk and delayed delivery records', () => {
  const markup = renderComponent('../src/components/operations/OverviewTab.tsx', 'OverviewTab', {
    locations: [{ id: 'loc-1', code: 'LOC-SYNTH-A', name: 'Synthetic depot', location_type: 'BASE_DEPOT' }],
    risks: [
      { location_id: 'loc-1', item_id: 'item-1', location_code: 'LOC-SYNTH-A', item_name: 'Synthetic filters', risk_state: 'CRITICAL', days_of_supply: 1.5, current_quantity: 10 },
      { location_id: 'loc-1', item_id: 'item-2', location_code: 'LOC-SYNTH-A', item_name: 'Synthetic fuel', risk_state: 'WARNING', days_of_supply: 4, current_quantity: 20 },
    ],
    vehicles: [],
    shipments: [{
      id: 'ship-1',
      shipment_code: 'SHP-SYNTH-1',
      status: 'DELAYED',
      origin_location: { code: 'LOC-SYNTH-A' },
      destination_location: { code: 'LOC-SYNTH-B' },
    }],
    recommendations: [],
    recommendationsLoading: false,
    recommendationsLoadError: false,
    isDataLoading: false,
    onTriggerOptimization() {},
    onRetrainForecast() {},
    onNavigateTab() {},
    isOptimizing: false,
    isForecasting: false,
  });
  for (const value of ['Supply briefing', 'Urgent supplies', 'Running low', 'Delayed deliveries', 'SHP-SYNTH-1', '1.5 days']) {
    assert.ok(markup.includes(value), 'briefing should include ' + value);
  }
  assert.ok(!markup.includes('Network locations'));
  assert.ok(!markup.includes('Available vehicles</span>'));
});

test('inventory display keeps numeric zero distinct from unavailable days of supply', () => {
  const markup = renderComponent('../src/components/operations/InventoryRiskTab.tsx', 'InventoryRiskTab', {
    risks: [{
      location_id: 'loc-1',
      item_id: 'item-1',
      location_code: 'LOC-SYNTH-A',
      item_name: 'Synthetic filters',
      risk_state: 'WARNING',
      current_quantity: 0,
      days_of_supply: null,
    }],
  });
  assert.match(markup, />0<\/td>/);
  assert.match(markup, /Not available/);
});
