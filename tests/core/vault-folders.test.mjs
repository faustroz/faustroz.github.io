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

test("Vault schema keeps owner-scoped folder IDs for nested navigation and files", async () => {
  const migration = await readFile(new URL("../../supabase/migrations/022-vault-drive-structure.sql", import.meta.url), "utf8");
  assert.match(migration, /add column if not exists parent_id uuid/);
  assert.match(migration, /add column if not exists folder_id uuid/);
  assert.match(migration, /on delete restrict/);
  assert.match(migration, /vault_folders_owner_parent_name_key/);
  assert.match(migration, /lower\(name\)/);
  assert.match(migration, /Parent folder must belong to the same owner/);
  assert.match(migration, /Document folder must belong to the same owner/);
  assert.match(migration, /Folder hierarchy cannot contain a cycle/);
});
