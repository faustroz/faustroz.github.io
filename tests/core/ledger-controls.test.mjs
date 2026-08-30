import assert from "node:assert/strict";
import test from "node:test";
import { filterAndSortLedger } from "../../lib/hub/ledger.mjs";
import { FINANCE_CHANNELS } from "../../lib/hub/module-config.mjs";

const rows = [
  { id: "a", spent_on: "2026-08-02", amount: 25000, created_at: "2026-08-02T08:00:00Z" },
  { id: "b", spent_on: "2026-08-23", amount: 10000, created_at: "2026-08-23T08:00:00Z" },
  { id: "c", spent_on: "2026-07-30", amount: 90000, created_at: "2026-07-30T08:00:00Z" },
];

test("ledger controls filter an owner-visible ledger by month and sort date or amount", () => {
  const config = { dateField: "spent_on", amountField: "amount" };
  assert.deepEqual(filterAndSortLedger(rows, { ...config, month: "2026-08", sort: "date-desc" }).map(({ id }) => id), ["b", "a"]);
  assert.deepEqual(filterAndSortLedger(rows, { ...config, month: "all", sort: "amount-desc" }).map(({ id }) => id), ["c", "a", "b"]);
  assert.deepEqual(filterAndSortLedger(rows, { ...config, month: "2026-08", sort: "amount-asc" }).map(({ id }) => id), ["b", "a"]);
});

test("Income and Expenses expose ledger filter metadata", () => {
  for (const id of ["income", "expenses"]) assert.ok(FINANCE_CHANNELS.find((channel) => channel.id === id)?.ledger);
});
