// Deploy: supabase functions deploy quick-expense --no-verify-jwt
// This function accepts either a normal Supabase user JWT (to issue/revoke a
// device key) or a scoped iPhone device key (to create a transaction). Gateway
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

function transactionDate(value: unknown) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T/.test(value) || Number.isNaN(Date.parse(value))) return null;
  const date = value.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null;
}

function transactionAmount(value: unknown) {
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

async function createTransaction(request: Request, body: Record<string, unknown>) {
  const rawKey = request.headers.get("x-quick-expense-key")?.trim();
  if (!rawKey || rawKey.length !== 64) return json({ error: "Unauthorized" }, 401);

  // Omitting type remains a legacy Quick Expense request.
  const transactionType = body.type === undefined ? "expense" : cleanText(body.type, 16).toLowerCase();
  const title = cleanText(body.title, 160);
  const category = cleanText(body.category, 80);
  const account = cleanText(body.account, 120);
  const amount = transactionAmount(body.amount);
  const occurredOn = transactionDate(body.device_timestamp);
  if (!(transactionType === "expense" || transactionType === "income")) return json({ error: "type must be expense or income" }, 400);
  if (!title || !category || !account || amount === null || !occurredOn) return json({ error: "title, category, amount, account, and device_timestamp are required" }, 400);

  // Service role is server-only. Every lookup and RPC input is explicitly
  // scoped to the user authenticated by the hashed, revocable device key.
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: key } = await admin.from("quick_expense_api_keys").select("id,user_id,expires_at").eq("token_hash", await hash(rawKey)).is("revoked_at", null).maybeSingle();
  if (!key || (key.expires_at && new Date(key.expires_at).getTime() <= Date.now())) return json({ error: "Unauthorized" }, 401);

  const [{ data: categoryRow }, { data: accountRows }] = await Promise.all([
    admin.from("finance_categories").select("id").eq("user_id", key.user_id).eq("name", category).in("kind", [transactionType, "both"]).maybeSingle(),
    admin.from("bank_accounts").select("id").eq("user_id", key.user_id).eq("bank_name", account).is("deleted_at", null).limit(2),
  ]);
  if (!categoryRow && category !== "General") return json({ error: `Unknown ${transactionType} category` }, 400);
  if (!accountRows?.length) return json({ error: "Unknown bank account" }, 400);
  if (accountRows.length !== 1) return json({ error: "More than one bank account matches this provider" }, 409);

  // Preserve the exact legacy expense hash. Income includes its type so an
  // otherwise identical expense and income cannot share a replay key.
  const hashPayload = transactionType === "expense"
    ? { key_id: key.id, title, category, amount, account, device_timestamp: body.device_timestamp }
    : { key_id: key.id, type: "income", title, category, amount, account, device_timestamp: body.device_timestamp };
  const requestHash = await hash(JSON.stringify(hashPayload));
  const rpcName = transactionType === "expense" ? "create_quick_expense" : "create_quick_income";
  const dateParameter = transactionType === "expense" ? { p_spent_on: occurredOn } : { p_received_on: occurredOn };
  const { data: transaction, error } = await admin.rpc(rpcName, {
    p_user_id: key.user_id,
    p_device_key_id: key.id,
    p_request_hash: requestHash,
    p_title: title,
    p_amount: amount,
    p_category: category,
    p_bank_account_id: accountRows[0].id,
    ...dateParameter,
    p_notes: `iPhone Back Tap · ${body.device_timestamp}`,
  });
  if (error) return json({ error: `Unable to save ${transactionType}` }, 400);
  await admin.from("quick_expense_api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", key.id);
  return transactionType === "expense" ? json({ expense: transaction }, 201) : json({ income: transaction }, 201);
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  const action = body.action;
  if (action === "issue_key") return issueKey(request, body);
  if (action === "revoke_key") return revokeKey(request, body);
  return createTransaction(request, body);
});
