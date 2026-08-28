// Deploy with: supabase functions deploy integrations
// Secrets are read only here: supabase secrets set GITHUB_TOKEN=... GOOGLE_CLIENT_ID=... GOOGLE_CLIENT_SECRET=...
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = { "Access-Control-Allow-Origin": "https://faustroz.github.io", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors });
  const auth = request.headers.get("Authorization");
  if (!auth) return json({ error: "Unauthorized" }, 401);
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
  const { data: { user }, error } = await admin.auth.getUser();
  if (error || !user) return json({ error: "Unauthorized" }, 401);
  const { provider, action = "status" } = await request.json();
  if (!["github", "google_calendar"].includes(provider)) return json({ error: "Unsupported provider" }, 400);
  // Never return provider keys/tokens. This endpoint intentionally exposes status only
  // until an OAuth callback flow is configured for the provider.
  const configured = Boolean(provider === "github" ? Deno.env.get("GITHUB_TOKEN") : Deno.env.get("GOOGLE_CLIENT_ID") && Deno.env.get("GOOGLE_CLIENT_SECRET"));
  if (action !== "status") return json({ error: "Provider action requires configured OAuth/callback deployment." }, 409);
  return json({ provider, configured, userId: user.id });
});
