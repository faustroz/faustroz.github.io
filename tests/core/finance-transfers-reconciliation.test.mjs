import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { FINANCE_CHANNELS } from "../../lib/hub/module-config.mjs";

const migrationUrl = new URL("../../supabase/migrations/028-finance-transfers-reconciliation.sql", import.meta.url);
const liveMigrationUrl = new URL("../../supabase/migrations/029-live-bank-reconciliation.sql", import.meta.url);
const crudPanelUrl = new URL("../../components/hub/CrudPanel.jsx", import.meta.url);

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

test("reconciliation initially snapshots only the authenticated owner's exact account balance", async () => {
  const sql = await readFile(migrationUrl, "utf8");
  assert.match(sql, /statement_balance - ledger_balance/);
  assert.match(sql, /account\.id = new\.bank_account_id/);
  assert.match(sql, /account\.user_id = new\.user_id/);
  assert.match(sql, /new\.ledger_balance := old\.ledger_balance/);
});

test("active reconciliation follows only its exact owner's account balance", async () => {
  const sql = await readFile(liveMigrationUrl, "utf8");
  assert.match(sql, /after update of balance on public\.bank_accounts/);
  assert.match(sql, /reconciliation\.user_id = new\.user_id/);
  assert.match(sql, /reconciliation\.bank_account_id = new\.id/);
  assert.match(sql, /reconciliation\.deleted_at is null/);
  assert.match(sql, /set ledger_balance = new\.balance/);
  assert.doesNotMatch(sql, /new\.ledger_balance := old\.ledger_balance/);
  assert.match(sql, /reconciliation\.ledger_balance is distinct from account\.balance/);
});

test("reconciliation UI subscribes to owner-filtered realtime row changes", async () => {
  const [sql, panel] = await Promise.all([
    readFile(liveMigrationUrl, "utf8"),
    readFile(crudPanelUrl, "utf8"),
  ]);
  assert.match(sql, /alter publication supabase_realtime add table public\.bank_account_reconciliations/);
  assert.match(panel, /\.on\("postgres_changes", \{ event: "\*", schema: "public", table \}/);
  assert.match(panel, /client\.removeChannel\(channel\)/);
});
