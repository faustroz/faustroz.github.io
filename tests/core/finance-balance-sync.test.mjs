import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("income and expense balance changes are applied by database triggers", async () => {
  const sql = await readFile(new URL("../../supabase-phase11-finance-balance-sync.sql", import.meta.url), "utf8");
  assert.match(sql, /sync_expense_bank_balance/);
  assert.match(sql, /sync_income_bank_balance/);
  assert.match(sql, /after insert or update or delete on public\.expenses/);
  assert.match(sql, /after insert or update or delete on public\.income_entries/);
  assert.match(sql, /-new\.amount/);
  assert.match(sql, /new\.amount/);
});
