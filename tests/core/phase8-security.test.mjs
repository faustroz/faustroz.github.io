import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const schemaPath = new URL("../../supabase-phase8-private-operations.sql", import.meta.url);
const integrationPath = new URL("../../supabase/functions/integrations/index.ts", import.meta.url);

test("Phase 8 vault and notification data are owner-scoped and Storage stays private", async () => {
  const sql = await readFile(schemaPath, "utf8");
  for (const table of ["vault_documents", "integration_connections", "hub_notifications"]) {
    assert.match(sql, new RegExp(`'${table}'`));
  }
  assert.match(sql, /enable row level security/);
  assert.match(sql, /'document-vault', 'document-vault', false/);
  assert.match(sql, /storage\.foldername\(name\)\)\[1\] = auth\.uid\(\)::text/);
});

test("integration function reads provider secrets only from server environment", async () => {
  const source = await readFile(integrationPath, "utf8");
  assert.match(source, /Deno\.env\.get\("GITHUB_TOKEN"\)/);
  assert.doesNotMatch(source, /AI_API_KEY/);
  assert.doesNotMatch(source, /NEXT_PUBLIC_/);
});
