import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Quick transaction API keeps device keys hashed and writes only owner-scoped finance data", async () => {
  const [schema, linkingSchema, incomeSchema, handler, config] = await Promise.all([
    readFile(new URL("../../supabase/migrations/014-quick-expense-api.sql", import.meta.url), "utf8"),
    readFile(new URL("../../supabase/migrations/015-expense-account-linking.sql", import.meta.url), "utf8"),
    readFile(new URL("../../supabase/migrations/025-quick-income-api.sql", import.meta.url), "utf8"),
    readFile(new URL("../../supabase/functions/quick-expense/index.ts", import.meta.url), "utf8"),
    readFile(new URL("../../supabase/config.toml", import.meta.url), "utf8"),
  ]);
  assert.match(schema, /token_hash text not null unique/);
  assert.match(schema, /enable row level security/);
  assert.match(schema, /auth\.uid\(\) = user_id/);
  assert.match(handler, /SHA-256/);
  assert.match(handler, /x-quick-expense-key/);
  assert.match(config, /\[functions\.quick-expense\][\s\S]*verify_jwt = false/);
  assert.match(handler, /eq\("user_id", key\.user_id\)/);
  assert.match(handler, /eq\("bank_name", account\)/);
  assert.match(handler, /body\.type === undefined \? "expense"/);
  assert.match(handler, /"create_quick_expense" : "create_quick_income"/);
  assert.match(handler, /p_bank_account_id: accountRows\[0\]\.id/);
  assert.match(linkingSchema, /bank_account_id uuid references public\.bank_accounts\(id\)/);
  assert.match(linkingSchema, /unique \(user_id, request_hash\)/);
  assert.match(linkingSchema, /after insert or update or delete on public\.expenses/);
  assert.match(incomeSchema, /create or replace function public\.create_quick_income/);
  assert.match(handler, /device_timestamp/);
  assert.doesNotMatch(handler, /SUPABASE_SERVICE_ROLE_KEY\).*return/);
});
