import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("question bank supports owner-managed reusable block categories and legacy block metadata", async () => {
  const [migration, repository, library] = await Promise.all([
    readFile(new URL("../../supabase/migrations/034-question-bank-block-categories.sql", import.meta.url), "utf8"),
    readFile(new URL("../../lib/hub/question-bank.mjs", import.meta.url), "utf8"),
    readFile(new URL("../../components/hub/QuestionLibrary.jsx", import.meta.url), "utf8"),
  ]);

  assert.match(migration, /check \(kind in \('exam_type', 'subject', 'block'\)\)/);
  assert.match(repository, /\["exam_type", "subject", "block"\]/);
  assert.match(library, /repository\.listCategories\("block"\)/);
  assert.match(library, /handleAddCategory\("block"\)/);
  assert.match(library, /openCategoryManager\("block"\)/);
  assert.match(library, /<select required value=\{form\.block\}/);
  assert.match(library, /Tersimpan · \{form\.block\}/);
  assert.match(library, /filterOptions\.blocks/);
});

test("practice page centers within the viewport and preserves question line breaks", async () => {
  const css = await readFile(new URL("../../app/hub.css", import.meta.url), "utf8");
  assert.match(css, /\.hub-shell--practice\s*\{\s*padding-left:0;/);
  assert.match(css, /\.academic-practice__content\s*\{\s*width:min\(100%,54rem\)/);
  assert.match(css, /\.academic-practice__question\s*\{[^}]*white-space:pre-wrap/s);
});
