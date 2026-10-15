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

// Import compiled api module
function loadApiModule() {
  const filename = fileURLToPath(new URL('../src/lib/api.ts', import.meta.url));
  const source = readFileSync(filename, 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText;

  const apiModule = new Module(filename);
  apiModule.filename = filename;
  apiModule.paths = Module._nodeModulePaths(path.dirname(filename));
  apiModule._compile(compiled, filename);
  return apiModule.exports;
}

function renderHeader(props) {
  const filename = fileURLToPath(new URL('../src/components/layout/Header.tsx', import.meta.url));
  const source = readFileSync(filename, 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
  }).outputText;

  const headerModule = new Module(filename);
  headerModule.filename = filename;
  headerModule.paths = Module._nodeModulePaths(path.dirname(filename));
  const originalLoad = Module._load;
  Module._load = function (request, parent, isMain) {
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
    headerModule._compile(compiled, filename);
    const { Header } = headerModule.exports;
    return renderToStaticMarkup(React.createElement(Header, props));
  } finally {
    Module._load = originalLoad;
  }
}

test('parseRetryAfter parses integer seconds and HTTP dates correctly', () => {
  const { parseRetryAfter } = loadApiModule();

  assert.equal(parseRetryAfter(null), null);
  assert.equal(parseRetryAfter(''), null);
  assert.equal(parseRetryAfter('5'), 5000);
  assert.equal(parseRetryAfter('120'), 120000);

  // Future date string
  const future = new Date(Date.now() + 10000).toUTCString();
  const parsedFuture = parseRetryAfter(future);
  assert.ok(parsedFuture !== null && parsedFuture > 0 && parsedFuture <= 11000);
});

test('calculateBackoffDelay respects exponential backoff, jitter, and max limits', () => {
  const { calculateBackoffDelay } = loadApiModule();

  const delay1 = calculateBackoffDelay(1, 100, 5000);
  const delay2 = calculateBackoffDelay(2, 100, 5000);
  const delay3 = calculateBackoffDelay(3, 100, 5000);

  // Attempt 1: 100 * 2^0 + [0, 500) = [100, 600)
  assert.ok(delay1 >= 100 && delay1 <= 600);
  // Attempt 2: 100 * 2^1 + [0, 500) = [200, 700)
  assert.ok(delay2 >= 200 && delay2 <= 700);
  // Attempt 3: 100 * 2^2 + [0, 500) = [400, 900)
  assert.ok(delay3 >= 400 && delay3 <= 900);

  // Caps at maxDelayMs when Retry-After is too large
  const capped = calculateBackoffDelay(1, 100, 2000, 99999);
  assert.equal(capped, 2000);
});

test('safeFetch retries transient HTTP 502/503 errors and succeeds when service wakes up', async () => {
  const api = loadApiModule();
  const originalFetch = global.fetch;

  let callCount = 0;
  global.fetch = async () => {
    callCount++;
    if (callCount < 3) {
      // Simulate Render 502 Bad Gateway while waking up
      return {
        ok: false,
        status: 502,
        headers: {
          get: (name) => (name.toLowerCase() === 'content-type' ? 'text/html' : null),
        },
      };
    }
    // Woken up
    return {
      ok: true,
      status: 200,
      headers: {
        get: (name) => (name.toLowerCase() === 'content-type' ? 'application/json' : null),
      },
      json: async () => ({ status: 'healthy', project_name: 'SupplyFlow' }),
    };
  };

  try {
    const result = await api.safeFetch('/api/v1/health', {
      baseDelayMs: 10,
      maxDelayMs: 50,
      retries: 3,
      skipDedupe: true,
    });
    assert.equal(callCount, 3);
    assert.ok(result);
    assert.equal(result.status, 'healthy');
  } finally {
    global.fetch = originalFetch;
  }
});

test('safeFetch stops retrying after bounded retries are exhausted and returns null', async () => {
  const api = loadApiModule();
  const originalFetch = global.fetch;

  let callCount = 0;
  global.fetch = async () => {
    callCount++;
    return {
      ok: false,
      status: 503,
      headers: {
        get: () => 'text/html',
      },
    };
  };

  try {
    const result = await api.safeFetch('/api/v1/locations', {
      baseDelayMs: 5,
      maxDelayMs: 20,
      retries: 2,
      skipDedupe: true,
    });
    // 1 initial + 2 retries = 3 calls
    assert.equal(callCount, 3);
    assert.equal(result, null);
  } finally {
    global.fetch = originalFetch;
  }
});

test('safeFetch NEVER retries non-idempotent operations (POST)', async () => {
  const api = loadApiModule();
  const originalFetch = global.fetch;

  let callCount = 0;
  global.fetch = async () => {
    callCount++;
    return {
      ok: false,
      status: 502,
      headers: { get: () => null },
    };
  };

  try {
    const result = await api.safeFetch('/api/v1/assistant/ask', {
      method: 'POST',
      body: JSON.stringify({ question: 'hello' }),
      baseDelayMs: 5,
      retries: 4, // Should be ignored because method is POST
      skipDedupe: true,
    });
    assert.equal(callCount, 1, 'POST requests must never be retried automatically');
    assert.equal(result, null);
  } finally {
    global.fetch = originalFetch;
  }
});

test('safeFetch handles Render HTML wake-up page without throwing SyntaxError', async () => {
  const api = loadApiModule();
  const originalFetch = global.fetch;

  let callCount = 0;
  global.fetch = async () => {
    callCount++;
    return {
      ok: false,
      status: 502,
      headers: {
        get: (h) => (h.toLowerCase() === 'content-type' ? 'text/html; charset=utf-8' : null),
      },
      text: async () => '<html><body>Render service waking up</body></html>',
    };
  };

  try {
    const result = await api.safeFetch('/api/v1/supplies', {
      baseDelayMs: 5,
      maxDelayMs: 15,
      retries: 1,
      skipDedupe: true,
    });
    assert.equal(result, null);
    assert.equal(callCount, 2);
  } finally {
    global.fetch = originalFetch;
  }
});

test('safeFetch coalesces concurrent duplicate GET requests into one in-flight fetch', async () => {
  const api = loadApiModule();
  const originalFetch = global.fetch;

  let callCount = 0;
  global.fetch = async () => {
    callCount++;
    await new Promise((r) => setTimeout(r, 20));
    return {
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => [{ id: 'loc-1' }],
    };
  };

  try {
    const [p1, p2, p3] = await Promise.all([
      api.safeFetch('/api/v1/locations-coalesce-test'),
      api.safeFetch('/api/v1/locations-coalesce-test'),
      api.safeFetch('/api/v1/locations-coalesce-test'),
    ]);
    assert.equal(callCount, 1, 'Should coalesce identical concurrent GET requests into 1 underlying network call');
    assert.deepEqual(p1, [{ id: 'loc-1' }]);
    assert.deepEqual(p2, [{ id: 'loc-1' }]);
    assert.deepEqual(p3, [{ id: 'loc-1' }]);
  } finally {
    global.fetch = originalFetch;
  }
});

test('Header renders honest Waking up service, Reconnecting, System available, and Stale states', () => {
  // Waking up state
  const wakingMarkup = renderHeader({ systemStatus: 'waking_up' });
  assert.ok(wakingMarkup.includes('Waking up service...'), 'Should show Waking up service...');
  assert.ok(!wakingMarkup.includes('Not connected'), 'Should not show Not connected when waking up');

  // Reconnecting state
  const reconnMarkup = renderHeader({ systemStatus: 'reconnecting' });
  assert.ok(reconnMarkup.includes('Reconnecting...'), 'Should show Reconnecting...');

  // Healthy state
  const healthyMarkup = renderHeader({ systemStatus: 'healthy' });
  assert.ok(healthyMarkup.includes('System available'), 'Should show System available');

  // Degraded state
  const degradedMarkup = renderHeader({ systemStatus: 'degraded' });
  assert.ok(degradedMarkup.includes('Service issue'), 'Should show Service issue');

  // Offline state
  const offlineMarkup = renderHeader({ systemStatus: 'offline' });
  assert.ok(offlineMarkup.includes('Not connected'), 'Should show Not connected when confirmed offline');

  // Stale badge
  const staleMarkup = renderHeader({ systemStatus: 'healthy', isStale: true });
  assert.ok(staleMarkup.includes('Data may be stale'), 'Should show Data may be stale indicator when refreshing');
});
