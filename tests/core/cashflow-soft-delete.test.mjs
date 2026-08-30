import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("cashflow trigger refunds an expense on soft delete and reapplies it on restore", async () => {
  const sql = await readFile(new URL("../../supabase/migrations/016-cashflow-soft-delete-balance.sql", import.meta.url), "utf8");
  assert.match(sql, /old\.deleted_at is null and new\.deleted_at is not null/);
  assert.match(sql, /old\.amount\);\n    elsif old\.deleted_at is not null and new\.deleted_at is null/);
  assert.match(sql, /new\.bank_account_id, new\.bank_account_name, -new\.amount/);
  assert.match(sql, /after insert or update or delete on public\.expenses/);
});
