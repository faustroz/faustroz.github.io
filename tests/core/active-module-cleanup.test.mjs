import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("active Search, Trash, and notifications exclude retired modules", async () => {
  const [search, trash, notifications, backup] = await Promise.all([
    readFile(new URL("../../lib/hub/search.mjs", import.meta.url), "utf8"),
    readFile(new URL("../../components/hub/TrashPanel.jsx", import.meta.url), "utf8"),
    readFile(new URL("../../supabase/functions/notifications/index.ts", import.meta.url), "utf8"),
    readFile(new URL("../../components/hub/BackupPanel.jsx", import.meta.url), "utf8"),
  ]);

  for (const legacyTable of ["study_topics", "study_exams", "study_flashcards", "hub_projects", "project_tasks", "project_changelog", "ai_memory_entries"]) {
    assert.doesNotMatch(search, new RegExp(legacyTable));
    assert.doesNotMatch(trash, new RegExp(legacyTable));
    assert.doesNotMatch(notifications, new RegExp(legacyTable));
    assert.match(backup, new RegExp(legacyTable));
  }
  assert.match(backup, /LEGACY_COMPAT_TABLES/);
});

test("Vault content indexing stays owner-private and bounded", async () => {
  const [migration, vault] = await Promise.all([
    readFile(new URL("../../supabase/migrations/023-global-search-portfolio-owner.sql", import.meta.url), "utf8"),
    readFile(new URL("../../components/hub/VaultPanel.jsx", import.meta.url), "utf8"),
  ]);

  assert.match(migration, /char_length\(search_text\) <= 32768/);
  assert.match(migration, /enable row level security/);
  assert.match(migration, /revoke all on public\.vault_documents from anon/);
  assert.match(vault, /SEARCH_TEXT_LIMIT = 32768/);
  assert.match(vault, /file\.type\.startsWith\("text\/"\)/);
});
