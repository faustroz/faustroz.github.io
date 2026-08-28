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
  assert.ok(expenses.fields.some(({ name }) => name === "bank_account_name"));
  assert.equal(budgets.fields.find(({ name }) => name === "name").label, "Expense category");
  assert.equal(expenses.fields.find(({ name }) => name === "category").type, "lookup");
  assert.equal(expenses.fields.find(({ name }) => name === "bank_account_name").lookup.table, "bank_accounts");
  assert.ok(SEARCH_SOURCES.some(({ table }) => table === "bank_accounts"));
});

test("finance has owner-private income and custom category channels", () => {
  const income = FINANCE_CHANNELS.find(({ id }) => id === "income");
  const categories = FINANCE_CHANNELS.find(({ id }) => id === "categories");
  assert.equal(income.table, "income_entries");
  assert.equal(categories.table, "finance_categories");
  assert.ok(SEARCH_SOURCES.some(({ table }) => table === "income_entries"));
  assert.ok(SEARCH_SOURCES.some(({ table }) => table === "finance_categories"));
});

test("bank account schema remains owner-scoped", async () => {
  const sql = await readFile(new URL("../../supabase-phase9-finance-accounts.sql", import.meta.url), "utf8");
  assert.match(sql, /alter table public\.bank_accounts enable row level security/);
  assert.match(sql, /auth\.uid\(\) = user_id/);
  assert.match(sql, /bank_account_name/);
});
