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

test("Finance refinement keeps account labels available and only compacts Goals presentation", async () => {
  const overview = await readFile(new URL("../../components/hub/FinanceOverview.jsx", import.meta.url), "utf8");
  const crud = await readFile(new URL("../../components/hub/CrudPanel.jsx", import.meta.url), "utf8");
  const config = await readFile(new URL("../../lib/hub/module-config.mjs", import.meta.url), "utf8");
  const styles = await readFile(new URL("../../app/hub.css", import.meta.url), "utf8");
  assert.match(overview, /accountsExpanded \? snapshot\.accounts : snapshot\.accounts\.slice\(0, 2\)/);
  assert.match(overview, /aria-expanded=\{accountsExpanded\}/);
  assert.match(crud, /data-table=\{table\}/);
  assert.match(config, /title: "Goals".*description: "Targets, current savings, progress, and deadline\."/);
  assert.match(styles, /hub-finance-workspace \.hub-crud-panel\[data-table="financial_goals"\]/);
  assert.match(styles, /hub-finance-workspace \.hub-channel-tabs button\[aria-current="page"\]/);
});
