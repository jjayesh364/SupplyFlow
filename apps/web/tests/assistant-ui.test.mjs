import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import Module from 'node:module';

const require = createRequire(new URL('../package.json', import.meta.url));
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

function renderAssistant(status, reply = null) {
  const filename = fileURLToPath(new URL('../src/components/operations/AssistantPanel.tsx', import.meta.url));
  const source = readFileSync(filename, 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const componentModule = new Module(filename);
  componentModule.filename = filename;
  componentModule.paths = Module._nodeModulePaths(path.dirname(filename));
  const originalLoad = Module._load;
  const markdownFilename = path.resolve(path.dirname(filename), 'AssistantMarkdown.tsx');
  const markdownSource = readFileSync(markdownFilename, 'utf8');
  const markdownCompiled = ts.transpileModule(markdownSource, {
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const markdownModule = new Module(markdownFilename);
  markdownModule.filename = markdownFilename;
  markdownModule.paths = Module._nodeModulePaths(path.dirname(markdownFilename));
  const factsFilename = path.resolve(path.dirname(filename), 'AssistantSourceFacts.tsx');
  const factsSource = readFileSync(factsFilename, 'utf8');
  const factsCompiled = ts.transpileModule(factsSource, {
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const factsModule = new Module(factsFilename);
  factsModule.filename = factsFilename;
  factsModule.paths = Module._nodeModulePaths(path.dirname(factsFilename));
  const stateValues = [status, 'en', 'en', '', reply, false, false, '', 'idle'];
  const createElement = (type, props, key) => {
    const { children, ...rest } = props || {};
    return Array.isArray(children)
      ? React.createElement(type, { ...rest, key }, ...children)
      : React.createElement(type, { ...rest, key }, children);
  };
  Module._load = function (request, parent, isMain) {
    if (request === '@/lib/api') return { askAssistant() {}, fetchAssistantStatus() {} };
    if (request === 'lucide-react') {
      return new Proxy({}, {
        get: (_, iconName) => (iconProps) => React.createElement('svg', {
          'aria-hidden': true,
          'data-test-icon': String(iconName),
          ...iconProps,
        }),
      });
    }
    if (request === './AssistantMarkdown') {
      markdownModule._compile(markdownCompiled, markdownFilename);
      return markdownModule.exports;
    }
    if (request === './AssistantSourceFacts') {
      factsModule._compile(factsCompiled, factsFilename);
      return factsModule.exports;
    }
    if (request === 'react') return { ...React, useEffect() {}, useState: () => [stateValues.shift(), () => {}] };
    if (request === 'react/jsx-runtime') {
      return {
        jsx: createElement,
        jsxs: createElement,
        Fragment: React.Fragment,
      };
    }
    return originalLoad.call(this, request, parent, isMain);
  };
  try {
    componentModule._compile(compiled, filename);
  } finally {
    Module._load = originalLoad;
  }
  return renderToStaticMarkup(componentModule.exports.AssistantPanel());
}

test('AI request remains gated behind the Google data disclosure', () => {
  const markup = renderAssistant({ available: true, language: 'en', message: null });
  assert.match(markup, /Google Gemini to generate an explanation/);
  assert.match(markup, /Do not enter real, confidential, personal, or sensitive military information/);
  assert.match(markup, /type="checkbox"/);
  assert.match(markup, /disabled/);
});

test('all six response languages render with native script and are enabled', () => {
  const markup = renderAssistant({ available: true, language: 'en', message: null });
  for (const label of ['English', 'Hindi (\u0939\u093f\u0928\u094d\u0926\u0940)', 'Gujarati (\u0a97\u0ac1\u0a9c\u0ab0\u0abe\u0aa4\u0ac0)', 'Marathi (\u092e\u0930\u093e\u0920\u0940)', 'Punjabi (\u0a2a\u0a70\u0a1c\u0abe\u0a2c\u0a40)', 'Bengali (\u09ac\u09be\u0982\u09b2\u09be)']) {
    assert.ok(markup.includes(label), `missing selector label: ${label}`);
  }
  assert.doesNotMatch(markup, /<option[^>]*disabled/);
  assert.doesNotMatch(markup, /planned/);
  assert.match(markup, /Responses will be in: <span[^>]*>English/);
});

test('API client forwards each selected language code in the request body', async () => {
  const filename = fileURLToPath(new URL('../src/lib/api.ts', import.meta.url));
  const source = readFileSync(filename, 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const apiModule = new Module(filename);
  apiModule.filename = filename;
  apiModule.paths = Module._nodeModulePaths(path.dirname(filename));
  apiModule._compile(compiled, filename);

  const originalFetch = globalThis.fetch;
  const observed = [];
  globalThis.fetch = async (_url, options) => {
    observed.push(JSON.parse(options.body).language);
    return { ok: true, json: async () => ({ available: true, facts: [], explanation: 'ok' }) };
  };
  try {
    for (const language of ['en', 'hi', 'gu', 'mr', 'pa', 'bn']) {
      await apiModule.exports.askAssistant('Explain this synthetic data', language);
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
  assert.deepEqual(observed, ['en', 'hi', 'gu', 'mr', 'pa', 'bn']);
});

test('provider-disabled UI shows unavailable state and hides the question form', () => {
  const markup = renderAssistant({ available: false, language: 'en', message: 'AI help is unavailable.' });
  assert.match(markup, /AI help is unavailable/);
  assert.doesNotMatch(markup, /Your question/);
});

test('facts are distinct from the AI explanation and technical sources are expandable', () => {
  const markup = renderAssistant(
    { available: true, language: 'en', message: null },
    {
      available: true,
      facts: [{ source: 'GET /api/v1/inventory/risk-assessment', fact: 'Complete aggregate: WARNING: 4' }, { source: 'GET /api/v1/inventory/risk-assessment', fact: 'Complete WARNING records (1 of 4): Synthetic item A' }],
      explanation: 'SupplyFlow reports four warning records.',
    },
  );
  assert.match(markup, /Data from SupplyFlow/);
  assert.match(markup, /Complete WARNING records \(1 of 4\)/);
  assert.match(markup, /AI-generated explanation/);
  assert.match(markup, /<details/);
  assert.match(markup, /<summary[^>]*>Technical details<\/summary>/);
  assert.doesNotMatch(markup, /Verified backend facts/);
  assert.doesNotMatch(markup, /Source: GET/);
});

test('authoritative inventory values render from structured facts independently of contradictory AI prose', () => {
  const inventoryRecord = (item_name, location_name, days_of_supply, current_quantity, daily_demand_p50, index) => ({
    source: 'GET /api/v1/inventory/risk-assessment',
    fact: `Complete WARNING records (${index} of 4): ${item_name} at ${location_name}`,
    kind: 'inventory_risk_record',
    inventory_record: { item_name, location_name, risk_state: 'WARNING', days_of_supply, current_quantity, daily_demand_p50, safety_stock_breach: false },
    coverage: { group: 'WARNING records', index, provided: 4, total: 4, complete: true },
  });
  const facts = [
    { source: 'GET /api/v1/inventory/risk-assessment', fact: 'Aggregate facts', kind: 'inventory_risk_summary', inventory_summary: { record_count: 280, risk_counts: { CRITICAL: 0, WARNING: 4, ADEQUATE: 276, EXCESS: 0 } } },
    inventoryRecord('Synthetic item A', 'Synthetic location A', 3.9, 908.5, 235.1, 1),
    inventoryRecord('Synthetic item B', 'Synthetic location B', 4.3, 833.1, 194.7, 2),
    inventoryRecord('Synthetic item C', 'Synthetic location C', 4.9, 951.3, 193.3, 3),
    inventoryRecord('Synthetic item D', 'Synthetic location D', 4.4, 837.9, 190.3, 4),
  ];
  const markup = renderAssistant(
    { available: true, language: 'en', message: null },
    { available: true, facts, explanation: 'There are zero warning records and item A has 999 days of supply.' },
  );

  for (const text of ['280 synthetic inventory-risk records', '276', 'Synthetic item A', 'Synthetic location A', '3.9', '908.5', '235.1', 'Synthetic item D', '4.4', '837.9', '190.3', 'Complete WARNING records: 4 of 4', 'Safety stock breach', '>No<']) {
    assert.ok(markup.includes(text), `structured source fact missing: ${text}`);
  }
  assert.match(markup, /There are zero warning records/);
  assert.match(markup, /999 days of supply/);
  assert.match(markup, /<table/);
});

test('partial structured inventory context is explicitly labelled as examples', () => {
  const markup = renderAssistant(
    { available: true, language: 'en', message: null },
    { available: true, facts: [{
      source: 'GET /api/v1/inventory/risk-assessment', fact: 'Example 1 of 3; 5 WARNING records total', kind: 'inventory_risk_record',
      inventory_record: { item_name: 'Synthetic item', location_name: 'Synthetic node', risk_state: 'WARNING', days_of_supply: 2, current_quantity: 0, daily_demand_p50: null, safety_stock_breach: null },
      coverage: { group: 'WARNING records', index: 1, provided: 3, total: 5, complete: false },
    }], explanation: 'Partial context.' },
  );
  assert.match(markup, /Example 1 of 3; 5 total/);
  assert.match(markup, /Only the labelled examples are provided; this table is not a complete list/);
  assert.match(markup, />0<\/td>/);
  assert.match(markup, /Not available/);
});

test('AI Markdown headings, lists, bold text, and tables render safely without interpreting HTML', () => {
  const markup = renderAssistant(
    { available: true, language: 'en', message: null },
    {
      available: true,
      facts: [{ source: 'GET /api/v1/inventory/risk-assessment', fact: '4 WARNING records supplied.' }],
      explanation: '# Inventory summary\n\nAll **4 WARNING** records are included.\n\n- First record\n- Second record\n\n| Status | Count |\n| --- | --- |\n| WARNING | 4 |\n\n<script>alert(1)</script>',
    },
  );
  assert.match(markup, /<h1/);
  assert.match(markup, /<strong>4 WARNING<\/strong>/);
  assert.match(markup, /<ul/);
  assert.match(markup, /<li>First record<\/li>/);
  assert.match(markup, /<table/);
  assert.match(markup, /<th/);
  assert.match(markup, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.doesNotMatch(markup, /<script>/);
});

test('assistant shows clickable example prompts and a copy action with a generated answer', () => {
  const markup = renderAssistant(
    { available: true, language: 'en', message: null },
    { available: true, facts: [], explanation: 'Review the returned records.' },
  );
  assert.match(markup, /Which supply items need attention first\?/);
  assert.match(markup, /Summarize the current delivery statuses\./);
  assert.match(markup, /Copy AI answer/);
  assert.match(markup, /Synthetic demonstration information only/);
  assert.match(markup, /not assessments of operational safety/);
});
