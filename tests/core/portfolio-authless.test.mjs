import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const pagePath = new URL("../../app/finance/portfolio/page.jsx", import.meta.url);
const storagePath = new URL("../../lib/portfolio/storage.js", import.meta.url);
const sqlPath = new URL("../../supabase/migrations/000-portfolio-tracker.sql", import.meta.url);

test("Portfolio Tracker relies on Hub Auth/RLS instead of a second password gate", async () => {
  const [page, storage, sql] = await Promise.all([
    readFile(pagePath, "utf8"),
    readFile(storagePath, "utf8"),
    readFile(sqlPath, "utf8"),
  ]);

  assert.doesNotMatch(page, /LoginGate|loggedIn|handleLogout/);
  assert.doesNotMatch(storage, /PASSWORD|hasPassword|setPassword|verifyPassword|clearPassword|simpleHash/);
  assert.match(sql, /delete from public\.portfolio_tracker_store where key = 'pt_password'/);
});
