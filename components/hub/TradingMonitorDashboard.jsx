"use client";

import { Activity, Database, Gauge, Network, RefreshCw, ShieldCheck, TriangleAlert } from "lucide-react";
import { calculateRateLimitRate, deriveTradingStatus } from "@/lib/hub/trading-monitor.mjs";
import { useTradingMonitor } from "@/components/hub/useTradingMonitor";

const formatUsd = (value) => typeof value === "number" ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(value) : "—";
const formatNumber = (value) => typeof value === "number" ? new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value) : "—";
const formatBytes = (value) => typeof value === "number" ? `${Math.round(value / (1024 * 1024))} MB` : "—";
const formatDuration = (milliseconds) => typeof milliseconds === "number" ? milliseconds >= 1000 ? `${(milliseconds / 1000).toFixed(1)} s` : `${Math.round(milliseconds)} ms` : "—";
const formatUptime = (seconds) => {
  if (typeof seconds !== "number") return "—";
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return [days ? `${days}d` : "", hours ? `${hours}h` : "", `${minutes}m`].filter(Boolean).join(" ");
};
const formatDateTime = (value) => value ? new Date(value).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "medium" }) : "—";
const readiness = (value, healthy = "Ready", unhealthy = "Not ready") => typeof value === "boolean" ? value ? healthy : unhealthy : "—";

function Metric({ label, value, tone }) {
  return <div className={tone ? `hub-trading-metric hub-trading-metric--${tone}` : "hub-trading-metric"}><dt>{label}</dt><dd>{value}</dd></div>;
}

function Panel({ icon: Icon, title, children, wide = false }) {
  return <section className={`hub-trading-panel${wide ? " hub-trading-panel--wide" : ""}`}><header><Icon aria-hidden="true" /><h2>{title}</h2></header>{children}</section>;
}

export default function TradingMonitorDashboard() {
  const state = useTradingMonitor();
  const metrics = state.metrics;
  const systemStatus = deriveTradingStatus(metrics);
  const visibleStatus = state.stale ? "STALE" : systemStatus;

  if (state.loading && !metrics) return <div className="hub-data-state"><RefreshCw className="hub-spin" /> READING TRADING TELEMETRY</div>;

  if (!metrics) {
    return <section className="hub-trading-unavailable" role="status"><TriangleAlert aria-hidden="true" /><div><span>OFFLINE</span><h2>Trading monitoring unavailable.</h2><p>{state.authenticated ? state.error || "No valid monitoring response is available." : "Authenticate to access this private monitoring channel."}</p></div><button type="button" onClick={state.refresh}>Retry</button></section>;
  }

  const rateLimitRate = calculateRateLimitRate(metrics.providerHttp);
  return (
    <div className="hub-trading-dashboard">
      <section className="hub-trading-overview">
        <div className="hub-trading-overview-head">
          <div><span>System status</span><strong className={`hub-trading-status hub-trading-status--${visibleStatus.toLowerCase()}`}><i aria-hidden="true" />{visibleStatus}</strong></div>
          <button type="button" onClick={state.refresh} disabled={state.refreshing}><RefreshCw className={state.refreshing ? "hub-spin" : undefined} aria-hidden="true" />{state.refreshing ? "Refreshing…" : "Refresh"}</button>
        </div>
        {state.stale && <p className="hub-trading-stale" role="status">Connection issue. Showing the last valid monitoring snapshot.</p>}
        <div className="hub-trading-mode"><span>Mode</span><strong>{metrics.mode === "PAPER" ? "PAPER TRADING" : metrics.mode || "—"}</strong><small>{metrics.mode === "PAPER" ? "Simulated execution only. Values are not real-money returns." : "Monitoring only. No execution controls are available."}</small></div>
        <dl className="hub-trading-overview-grid">
          <Metric label="Uptime" value={formatUptime(metrics.uptimeSeconds)} />
          <Metric label="Last successful cycle" value={formatDateTime(metrics.lastSuccessfulCycleAt)} />
          <Metric label="Last cycle duration" value={formatDuration(metrics.lastCycleDurationMs)} />
          <Metric label="Last updated" value={formatDateTime(state.updatedAt)} />
        </dl>
      </section>

      <div className="hub-trading-grid">
        <Panel icon={Activity} title="Paper performance">
          <dl><Metric label={metrics.mode === "PAPER" ? "Realized paper P&L" : "Realized P&L"} value={formatUsd(metrics.realizedPnlUsd)} /><Metric label="Open paper positions" value={formatNumber(metrics.openPositions)} /><Metric label="Signal proposals" value={formatNumber(metrics.signalProposals)} /><Metric label="Risk approvals" value={formatNumber(metrics.riskApprovals)} /><Metric label="Risk rejections" value={formatNumber(metrics.riskRejections)} /></dl>
        </Panel>

        <Panel icon={Network} title="Pipeline">
          <dl><Metric label="Universe eligible" value={formatNumber(metrics.universe?.eligible)} /><Metric label="Universe watch" value={formatNumber(metrics.universe?.watch)} /><Metric label="Universe reject" value={formatNumber(metrics.universe?.reject)} /><Metric label="Universe unknown" value={formatNumber(metrics.universe?.unknown)} /><Metric label="Market data" value={readiness(metrics.marketDataFresh, "Fresh", "Stale")} tone={metrics.marketDataFresh === false ? "danger" : undefined} /><Metric label="Provider" value={readiness(metrics.providerReady)} tone={metrics.providerReady === false ? "danger" : undefined} /><Metric label="Database" value={readiness(metrics.databaseReady)} tone={metrics.databaseReady === false ? "danger" : undefined} /><Metric label="Reconciliation" value={readiness(metrics.reconciliationReady)} tone={metrics.reconciliationReady === false ? "danger" : undefined} /></dl>
        </Panel>

        <Panel icon={ShieldCheck} title="Risk">
          <dl><Metric label="Daily loss latch" value={readiness(metrics.dailyLatch, "Triggered", "Inactive")} tone={metrics.dailyLatch ? "danger" : undefined} /><Metric label="Weekly drawdown latch" value={readiness(metrics.weeklyLatch, "Triggered", "Inactive")} tone={metrics.weeklyLatch ? "danger" : undefined} /></dl>
        </Panel>

        <Panel icon={Database} title="System">
          <dl><Metric label="RAM usage" value={formatBytes(metrics.rssBytes)} /><Metric label="Heap" value={formatBytes(metrics.heapUsedBytes)} /><Metric label="Cycles" value={formatNumber(metrics.cycles)} /><Metric label="Cycle failures" value={formatNumber(metrics.cycleFailures)} tone={metrics.cycleFailures > 0 ? "danger" : undefined} /><Metric label="Stale data blocks" value={formatNumber(metrics.staleDataBlocks)} tone={metrics.staleDataBlocks > 0 ? "danger" : undefined} /><Metric label="Provider failures" value={formatNumber(metrics.providerFailures)} tone={metrics.providerFailures > 0 ? "danger" : undefined} /></dl>
        </Panel>

        <Panel icon={Gauge} title="Provider HTTP" wide>
          <dl><Metric label="Requests" value={formatNumber(metrics.providerHttp?.requests)} /><Metric label="Retries" value={formatNumber(metrics.providerHttp?.retries)} /><Metric label="Rate limits" value={formatNumber(metrics.providerHttp?.rateLimits)} /><Metric label="Failures" value={formatNumber(metrics.providerHttp?.failures)} tone={metrics.providerHttp?.failures > 0 ? "danger" : undefined} /><Metric label="Rate limit rate" value={rateLimitRate === null ? "—" : `${rateLimitRate.toFixed(1)}%`} /></dl>
          <p>Operational provider telemetry only. This rate does not measure strategy quality.</p>
        </Panel>
      </div>
    </div>
  );
}
