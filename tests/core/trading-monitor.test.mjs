import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  calculateRateLimitRate,
  createTradingMonitorService,
  deriveTradingStatus,
  isMonitoringSnapshotStale,
  monitoringStaleAfterMs,
  parseTradingMetrics,
  tradingMonitorFailure,
} from "../../lib/hub/trading-monitor.mjs";

const now = Date.now();
const validMetrics = {
  uptimeSeconds: 130.126,
  rssBytes: 112185344,
  heapUsedBytes: 23981984,
  cycles: 6,
  cycleFailures: 0,
  lastSuccessfulCycleAt: new Date(now - 1_000).toISOString(),
  lastCycleDurationMs: 8026,
  staleDataBlocks: 0,
  providerFailures: 0,
  universe: { eligible: 6, watch: 0, reject: 0, unknown: 0 },
  signalProposals: 0,
  riskApprovals: 0,
  riskRejections: 0,
  providerReady: true,
  marketDataFresh: true,
  reconciliationReady: true,
  databaseReady: true,
  mode: "PAPER",
  openPositions: 0,
  realizedPnlUsd: 0,
  dailyLatch: false,
  weeklyLatch: false,
  providerHttp: { requests: 96, retries: 39, rateLimits: 39, failures: 0 },
};
const healthyCurrentHealth = {
  ready: true,
  providerReady: true,
  marketDataFresh: true,
  financialStateReady: true,
  recoveryComplete: true,
  orchestratorReady: true,
  entryPermission: true,
};

test("valid monitoring data is sanitized without losing legitimate zero values", () => {
  const metrics = parseTradingMetrics({ ...validMetrics, ignoredSecret: "never-return-this" });
  assert.equal(metrics.realizedPnlUsd, 0);
  assert.equal(metrics.openPositions, 0);
  assert.equal(metrics.universe.watch, 0);
  assert.equal(metrics.ignoredSecret, undefined);
  assert.equal(deriveTradingStatus(metrics), "ONLINE");
});

test("legacy fallback preserves the former conservative readiness classifier", () => {
  assert.equal(deriveTradingStatus({ ...validMetrics, marketDataFresh: false }), "DEGRADED");
  assert.equal(deriveTradingStatus({ ...validMetrics, cycleFailures: 1 }), "DEGRADED");
  assert.equal(deriveTradingStatus(null), "OFFLINE");
});

test("A and I: healthy currentHealth stays ONLINE despite historical counters in PAPER mode", () => {
  const metrics = parseTradingMetrics({
    ...validMetrics,
    mode: "PAPER",
    cycleFailures: 7,
    providerFailures: 3,
    staleDataBlocks: 4,
    providerHttp: { requests: 20, retries: 8, rateLimits: 2, failures: 2, recoveries: 2, providersInCooldown: 0 },
    currentHealth: healthyCurrentHealth,
  });
  assert.equal(metrics.providerHttp.recoveries, undefined);
  assert.equal(deriveTradingStatus(metrics, now), "ONLINE");
});

test("B through E: unhealthy current readiness conditions are DEGRADED", () => {
  assert.equal(deriveTradingStatus(parseTradingMetrics({ ...validMetrics, currentHealth: { ...healthyCurrentHealth, providerReady: false } }), now), "DEGRADED");
  assert.equal(deriveTradingStatus(parseTradingMetrics({ ...validMetrics, currentHealth: { ...healthyCurrentHealth, marketDataFresh: false } }), now), "DEGRADED");
  assert.equal(deriveTradingStatus(parseTradingMetrics({ ...validMetrics, currentHealth: { ...healthyCurrentHealth, databaseReady: false } }), now), "DEGRADED");
  assert.equal(deriveTradingStatus(parseTradingMetrics({ ...validMetrics, currentHealth: { ...healthyCurrentHealth, reconciliationReady: false } }), now), "DEGRADED");
});

test("F: an old successful cycle is STALE", () => {
  const staleMetrics = parseTradingMetrics({
    ...validMetrics,
    lastSuccessfulCycleAt: new Date(now - monitoringStaleAfterMs - 1).toISOString(),
    currentHealth: healthyCurrentHealth,
  });
  assert.equal(isMonitoringSnapshotStale(staleMetrics, now), true);
  assert.equal(deriveTradingStatus(staleMetrics, now), "STALE");
});

test("G: no usable Raznar response remains OFFLINE", () => {
  const next = tradingMonitorFailure({ loading: true, refreshing: false, authenticated: true, metrics: null, stale: false, error: "", updatedAt: null }, "Upstream unavailable");
  assert.equal(deriveTradingStatus(next.metrics, now), "OFFLINE");
  assert.equal(next.stale, false);
});

test("H: malformed currentHealth fails safely and can never be ONLINE", () => {
  assert.throws(() => parseTradingMetrics({ ...validMetrics, currentHealth: { ...healthyCurrentHealth, recoveryComplete: "yes" } }), /Invalid trading monitoring response/);
});

test("malformed and unexpected monitoring payloads are rejected", () => {
  assert.throws(() => parseTradingMetrics("not-json"), /Invalid trading monitoring response/);
  assert.throws(() => parseTradingMetrics({ mode: "PAPER" }), /Invalid trading monitoring response/);
});

test("rate-limit rate is zero when requests are zero and absent when inputs are missing", () => {
  assert.equal(calculateRateLimitRate({ requests: 0, rateLimits: 0 }), 0);
  assert.equal(calculateRateLimitRate({ requests: 96, rateLimits: 39 }).toFixed(1), "40.6");
  assert.equal(calculateRateLimitRate({ requests: 10 }), null);
});

test("a refresh failure preserves the last valid snapshot and marks it stale", () => {
  const previous = { loading: false, refreshing: true, authenticated: true, metrics: validMetrics, stale: false, error: "", updatedAt: "2026-09-05T13:44:00.000Z" };
  const next = tradingMonitorFailure(previous, "Connection issue");
  assert.equal(next.metrics, validMetrics);
  assert.equal(next.updatedAt, previous.updatedAt);
  assert.equal(next.stale, true);
  assert.equal(next.error, "Connection issue");
});

test("unauthenticated users never invoke the private monitoring function", async () => {
  let invoked = false;
  const service = createTradingMonitorService({
    auth: { getSession: async () => ({ data: { session: null }, error: null }) },
    functions: { invoke: async () => { invoked = true; } },
  });
  assert.deepEqual(await service.load(), { authenticated: false, metrics: null });
  assert.equal(invoked, false);
});

test("authenticated frontend requests only the trading-monitor metrics action", async () => {
  let invocation;
  const service = createTradingMonitorService({
    auth: { getSession: async () => ({ data: { session: { access_token: "hidden" } }, error: null }) },
    functions: { invoke: async (...args) => { invocation = args; return { data: { metrics: validMetrics }, error: null }; } },
  });
  const result = await service.load();
  assert.equal(result.authenticated, true);
  assert.deepEqual(invocation, ["trading-monitor", { body: { action: "metrics" } }]);
});

test("Edge Function covers auth, bounded timeout, upstream errors, and schema rejection", async () => {
  const source = await readFile(new URL("../../supabase/functions/trading-monitor/index.ts", import.meta.url), "utf8");
  assert.match(source, /auth\.getUser\(\)/);
  assert.match(source, /if \(authError \|\| !user\).*Unauthorized/);
  assert.match(source, /const timeoutMs = 8_000/);
  assert.match(source, /controller\.abort\(\)/);
  assert.match(source, /timedOut \? 504 : 502/);
  assert.match(source, /malformed-json/);
  assert.match(source, /unexpected-schema/);
  assert.match(source, /sanitizeCurrentHealth/);
  assert.match(source, /currentHealthRequired/);
  assert.match(source, /Deno\.env\.get\("TRADING_MONITOR_URL"\)/);
  assert.match(source, /Deno\.env\.get\("TRADING_MONITOR_TOKEN"\)/);
  assert.doesNotMatch(source, /NEXT_PUBLIC_TRADING/);
  assert.doesNotMatch(source, /searchParams/);
});

test("monitoring polling is immediate, visibility-aware, and overlap-safe", async () => {
  const source = await readFile(new URL("../../components/hub/useTradingMonitor.js", import.meta.url), "utf8");
  assert.match(source, /const refreshIntervalMs = 30_000/);
  assert.match(source, /if \(!document\.hidden\) refresh\(\)/);
  assert.match(source, /visibilitychange/);
  assert.match(source, /if \(!service \|\| inFlight\.current\) return/);
  assert.match(source, /refresh\(\);/);
});
