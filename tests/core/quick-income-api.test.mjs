import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [handler, migration, incomeLinking, balanceRepair, docs] = await Promise.all([
  readFile(new URL("../../supabase/functions/quick-expense/index.ts", import.meta.url), "utf8"),
  readFile(new URL("../../supabase/migrations/025-quick-income-api.sql", import.meta.url), "utf8"),
  readFile(new URL("../../supabase/migrations/017-income-account-provider-filter.sql", import.meta.url), "utf8"),
  readFile(new URL("../../supabase/migrations/026-exact-cashflow-account-balances.sql", import.meta.url), "utf8"),
  readFile(new URL("../../docs/apple-shortcuts-quick-expense.md", import.meta.url), "utf8"),
]);

test("Quick Income reuses device authentication and exact owner account matching", () => {
  assert.match(handler, /x-quick-expense-key/);
  assert.match(handler, /eq\("token_hash", await hash\(rawKey\)\)/);
  assert.match(handler, /eq\("user_id", key\.user_id\)\.eq\("bank_name", account\)/);
  assert.match(handler, /in\("kind", \[transactionType, "both"\]\)/);
  assert.match(migration, /where id = p_bank_account_id[\s\S]*user_id = p_user_id/);
});

test("Quick Income is atomic and replay-safe through the existing Finance trigger", () => {
  assert.match(migration, /transaction_type in \('expense', 'income'\)/);
  assert.match(migration, /on conflict \(user_id, request_hash\) do nothing/);
  assert.match(migration, /join public\.income_entries income on income\.id = requests\.income_id/);
  assert.match(migration, /insert into public\.income_entries/);
  assert.match(migration, /bank_account_id/);
  assert.match(incomeLinking, /sync_income_bank_balance after insert or update or delete/);
  assert.match(balanceRepair, /new\.bank_account_id, new\.bank_account_name, new\.amount/);
  assert.doesNotMatch(balanceRepair.match(/elsif tg_table_name = 'income_entries' then([\s\S]*?)end if;\n  end if;/)?.[1] || "", /, null,/);
});

test("legacy Expense remains the default and both payloads are documented", () => {
  assert.match(handler, /body\.type === undefined \? "expense"/);
  assert.match(handler, /transactionType === "expense" \? json\(\{ expense: transaction \}/);
  assert.match(docs, /"type": "expense"/);
  assert.match(docs, /"type": "income"/);
  assert.match(docs, /request without `type` is treated as `expense`/);
});
