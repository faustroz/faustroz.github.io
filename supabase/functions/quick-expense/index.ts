// Deploy: supabase functions deploy quick-expense --no-verify-jwt
// This function accepts either a normal Supabase user JWT (to issue/revoke a
// device key) or a scoped iPhone device key (to create an expense). Gateway
// JWT verification is disabled because Shortcuts uses the latter; this handler
// authenticates both flows explicitly before any database write.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "https://faustroz.github.io",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-quick-expense-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
const encoder = new TextEncoder();
const maxAmount = 999_999_999_999.99;

const hash = async (value: string) => [...new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value)))].map((byte) => byte.toString(16).padStart(2, "0")).join("");
const token = () => [...crypto.getRandomValues(new Uint8Array(32))].map((byte) => byte.toString(16).padStart(2, "0")).join("");
const cleanText = (value: unknown, limit: number) => typeof value === "string" ? value.trim().replace(/\s+/g, " ").slice(0, limit) : "";

function expenseDate(value: unknown) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T/.test(value) || Number.isNaN(Date.parse(value))) return null;
  const date = value.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null;
}

function expenseAmount(value: unknown) {
  const amount = typeof value === "number" ? value : typeof value === "string" && /^\d+(\.\d{1,2})?$/.test(value.trim()) ? Number(value) : Number.NaN;
  return Number.isFinite(amount) && amount > 0 && amount <= maxAmount ? amount : null;
}

function userClient(request: Request) {
  const authorization = request.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) return null;
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authorization } } });
}

async function authenticatedUser(request: Request) {
  const client = userClient(request);
  if (!client) return null;
  const { data: { user }, error } = await client.auth.getUser();
  return error || !user ? null : { client, user };
}

async function issueKey(request: Request, body: Record<string, unknown>) {
  const session = await authenticatedUser(request);
  if (!session) return json({ error: "Unauthorized" }, 401);
  const rawKey = token();
  const label = cleanText(body.label, 80) || "iPhone Shortcut";
  const { data, error } = await session.client.from("quick_expense_api_keys").insert({ token_hash: await hash(rawKey), label }).select("id,label,created_at").single();
  if (error) return json({ error: "Unable to issue device key" }, 400);
  // Return the raw key only once. The database stores only its hash.
  return json({ key: rawKey, key_id: data.id, label: data.label, created_at: data.created_at }, 201);
}

async function revokeKey(request: Request, body: Record<string, unknown>) {
  const session = await authenticatedUser(request);
  const keyId = cleanText(body.key_id, 36);
  if (!session) return json({ error: "Unauthorized" }, 401);
  if (!/^[0-9a-f-]{36}$/i.test(keyId)) return json({ error: "Invalid key id" }, 400);
  const { error } = await session.client.from("quick_expense_api_keys").update({ revoked_at: new Date().toISOString() }).eq("id", keyId);
  return error ? json({ error: "Unable to revoke device key" }, 400) : json({ revoked: true });
}

async function createExpense(request: Request, body: Record<string, unknown>) {
  const rawKey = request.headers.get("x-quick-expense-key")?.trim();
  if (!rawKey || rawKey.length !== 64) return json({ error: "Unauthorized" }, 401);

  const category = cleanText(body.category, 80);
  const account = cleanText(body.account, 120);
  const amount = expenseAmount(body.amount);
  const spentOn = expenseDate(body.device_timestamp);
  if (!category || !account || amount === null || !spentOn) return json({ error: "category, amount, account, and device_timestamp are required" }, 400);

  // Service role is server-only. It is used only after authenticating the
  // scoped device key, and every lookup/write is explicitly bound to user_id.
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: key } = await admin.from("quick_expense_api_keys").select("id,user_id,expires_at").eq("token_hash", await hash(rawKey)).is("revoked_at", null).maybeSingle();
  if (!key || (key.expires_at && new Date(key.expires_at).getTime() <= Date.now())) return json({ error: "Unauthorized" }, 401);

  const [{ data: categoryRow }, { data: accountRow }] = await Promise.all([
    admin.from("finance_categories").select("id").eq("user_id", key.user_id).eq("name", category).in("kind", ["expense", "both"]).maybeSingle(),
    admin.from("bank_accounts").select("id").eq("user_id", key.user_id).eq("name", account).maybeSingle(),
  ]);
  if (!categoryRow && category !== "General") return json({ error: "Unknown expense category" }, 400);
  if (!accountRow) return json({ error: "Unknown bank account" }, 400);

  const { data: expense, error } = await admin.from("expenses").insert({
    user_id: key.user_id,
    title: `Quick expense / ${category}`,
    amount,
    category,
    bank_account_name: account,
    spent_on: spentOn,
    notes: `iPhone Back Tap · ${body.device_timestamp}`,
  }).select("id,title,amount,category,bank_account_name,spent_on").single();
  if (error) return json({ error: "Unable to save expense" }, 400);
  await admin.from("quick_expense_api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", key.id);
  return json({ expense }, 201);
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  const action = body.action;
  if (action === "issue_key") return issueKey(request, body);
  if (action === "revoke_key") return revokeKey(request, body);
  return createExpense(request, body);
});
