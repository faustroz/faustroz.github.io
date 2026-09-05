import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { FINANCE_CHANNELS } from "../../lib/hub/module-config.mjs";

const crudPanel = await readFile(new URL("../../components/hub/CrudPanel.jsx", import.meta.url), "utf8");

test("Finance category selectors render stored colors with a neutral validated fallback", () => {
  assert.match(crudPanel, /selected\.label_color \|\| selected\.color/);
  assert.match(crudPanel, /safeLabelColor\(row\.label_color \|\| row\.color\)/);
  assert.match(crudPanel, /\^#\[0-9a-f\]\{6\}\$/i);
  assert.match(crudPanel, /const neutralLabelColor = "#a1a1aa"/);
});

test("Finance renders separate scoped Expense and Income category sections", () => {
  const sections = FINANCE_CHANNELS.find(({ id }) => id === "categories").sections;
  assert.deepEqual(sections.map(({ title }) => title), ["Expense Categories", "Income Categories"]);
  assert.deepEqual(sections.map(({ recordScope }) => recordScope.kind), ["expense", "income"]);
  assert.deepEqual(sections.map(({ fixedValues }) => fixedValues.kind), ["expense", "income"]);
});
