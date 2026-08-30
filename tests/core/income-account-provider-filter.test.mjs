import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { FINANCE_CHANNELS } from "../../lib/hub/module-config.mjs";

test("Income uses exact bank account ids and keeps balance synchronization compatible", async () => {
  const sql = await readFile(new URL("../../supabase/migrations/017-income-account-provider-filter.sql", import.meta.url), "utf8");
  const income = FINANCE_CHANNELS.find(({ id }) => id === "income");
  assert.equal(income.fields.find(({ label }) => label.startsWith("Received to")).name, "bank_account_id");
  assert.match(sql, /add column if not exists bank_account_id uuid references public\.bank_accounts\(id\)/);
  assert.match(sql, /resolve_income_bank_account/);
  assert.match(sql, /new\.bank_account_id, new\.bank_account_name, new\.amount/);
});
