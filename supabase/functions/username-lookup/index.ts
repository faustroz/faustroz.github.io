// Deploy: supabase functions deploy username-lookup
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "https://faustroz.github.io",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" },
});
const proxyUrl = "https://4allx-getcontact-proxy.vercel.app/api/username";

function normalizeUsername(value: unknown) {
  if (typeof value !== "string") return null;
  const username = value.trim();
  return /^[a-zA-Z0-9](?:[a-zA-Z0-9._-]{0,62}[a-zA-Z0-9])?$/.test(username) ? username : null;
}

function clampTopSites(value: unknown) {
  if (value === undefined) return 20;
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.min(200, Math.max(5, Math.trunc(value)));
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

  let body: { username?: unknown; topSites?: unknown };
  try { body = await request.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  const username = normalizeUsername(body.username);
  const topSites = clampTopSites(body.topSites);
  if (!username) return json({ error: "Enter a valid username." }, 400);
  if (topSites === null) return json({ error: "topSites must be a number." }, 400);

  const proxyToken = Deno.env.get("GETCONTACT_PROXY_TOKEN");
  if (!proxyToken) return json({ error: "Username Intelligence provider is not configured." }, 503);

  // The deployed Python adapter accepts snake_case while the Hub public
  // contract is camelCase. Keep both names numerically identical so the
  // Vercel proxy can continue forwarding the request bytes unchanged.
  const upstreamBody = { username, topSites, top_sites: topSites };
  console.info("username-lookup request", { topSites });
  let upstream: Response;
  try {
    upstream = await fetch(proxyUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Proxy-Token": proxyToken,
      },
      body: JSON.stringify(upstreamBody),
    });
  } catch (error) {
    console.error("username-lookup proxy network error", { message: error instanceof Error ? error.message : "Unknown network error" });
    return json({ error: "Username Intelligence provider request failed." }, 502);
  }

  const responseText = await upstream.text();
  try {
    JSON.parse(responseText);
  } catch {
    console.error("username-lookup proxy response parse error", { status: upstream.status });
    return json({ error: "Username Intelligence provider returned an invalid response." }, 502);
  }

  if (!upstream.ok) console.warn("username-lookup proxy response error", { status: upstream.status });
  return new Response(responseText, {
    status: upstream.status,
    headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
});
