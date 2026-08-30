// Deploy: supabase functions deploy phone-lookup
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = { "Access-Control-Allow-Origin": "https://faustroz.github.io", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" } });
type LookupAction = "profile" | "tags" | "quota";
type LookupRequest = { action: LookupAction; phone?: string };

const text = (value: unknown, limit = 160) => typeof value === "string" ? value.trim().slice(0, limit) : "";
const list = (value: unknown) => Array.isArray(value) ? value.map((item) => text(item, 100)).filter(Boolean).slice(0, 50) : [];

async function getContactLookup(request: LookupRequest) {
  const url = Deno.env.get("GETCONTACT_ADAPTER_URL");
  const token = Deno.env.get("GETCONTACT_ADAPTER_TOKEN");
  if (!url || !token) throw new Error("Phone Lookup provider is not configured.");

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "X-Adapter-Token": token,
        "Host": "lookup4allx.anjas.id",
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify(request),
    });
  } catch (error) {
    console.error("phone-lookup adapter network error", { message: error instanceof Error ? error.message : "Unknown network error" });
    throw new Error("Phone Lookup provider request failed.");
  }

  if (!response.ok) {
    const responseBody = (await response.text()).slice(0, 4_000);
    console.error("phone-lookup adapter response error", { status: response.status, body: responseBody });
    throw new Error(response.status === 429 ? "Provider quota reached." : "Phone Lookup provider request failed.");
  }

  let body: any;
  try {
    body = await response.json();
  } catch (error) {
    console.error("phone-lookup adapter response parse error", { status: response.status, message: error instanceof Error ? error.message : "Invalid JSON" });
    throw new Error("Phone Lookup provider request failed.");
  }

  if (request.action === "profile") {
    const profile = body?.profile || body?.data || body || {};
    return { kind: "profile", displayName: text(profile.displayName || profile.name), tagCount: Number(profile.tagCount || profile.tagsCount || 0) || 0, email: text(profile.email), phone: request.phone };
  }
  if (request.action === "tags") {
    const tags = list(body?.tags || body?.data?.tags || body?.data || []);
    return { kind: "tags", tags, tagCount: Number(body?.tagCount || body?.data?.tagCount || tags.length) || tags.length, phone: request.phone };
  }
  const quota = body?.quota || body?.data || body || {};
  return { kind: "quota", search: Number(quota.search || quota.searchRemaining || 0) || 0, numberDetail: Number(quota.numberDetail || quota.numberDetailRemaining || 0) || 0, resetsAt: text(quota.resetsAt || quota.resetDate, 64) };
}

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
  const action = body.action as LookupAction;
  const phone = action === "quota" ? undefined : normalizePhone(body.phone);
  if (action !== "quota" && !phone) return json({ error: "Enter one valid phone number." }, 400);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: allowed, error: rateError } = await admin.rpc("consume_phone_lookup_rate_limit", { p_user_id: user.id, p_action: action });
  if (rateError) {
    console.error("phone-lookup rate-limit RPC error", { code: rateError.code, message: rateError.message, details: rateError.details, hint: rateError.hint });
    return json({ error: "Lookup protection is unavailable." }, 503);
  }
  if (!allowed) return json({ error: "Rate limit reached. Try again in the next 15-minute window." }, 429);

  try {
    return json({ result: await getContactLookup({ action, phone }) });
  } catch (error) {
    console.error("phone-lookup adapter failure", { message: error instanceof Error ? error.message : "Lookup failed." });
    return json({ error: error instanceof Error ? error.message : "Lookup failed." }, 502);
  }
});
