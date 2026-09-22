import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Finance last-updated indicator reads the most recently created visible expense", async () => {
  const component = await readFile(new URL("../../components/hub/FinanceLastUpdated.jsx", import.meta.url), "utf8");

  assert.match(component, /select\("title,created_at"\)/);
  assert.match(component, /is\("deleted_at", null\)/);
  assert.match(component, /order\("created_at", \{ ascending: false \}\)/);
  assert.match(component, /LAST EXPENSE ADDED/);
  assert.match(component, /No expense recorded yet\./);
  assert.match(component, /postgres_changes/);
});
