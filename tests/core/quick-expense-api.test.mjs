import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Quick Expense API keeps device keys hashed and writes only owner-scoped finance data", async () => {
  const [schema, handler, config] = await Promise.all([
    readFile(new URL("../../supabase/migrations/014-quick-expense-api.sql", import.meta.url), "utf8"),
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
  assert.match(handler, /title,/);
  assert.match(handler, /bank_account_name: accountRow\.name/);
  assert.match(handler, /from\("expenses"\)\.insert/);
  assert.match(handler, /bank_account_name: account/);
  assert.match(handler, /device_timestamp/);
  assert.doesNotMatch(handler, /SUPABASE_SERVICE_ROLE_KEY\).*return/);
});
