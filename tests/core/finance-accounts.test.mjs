import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { FINANCE_CHANNELS } from "../../lib/hub/module-config.mjs";
import { SEARCH_SOURCES } from "../../lib/hub/search.mjs";

test("finance exposes private balances and category-specific budget configuration", () => {
  const accounts = FINANCE_CHANNELS.find(({ id }) => id === "accounts");
  const expenses = FINANCE_CHANNELS.find(({ id }) => id === "expenses");
  const budgets = FINANCE_CHANNELS.find(({ id }) => id === "budgets");
  assert.equal(accounts.table, "bank_accounts");
  assert.ok(expenses.fields.some(({ name }) => name === "bank_account_id"));
  assert.equal(budgets.fields.find(({ name }) => name === "name").label, "Expense category");
  assert.equal(expenses.fields.find(({ name }) => name === "category").type, "lookup");
  assert.equal(expenses.fields.find(({ name }) => name === "bank_account_id").lookup.table, "bank_accounts");
  assert.ok(FINANCE_CHANNELS.find(({ id }) => id === "categories").sections.every(({ fields }) => fields.find(({ name }) => name === "color").type === "color"));
  assert.ok(SEARCH_SOURCES.some(({ table }) => table === "bank_accounts"));
});

test("finance has owner-private income and custom category channels", () => {
  const income = FINANCE_CHANNELS.find(({ id }) => id === "income");
  const categories = FINANCE_CHANNELS.find(({ id }) => id === "categories");
  const expenseCategories = categories.sections.find(({ id }) => id === "expense-categories");
  const incomeCategories = categories.sections.find(({ id }) => id === "income-categories");
  assert.equal(income.table, "income_entries");
  assert.equal(expenseCategories.table, "finance_categories");
  assert.deepEqual(expenseCategories.recordScope, { kind: "expense" });
  assert.deepEqual(expenseCategories.fixedValues, { kind: "expense" });
  assert.deepEqual(incomeCategories.recordScope, { kind: "income" });
  assert.deepEqual(incomeCategories.fixedValues, { kind: "income" });
  assert.ok(!expenseCategories.fields.some(({ name }) => name === "kind"));
  assert.ok(!incomeCategories.fields.some(({ name }) => name === "kind"));
  assert.ok(SEARCH_SOURCES.some(({ table }) => table === "income_entries"));
  assert.ok(SEARCH_SOURCES.some(({ table }) => table === "finance_categories"));
});

test("bank account schema remains owner-scoped", async () => {
  const sql = await readFile(new URL("../../supabase/migrations/009-finance-accounts.sql", import.meta.url), "utf8");
  assert.match(sql, /alter table public\.bank_accounts enable row level security/);
  assert.match(sql, /auth\.uid\(\) = user_id/);
  assert.match(sql, /bank_account_name/);
});
