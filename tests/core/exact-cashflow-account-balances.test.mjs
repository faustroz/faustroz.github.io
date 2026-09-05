import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const sql = await readFile(new URL("../../supabase/migrations/026-exact-cashflow-account-balances.sql", import.meta.url), "utf8");
const incomeBranch = sql.match(/elsif tg_table_name = 'income_entries' then([\s\S]*?)end if;\n  end if;/)?.[1] || "";
const expenseBranch = sql.match(/if tg_table_name = 'expenses' then([\s\S]*?)elsif tg_table_name = 'income_entries'/)?.[1] || "";

test("latest Income trigger always passes the linked bank_account_id", () => {
  assert.ok(incomeBranch);
  assert.doesNotMatch(incomeBranch, /apply_cashflow_to_bank_balance\([^\n]*, null,/);
  assert.match(incomeBranch, /new\.user_id, new\.bank_account_id, new\.bank_account_name, new\.amount/);
  assert.match(incomeBranch, /old\.user_id, old\.bank_account_id, old\.bank_account_name, -old\.amount/);
  assert.match(incomeBranch, /old\.deleted_at is null and new\.deleted_at is not null/);
  assert.match(incomeBranch, /old\.deleted_at is not null and new\.deleted_at is null/);
});

test("legacy name fallback updates only an unambiguous owner account", () => {
  assert.match(sql, /matched_account_count = 1/);
  assert.match(sql, /account\.user_id = p_user_id/);
  assert.match(sql, /where id = matched_account_id[\s\S]*user_id = p_user_id/);
  assert.doesNotMatch(sql, /where user_id = p_user_id and name = p_account_name/);
});

test("Expense keeps exact debit, refund, edit, delete, and restore behavior", () => {
  assert.ok(expenseBranch);
  assert.match(expenseBranch, /new\.bank_account_id, new\.bank_account_name, -new\.amount/);
  assert.match(expenseBranch, /old\.bank_account_id, old\.bank_account_name, old\.amount/);
  assert.match(expenseBranch, /tg_op = 'DELETE' and old\.deleted_at is null/);
  assert.match(sql, /create trigger sync_expense_bank_balance/);
  assert.match(sql, /create trigger sync_income_bank_balance/);
});
