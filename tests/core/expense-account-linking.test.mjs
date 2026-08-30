import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { FINANCE_CHANNELS } from "../../lib/hub/module-config.mjs";

test("manual and Quick Expense writes use the exact bank account id with an atomic balance trigger", async () => {
  const sql = await readFile(new URL("../../supabase/migrations/015-expense-account-linking.sql", import.meta.url), "utf8");
  const manualAccount = FINANCE_CHANNELS.find(({ id }) => id === "expenses").fields.find(({ name }) => name === "bank_account_id");
  assert.equal(manualAccount.lookup.value, "id");
  assert.equal(manualAccount.displayLookupLabel, true);
  assert.match(sql, /where id = p_account_id and user_id = p_user_id/);
  assert.match(sql, /where id = p_bank_account_id and user_id = p_user_id/);
  assert.match(sql, /create or replace function public\.create_quick_expense/);
  assert.match(sql, /insert into public\.expenses/);
  assert.match(sql, /unique \(user_id, request_hash\)/);
  assert.match(sql, /after insert or update or delete on public\.expenses/);
});
