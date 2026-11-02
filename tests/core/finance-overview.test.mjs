import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { getFinanceMonthRange, sumAvailableBalances, sumFinanceAmounts } from "../../lib/hub/finance-overview.mjs";

test("Finance overview uses local calendar boundaries for current-month ledger totals", () => {
  assert.deepEqual(getFinanceMonthRange(new Date(2026, 0, 18, 12)), { start: "2026-01-01", end: "2026-02-01" });
  assert.deepEqual(getFinanceMonthRange(new Date(2026, 11, 18, 12)), { start: "2026-12-01", end: "2027-01-01" });
  assert.equal(sumFinanceAmounts([{ amount: "1200" }, { amount: 800 }, { amount: null }]), 2000);
  assert.equal(sumAvailableBalances([{ balance: "500000" }, { balance: 250000 }]), 750000);
});

test("Finance overview uses existing operational accounts and excludes portfolio data", async () => {
  const component = await readFile(new URL("../../components/hub/FinanceOverview.jsx", import.meta.url), "utf8");
  assert.match(component, /from\("bank_accounts"\)/);
  assert.match(component, /from\("income_entries"\)/);
  assert.match(component, /from\("expenses"\)/);
  assert.match(component, /4allx:finance-balance-privacy:v1/);
  assert.match(component, /Sembunyikan nominal saldo/);
  assert.doesNotMatch(component, /portfolio_(?:holdings|transactions)/);
});
