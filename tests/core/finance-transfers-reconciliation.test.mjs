import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { FINANCE_CHANNELS } from "../../lib/hub/module-config.mjs";

const migrationUrl = new URL("../../supabase/migrations/028-finance-transfers-reconciliation.sql", import.meta.url);

test("Finance exposes transfer and reconciliation channels with exact account ids", () => {
  const transfers = FINANCE_CHANNELS.find(({ id }) => id === "transfers");
  const reconciliation = FINANCE_CHANNELS.find(({ id }) => id === "reconciliation");
  assert.equal(transfers.table, "bank_transfers");
  assert.equal(transfers.fields.find(({ name }) => name === "from_account_id").lookup.value, "id");
  assert.equal(transfers.fields.find(({ name }) => name === "to_account_id").lookup.value, "id");
  assert.equal(reconciliation.table, "bank_account_reconciliations");
  assert.ok(reconciliation.fields.some(({ name, type }) => name === "difference" && type === "computed"));
});

test("account transfers are owner-scoped, atomic, reversible, and account-specific", async () => {
  const sql = await readFile(migrationUrl, "utf8");
  assert.match(sql, /from_account_id <> to_account_id/);
  assert.match(sql, /auth\.uid\(\) = user_id/);
  assert.match(sql, /account\.user_id = p_user_id/);
  assert.match(sql, /account\.id in \(p_from_account_id, p_to_account_id\)/);
  assert.match(sql, /when account\.id = p_from_account_id then -p_amount \* p_direction/);
  assert.match(sql, /when account\.id = p_to_account_id then p_amount \* p_direction/);
  assert.match(sql, /after insert or update or delete on public\.bank_transfers/);
  assert.match(sql, /old\.deleted_at is null/);
  assert.match(sql, /new\.deleted_at is null/);
  assert.match(sql, /Insufficient transfer balance/);
  assert.match(sql, /revoke all on function public\.apply_bank_transfer_balance/);
});

test("reconciliation snapshots only the authenticated owner's exact account balance", async () => {
  const sql = await readFile(migrationUrl, "utf8");
  assert.match(sql, /statement_balance - ledger_balance/);
  assert.match(sql, /account\.id = new\.bank_account_id/);
  assert.match(sql, /account\.user_id = new\.user_id/);
  assert.match(sql, /new\.ledger_balance := old\.ledger_balance/);
});
