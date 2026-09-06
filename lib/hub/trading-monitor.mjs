/**
 * @typedef {Object} TradingMonitorMetrics
 * @property {number=} uptimeSeconds
 * @property {number=} rssBytes
 * @property {number=} heapUsedBytes
 * @property {number=} cycles
 * @property {number=} cycleFailures
 * @property {string=} lastSuccessfulCycleAt
 * @property {number=} lastCycleDurationMs
 * @property {number=} staleDataBlocks
 * @property {number=} providerFailures
 * @property {{eligible?: number, watch?: number, reject?: number, unknown?: number}=} universe
 * @property {number=} signalProposals
 * @property {number=} riskApprovals
 * @property {number=} riskRejections
 * @property {boolean=} providerReady
 * @property {boolean=} marketDataFresh
 * @property {boolean=} reconciliationReady
 * @property {boolean=} databaseReady
 * @property {string=} mode
 * @property {number=} openPositions
 * @property {number=} realizedPnlUsd
 * @property {boolean=} dailyLatch
 * @property {boolean=} weeklyLatch
 * @property {{requests?: number, retries?: number, rateLimits?: number, failures?: number}=} providerHttp
 * @property {{ready: boolean, providerReady: boolean, marketDataFresh: boolean, financialStateReady: boolean, recoveryComplete: boolean, orchestratorReady: boolean, entryPermission: boolean, databaseReady?: boolean, reconciliationReady?: boolean}=} currentHealth
 */

const nonNegativeNumbers = [
  "uptimeSeconds", "rssBytes", "heapUsedBytes", "cycles", "cycleFailures",
  "lastCycleDurationMs", "staleDataBlocks", "providerFailures", "signalProposals",
  "riskApprovals", "riskRejections", "openPositions",
];
const booleans = ["providerReady", "marketDataFresh", "reconciliationReady", "databaseReady", "dailyLatch", "weeklyLatch"];
const nestedCounts = Object.freeze({
  universe: ["eligible", "watch", "reject", "unknown"],
  providerHttp: ["requests", "retries", "rateLimits", "failures"],
});
const currentHealthRequired = [
  "ready", "providerReady", "marketDataFresh", "financialStateReady",
  "recoveryComplete", "orchestratorReady", "entryPermission",
];
const currentHealthOptional = ["databaseReady", "reconciliationReady"];

// The Hub refreshes every 30 seconds. Two minutes permits transient network
// jitter while making an old successful cycle explicit instead of silently
// presenting it as current operational health.
export const monitoringStaleAfterMs = 120_000;

const isRecord = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const validNonNegative = (value) => typeof value === "number" && Number.isFinite(value) && value >= 0;

export function parseTradingMetrics(input) {
  if (!isRecord(input)) throw new Error("Invalid trading monitoring response.");
  const metrics = {};

  for (const field of nonNegativeNumbers) {
    if (validNonNegative(input[field])) metrics[field] = input[field];
  }
  if (typeof input.realizedPnlUsd === "number" && Number.isFinite(input.realizedPnlUsd)) metrics.realizedPnlUsd = input.realizedPnlUsd;
  for (const field of booleans) {
    if (typeof input[field] === "boolean") metrics[field] = input[field];
  }

  if (typeof input.lastSuccessfulCycleAt === "string" && !Number.isNaN(Date.parse(input.lastSuccessfulCycleAt))) {
    metrics.lastSuccessfulCycleAt = input.lastSuccessfulCycleAt;
  }
  if (typeof input.mode === "string" && /^[A-Z0-9_-]{1,24}$/.test(input.mode.trim().toUpperCase())) {
    metrics.mode = input.mode.trim().toUpperCase();
  }

  for (const [group, fields] of Object.entries(nestedCounts)) {
    if (!isRecord(input[group])) continue;
    const sanitized = Object.fromEntries(fields.filter((field) => validNonNegative(input[group][field])).map((field) => [field, input[group][field]]));
    if (Object.keys(sanitized).length) metrics[group] = sanitized;
  }

  if (Object.hasOwn(input, "currentHealth")) {
    if (!isRecord(input.currentHealth)
      || !currentHealthRequired.every((field) => typeof input.currentHealth[field] === "boolean")) {
      throw new Error("Invalid trading monitoring response.");
    }
    metrics.currentHealth = Object.fromEntries([
      ...currentHealthRequired,
      ...currentHealthOptional.filter((field) => typeof input.currentHealth[field] === "boolean"),
    ].map((field) => [field, input.currentHealth[field]]));

    // Keep existing dashboard fields current without allowing stale legacy
    // flags to override an authoritative current-health snapshot.
    metrics.providerReady = metrics.currentHealth.providerReady;
    metrics.marketDataFresh = metrics.currentHealth.marketDataFresh;
    metrics.databaseReady = metrics.currentHealth.databaseReady ?? metrics.currentHealth.financialStateReady;
    metrics.reconciliationReady = metrics.currentHealth.reconciliationReady ?? metrics.currentHealth.recoveryComplete;
  }

  const required = ["providerReady", "marketDataFresh", "reconciliationReady", "databaseReady", "mode"];
  if (!required.every((field) => Object.hasOwn(metrics, field))) throw new Error("Invalid trading monitoring response.");
  return metrics;
}

export function isMonitoringSnapshotStale(metrics, now = Date.now()) {
  if (!metrics?.lastSuccessfulCycleAt) return true;
  const completedAt = Date.parse(metrics.lastSuccessfulCycleAt);
  return Number.isNaN(completedAt) || now - completedAt > monitoringStaleAfterMs;
}

export function deriveTradingStatus(metrics, now = Date.now()) {
  if (!metrics) return "OFFLINE";
  if (isMonitoringSnapshotStale(metrics, now)) return "STALE";

  if (metrics.currentHealth) {
    const current = metrics.currentHealth;
    const criticalReady = current.ready === true
      && current.providerReady === true
      && current.marketDataFresh === true
      && current.financialStateReady === true
      && current.recoveryComplete === true
      && current.orchestratorReady === true
      && current.entryPermission === true
      && current.databaseReady !== false
      && current.reconciliationReady !== false;
    return criticalReady ? "ONLINE" : "DEGRADED";
  }

  // Safe rollout fallback for trading-service versions that predate
  // `currentHealth`: retain the former legacy classifier unchanged.
  const ready = metrics.providerReady === true
    && metrics.marketDataFresh === true
    && metrics.databaseReady === true
    && metrics.reconciliationReady === true;
  return ready && metrics.cycleFailures === 0 ? "ONLINE" : "DEGRADED";
}

export function calculateRateLimitRate(providerHttp) {
  if (!providerHttp || !validNonNegative(providerHttp.requests) || !validNonNegative(providerHttp.rateLimits)) return null;
  return providerHttp.requests > 0 ? (providerHttp.rateLimits / providerHttp.requests) * 100 : 0;
}

export function tradingMonitorSuccess(metrics, updatedAt = new Date().toISOString()) {
  return { loading: false, refreshing: false, authenticated: true, metrics, stale: false, error: "", updatedAt };
}

export function tradingMonitorFailure(previous, message) {
  return { ...previous, loading: false, refreshing: false, stale: Boolean(previous.metrics), error: message || "Trading monitor is unavailable." };
}

export function createTradingMonitorService(client) {
  if (!client?.auth || !client?.functions) throw new Error("A Supabase client is required.");
  return {
    async load() {
      const { data: sessionData, error: sessionError } = await client.auth.getSession();
      if (sessionError) throw sessionError;
      if (!sessionData.session) return { authenticated: false, metrics: null };

      const { data, error } = await client.functions.invoke("trading-monitor", { body: { action: "metrics" } });
      if (error) {
        const requestError = new Error("Trading monitor could not be reached.");
        requestError.authenticated = true;
        throw requestError;
      }
      try {
        return { authenticated: true, metrics: parseTradingMetrics(data?.metrics) };
      } catch {
        const responseError = new Error("Trading monitor returned an invalid response.");
        responseError.authenticated = true;
        throw responseError;
      }
    },
  };
}

export const initialTradingMonitorState = Object.freeze({
  loading: true,
  refreshing: false,
  authenticated: false,
  metrics: null,
  stale: false,
  error: "",
  updatedAt: null,
});
