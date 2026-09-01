import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile("components/hub/CrudPanel.jsx", "utf8");

test("category budgets derive current-period spend and remaining balance from private expenses", () => {
  assert.match(source, /function budgetProgress\(budget, expenses\)/);
  assert.match(source, /expense\.category === budget\.name/);
  assert.match(source, /expense\.spent_on >= startKey && expense\.spent_on < endKey/);
  assert.match(source, /remaining: limit - spent/);
  assert.match(source, /from\("expenses"\)\.select\("category,amount,spent_on"\)\.is\("deleted_at", null\)/);
  assert.match(source, /<span>REMAINING<\/span>/);
  assert.match(source, /<span>EXACT DATE<\/span>/);
});
