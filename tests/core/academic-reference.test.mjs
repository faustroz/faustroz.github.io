import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { REFERENCE_CHANNELS } from "../../lib/hub/module-config.mjs";

test("reference library tables are owner-private with soft delete and Trash purge", async () => {
  const sql = await readFile(new URL("../../supabase/migrations/044-academic-reference-library.sql", import.meta.url), "utf8");
  assert.match(sql, /create table if not exists public\.academic_drug_cards/);
  assert.match(sql, /create table if not exists public\.academic_reference_values/);
  assert.match(sql, /enable row level security/);
  assert.match(sql, /auth\.uid\(\) = user_id/);
  assert.match(sql, /deleted_at timestamptz/);
  assert.match(sql, /'academic_drug_cards','academic_reference_values'\]/);
});

test("reference channels expose the drug card and reference value tables", () => {
  assert.deepEqual(REFERENCE_CHANNELS.map(({ id, table }) => [id, table]), [
    ["drugs", "academic_drug_cards"],
    ["values", "academic_reference_values"],
  ]);
  for (const channel of REFERENCE_CHANNELS) assert.ok(channel.fields.some(({ required }) => required));
});
