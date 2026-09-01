import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Phase 4 schema enables owner-scoped RLS for every private table", async () => {
  const sql = await readFile(
    new URL("../../supabase/migrations/004-private-modules.sql", import.meta.url),
    "utf8"
  );
  const tables = [
    "expenses",
    "budgets",
    "subscriptions",
    "study_topics",
    "study_exams",
    "study_flashcards",
    "hub_projects",
    "project_tasks",
    "project_changelog",
    "ai_memory_entries",
    "user_settings",
  ];

  for (const table of tables) {
    assert.match(sql, new RegExp(`create table if not exists public\\.${table}`));
  }

  assert.match(sql, /enable row level security/);
  assert.match(sql, /auth\.uid\(\) = user_id/);
  assert.match(sql, /for insert to authenticated with check/);
  assert.match(sql, /for update to authenticated using/);
  assert.match(sql, /for delete to authenticated using/);
  assert.match(sql, /revoke all on public\.portfolio_tracker_store from anon/);
  assert.doesNotMatch(sql, /portfolio owner[^;]+using \(true\)/s);
});
