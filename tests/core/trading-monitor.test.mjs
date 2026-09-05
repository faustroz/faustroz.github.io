import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  calculateRateLimitRate,
  createTradingMonitorService,
  deriveTradingStatus,
  parseTradingMetrics,
  tradingMonitorFailure,
} from "../../lib/hub/trading-monitor.mjs";

const validMetrics = {
  uptimeSeconds: 130.126,
  rssBytes: 112185344,
  heapUsedBytes: 23981984,
  cycles: 6,
  cycleFailures: 0,
  lastSuccessfulCycleAt: "2026-09-05T13:43:45.445Z",
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

test("valid monitoring data is sanitized without losing legitimate zero values", () => {
  const metrics = parseTradingMetrics({ ...validMetrics, ignoredSecret: "never-return-this" });
  assert.equal(metrics.realizedPnlUsd, 0);
  assert.equal(metrics.openPositions, 0);
  assert.equal(metrics.universe.watch, 0);
  assert.equal(metrics.ignoredSecret, undefined);
  assert.equal(deriveTradingStatus(metrics), "ONLINE");
});

test("readiness failures produce DEGRADED without judging trading quality", () => {
  assert.equal(deriveTradingStatus({ ...validMetrics, marketDataFresh: false }), "DEGRADED");
  assert.equal(deriveTradingStatus({ ...validMetrics, cycleFailures: 1 }), "DEGRADED");
  assert.equal(deriveTradingStatus(null), "OFFLINE");
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
  assert.match(source, /Deno\.env\.get\("TRADING_MONITOR_URL"\)/);
  assert.match(source, /Deno\.env\.get\("TRADING_MONITOR_TOKEN"\)/);
  assert.doesNotMatch(source, /NEXT_PUBLIC_TRADING/);
});

test("monitoring polling is immediate, visibility-aware, and overlap-safe", async () => {
  const source = await readFile(new URL("../../components/hub/useTradingMonitor.js", import.meta.url), "utf8");
  assert.match(source, /const refreshIntervalMs = 30_000/);
  assert.match(source, /if \(!document\.hidden\) refresh\(\)/);
  assert.match(source, /visibilitychange/);
  assert.match(source, /if \(!service \|\| inFlight\.current\) return/);
  assert.match(source, /refresh\(\);/);
});
