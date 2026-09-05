"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createTradingMonitorService, initialTradingMonitorState, tradingMonitorFailure, tradingMonitorSuccess } from "@/lib/hub/trading-monitor.mjs";
import { supabase } from "@/lib/supabase/client";

const refreshIntervalMs = 30_000;

export function useTradingMonitor() {
  const service = useMemo(() => (supabase ? createTradingMonitorService(supabase) : null), []);
  const [state, setState] = useState(initialTradingMonitorState);
  const inFlight = useRef(false);
  const mounted = useRef(true);

  const refresh = useCallback(async () => {
    if (!service || inFlight.current) return;
    inFlight.current = true;
    setState((current) => ({ ...current, loading: !current.metrics, refreshing: Boolean(current.metrics) }));

    try {
      const result = await service.load();
      if (!mounted.current) return;
      if (!result.authenticated) {
        setState({ ...initialTradingMonitorState, loading: false });
      } else {
        setState(tradingMonitorSuccess(result.metrics));
      }
    } catch (error) {
      if (mounted.current) setState((current) => tradingMonitorFailure(
        error?.authenticated ? { ...current, authenticated: true } : current,
        error instanceof Error ? error.message : "Trading monitor is unavailable."
      ));
    } finally {
      inFlight.current = false;
    }
  }, [service]);

  useEffect(() => {
    mounted.current = true;
    refresh();
    const interval = window.setInterval(() => {
      if (!document.hidden) refresh();
    }, refreshIntervalMs);
    const onVisibilityChange = () => {
      if (!document.hidden) refresh();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      mounted.current = false;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [refresh]);

  return { ...state, refresh };
}
