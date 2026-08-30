// Deploy: supabase functions deploy phone-lookup
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getContactLookup } from "./adapters/getcontact-adapter.ts";

const cors = { "Access-Control-Allow-Origin": "https://faustroz.github.io", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" } });

function normalizePhone(value: unknown) {
  if (typeof value !== "string") return null;
  const compact = value.trim().replace(/[\s().-]/g, "");
  const normalized = compact.startsWith("0") ? `+62${compact.slice(1)}` : compact.startsWith("62") ? `+${compact}` : compact;
  return /^\+[1-9]\d{7,14}$/.test(normalized) ? normalized : null;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const authorization = request.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
  const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authorization } } });
  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user) return json({ error: "Unauthorized" }, 401);

  let body: { action?: string; phone?: unknown };
  try { body = await request.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  if (!(["profile", "tags", "quota"] as string[]).includes(body.action || "")) return json({ error: "Unsupported lookup action" }, 400);
  const action = body.action as "profile" | "tags" | "quota";
  const phone = action === "quota" ? undefined : normalizePhone(body.phone);
  if (action !== "quota" && !phone) return json({ error: "Enter one valid phone number." }, 400);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: allowed, error: rateError } = await admin.rpc("consume_phone_lookup_rate_limit", { p_user_id: user.id, p_action: action });
  if (rateError) return json({ error: "Lookup protection is unavailable." }, 503);
  if (!allowed) return json({ error: "Rate limit reached. Try again in the next 15-minute window." }, 429);

  try {
    return json({ result: await getContactLookup({ action, phone }) });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Lookup failed." }, 502);
  }
});
