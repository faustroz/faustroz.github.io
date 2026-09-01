import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { generateUsernameVariations, pivotHref } from "../../lib/hub/osint.mjs";

const [migration, graph, cases, save, variations, phone, username] = await Promise.all([
  readFile("supabase/migrations/024-osint-cases.sql", "utf8"),
  readFile("components/hub/DigitalFootprintGraph.jsx", "utf8"),
  readFile("components/hub/OsintCaseWorkspace.jsx", "utf8"),
  readFile("components/hub/SaveFindingButton.jsx", "utf8"),
  readFile("components/hub/UsernameVariationsPanel.jsx", "utf8"),
  readFile("components/hub/PhoneLookupPanel.jsx", "utf8"),
  readFile("components/hub/UsernameLookupPanel.jsx", "utf8"),
]);

test("username variations are useful, deterministic, and bounded", () => {
  const rows = generateUsernameVariations("made.ferdy", new Date("2026-01-01T00:00:00Z"));
  assert.ok(rows.includes("made_ferdy"));
  assert.ok(rows.includes("madeferdy26"));
  assert.ok(rows.length <= 24);
  assert.equal(new Set(rows).size, rows.length);
});

test("case schema is owner scoped and prevents cross-owner case links", () => {
  assert.match(migration, /default auth\.uid\(\)/);
  assert.match(migration, /foreign key \(user_id, case_id\)/);
  assert.match(migration, /using \(auth\.uid\(\) = user_id\)/);
  assert.match(migration, /on delete cascade/);
  assert.match(migration, /revoke all .* from anon/);
});

test("lookup results stay ephemeral until explicit case action", () => {
  assert.doesNotMatch(phone, /\.from\("osint_case_findings"\)/);
  assert.doesNotMatch(username, /\.from\("osint_case_findings"\)/);
  assert.match(save, /\.from\("osint_case_findings"\)\.insert/);
  assert.match(save, /onClick=\{save\}/);
});

test("graph labels confidence and avoids identity claims", () => {
  assert.match(graph, /Confirmed fact/);
  assert.match(graph, /Possible match/);
  assert.match(graph, /Uncertain/);
  assert.match(graph, /do not prove that identifiers belong to the same person/);
  assert.equal(pivotHref({ finding_type: "phone", value: "+6281" }), "/phone-lookup?phone=%2B6281");
});

test("case workspace has timeline, relationship, JSON export, and permanent deletion", () => {
  assert.match(cases, /TIMELINE/);
  assert.match(cases, /RELATIONSHIPS/);
  assert.match(cases, /JSON\.stringify/);
  assert.match(cases, /Permanently delete/);
  assert.match(cases, /\.delete\(\)/);
  assert.match(variations, /current\.length < 5/);
  assert.match(variations, /topSites: 20/);
});
