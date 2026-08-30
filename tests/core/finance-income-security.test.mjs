import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("income and custom categories are protected by owner RLS", async () => {
  const sql = await readFile(new URL("../../supabase/migrations/010-finance-income-categories.sql", import.meta.url), "utf8");
  assert.match(sql, /income_entries/);
  assert.match(sql, /finance_categories/);
  assert.match(sql, /enable row level security/);
  assert.match(sql, /auth\.uid\(\) = user_id/);
});
