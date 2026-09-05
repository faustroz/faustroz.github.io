// Deploy: supabase functions deploy trading-monitor
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "https://faustroz.github.io",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const responseHeaders = { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: responseHeaders });
const timeoutMs = 8_000;
const maximumBodyLength = 65_536;
const readinessFields = ["providerReady", "marketDataFresh", "reconciliationReady", "databaseReady"] as const;
const nonNegativeFields = ["uptimeSeconds", "rssBytes", "heapUsedBytes", "cycles", "cycleFailures", "lastCycleDurationMs", "staleDataBlocks", "providerFailures", "signalProposals", "riskApprovals", "riskRejections", "openPositions"] as const;

type JsonRecord = Record<string, unknown>;
const isRecord = (value: unknown): value is JsonRecord => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const validNonNegative = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value) && value >= 0;

function sanitizeMetrics(input: unknown) {
  if (!isRecord(input)) throw new Error("schema");
  const output: JsonRecord = {};

  for (const field of nonNegativeFields) if (validNonNegative(input[field])) output[field] = input[field];
  if (typeof input.realizedPnlUsd === "number" && Number.isFinite(input.realizedPnlUsd)) output.realizedPnlUsd = input.realizedPnlUsd;
  for (const field of [...readinessFields, "dailyLatch", "weeklyLatch"]) if (typeof input[field] === "boolean") output[field] = input[field];
  if (typeof input.lastSuccessfulCycleAt === "string" && !Number.isNaN(Date.parse(input.lastSuccessfulCycleAt))) output.lastSuccessfulCycleAt = input.lastSuccessfulCycleAt;
  if (typeof input.mode === "string" && /^[A-Z0-9_-]{1,24}$/.test(input.mode.trim().toUpperCase())) output.mode = input.mode.trim().toUpperCase();

  for (const [group, fields] of Object.entries({ universe: ["eligible", "watch", "reject", "unknown"], providerHttp: ["requests", "retries", "rateLimits", "failures"] })) {
    const sourceGroup = input[group];
    if (!isRecord(sourceGroup)) continue;
    const nested: JsonRecord = {};
    for (const field of fields) if (validNonNegative(sourceGroup[field])) nested[field] = sourceGroup[field];
    if (Object.keys(nested).length) output[group] = nested;
  }

  if (!readinessFields.every((field) => typeof output[field] === "boolean") || typeof output.mode !== "string") throw new Error("schema");
  return output;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authorization = request.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authorization } } },
  );
  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user) return json({ error: "Unauthorized" }, 401);

  let body: { action?: unknown };
  try { body = await request.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  if (body.action !== "metrics") return json({ error: "Unsupported monitoring action" }, 400);

  const configuredUrl = Deno.env.get("TRADING_MONITOR_URL");
  let upstreamUrl: URL;
  try {
    upstreamUrl = new URL(configuredUrl || "");
    if (!["http:", "https:"].includes(upstreamUrl.protocol)) throw new Error("protocol");
  } catch {
    return json({ error: "Trading monitoring is not configured." }, 503);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  let upstream: Response;
  try {
    const token = Deno.env.get("TRADING_MONITOR_TOKEN");
    upstream = await fetch(upstreamUrl, {
      method: "GET",
      headers: { "Accept": "application/json", ...(token ? { "Authorization": `Bearer ${token}` } : {}) },
      signal: controller.signal,
    });
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "AbortError";
    console.error("trading-monitor upstream request failed", { kind: timedOut ? "timeout" : "network" });
    return json({ error: timedOut ? "Trading monitoring request timed out." : "Trading monitoring upstream is unavailable." }, timedOut ? 504 : 502);
  } finally {
    clearTimeout(timeout);
  }

  if (!upstream.ok) {
    console.warn("trading-monitor upstream response rejected", { status: upstream.status });
    return json({ error: "Trading monitoring upstream returned an error." }, 502);
  }

  const responseText = await upstream.text();
  if (responseText.length > maximumBodyLength) {
    console.warn("trading-monitor upstream response rejected", { reason: "body-too-large" });
    return json({ error: "Trading monitoring returned an invalid response." }, 502);
  }

  let rawMetrics: unknown;
  try { rawMetrics = JSON.parse(responseText); } catch {
    console.warn("trading-monitor upstream response rejected", { reason: "malformed-json" });
    return json({ error: "Trading monitoring returned malformed data." }, 502);
  }

  try {
    return json({ metrics: sanitizeMetrics(rawMetrics) });
  } catch {
    console.warn("trading-monitor upstream response rejected", { reason: "unexpected-schema" });
    return json({ error: "Trading monitoring returned an unexpected response." }, 502);
  }
});
