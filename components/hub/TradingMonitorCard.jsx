"use client";

import Link from "next/link";
import { ArrowUpRight, RadioTower } from "lucide-react";
import { deriveTradingStatus } from "@/lib/hub/trading-monitor.mjs";
import { useTradingMonitor } from "@/components/hub/useTradingMonitor";

const formatUsd = (value) => typeof value === "number"
  ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(value)
  : "—";
const valueOrDash = (value) => typeof value === "number" ? new Intl.NumberFormat("en-US").format(value) : "—";

export default function TradingMonitorCard() {
  const state = useTradingMonitor();
  const metrics = state.metrics;
  const status = state.stale ? "STALE" : deriveTradingStatus(metrics);
  const displayStatus = state.loading ? "CHECKING" : state.authenticated ? status : "PRIVATE";

  return (
    <Link href="/trading" className="hub-trading-card" aria-label="Open Trading System monitoring">
      <div className="hub-trading-card-head">
        <div><RadioTower aria-hidden="true" /><span>Trading System</span></div>
        <div><span className={`hub-trading-status hub-trading-status--${displayStatus.toLowerCase()}`}><i aria-hidden="true" />{displayStatus}</span><strong>{metrics?.mode || "—"}</strong></div>
      </div>

      {metrics ? (
        <div className="hub-trading-card-metrics">
          <div className="hub-trading-card-primary"><span>{metrics.mode === "PAPER" ? "Realized paper P&L" : "Realized P&L"}</span><strong>{formatUsd(metrics.realizedPnlUsd)}</strong></div>
          <dl>
            <div><dt>Positions</dt><dd>{valueOrDash(metrics.openPositions)}</dd></div>
            <div><dt>Signals</dt><dd>{valueOrDash(metrics.signalProposals)}</dd></div>
            <div><dt>Cycles</dt><dd>{valueOrDash(metrics.cycles)}</dd></div>
            <div><dt>Market</dt><dd>{typeof metrics.marketDataFresh === "boolean" ? metrics.marketDataFresh ? "Fresh" : "Stale" : "—"}</dd></div>
            <div><dt>Provider</dt><dd>{typeof metrics.providerReady === "boolean" ? metrics.providerReady ? "Ready" : "Not ready" : "—"}</dd></div>
          </dl>
        </div>
      ) : (
        <div className="hub-trading-card-empty">
          <strong>{state.loading ? "Checking monitoring channel…" : state.authenticated ? "Monitoring unavailable." : "Authenticate to view monitoring."}</strong>
          <span>No trading controls or private upstream details are exposed here.</span>
        </div>
      )}

      <div className="hub-trading-card-action"><span>Open monitoring</span><ArrowUpRight aria-hidden="true" /></div>
    </Link>
  );
}
