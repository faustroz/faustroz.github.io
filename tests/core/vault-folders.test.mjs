import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Vault folders are persistent and owner-scoped", async () => {
  const sql = await readFile(new URL("../../supabase/migrations/019-vault-folders.sql", import.meta.url), "utf8");
  assert.match(sql, /create table if not exists public\.vault_folders/);
  assert.match(sql, /unique \(user_id, name\)/);
  assert.match(sql, /enable row level security/);
  assert.match(sql, /auth\.uid\(\) = user_id/);
});
