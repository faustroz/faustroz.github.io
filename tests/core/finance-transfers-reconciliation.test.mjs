import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { FINANCE_CHANNELS } from "../../lib/hub/module-config.mjs";

const migrationUrl = new URL("../../supabase/migrations/028-finance-transfers-reconciliation.sql", import.meta.url);
const retireMigrationUrl = new URL("../../supabase/migrations/030-retire-bank-reconciliation.sql", import.meta.url);
const searchUrl = new URL("../../lib/hub/search.mjs", import.meta.url);
const trashUrl = new URL("../../components/hub/TrashPanel.jsx", import.meta.url);
const backupUrl = new URL("../../components/hub/BackupPanel.jsx", import.meta.url);

test("Finance exposes account transfers and retires reconciliation from active channels", () => {
  const transfers = FINANCE_CHANNELS.find(({ id }) => id === "transfers");
  assert.equal(transfers.table, "bank_transfers");
  assert.equal(transfers.fields.find(({ name }) => name === "from_account_id").lookup.value, "id");
  assert.equal(transfers.fields.find(({ name }) => name === "to_account_id").lookup.value, "id");
  assert.equal(FINANCE_CHANNELS.some(({ id }) => id === "reconciliation"), false);
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

test("retired reconciliation is absent from active UI while legacy backup data stays safe", async () => {
  const [sql, search, trash, backup] = await Promise.all([
    readFile(retireMigrationUrl, "utf8"),
    readFile(searchUrl, "utf8"),
    readFile(trashUrl, "utf8"),
    readFile(backupUrl, "utf8"),
  ]);
  assert.match(sql, /drop trigger if exists sync_bank_reconciliation_balance on public\.bank_accounts/);
  assert.match(sql, /alter publication supabase_realtime drop table public\.bank_account_reconciliations/);
  assert.doesNotMatch(search, /table: "bank_account_reconciliations"/);
  assert.doesNotMatch(trash, /bank_account_reconciliations/);
  assert.match(backup, /LEGACY_COMPAT_TABLES = \["bank_account_reconciliations"/);
  assert.match(backup, /table === "bank_account_reconciliations" \? record/);
});
