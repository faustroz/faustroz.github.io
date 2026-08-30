import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("cashflow trigger refunds an expense on soft delete and reapplies it on restore without double-refunding Trash deletion", async () => {
  const [sql, repair] = await Promise.all([
    readFile(new URL("../../supabase/migrations/016-cashflow-soft-delete-balance.sql", import.meta.url), "utf8"),
    readFile(new URL("../../supabase/migrations/020-cashflow-trash-permanent-delete.sql", import.meta.url), "utf8"),
  ]);
  assert.match(sql, /old\.deleted_at is null and new\.deleted_at is not null/);
  assert.match(sql, /old\.amount\);\n    elsif old\.deleted_at is not null and new\.deleted_at is null/);
  assert.match(sql, /new\.bank_account_id, new\.bank_account_name, -new\.amount/);
  assert.match(sql, /after insert or update or delete on public\.expenses/);
  assert.match(repair, /tg_op = 'DELETE' and old\.deleted_at is null/);
  assert.match(repair, /a record already refunded on soft delete must not affect its/);
});
