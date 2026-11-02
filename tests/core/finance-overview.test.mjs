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
  assert.match(overview, /aria-label=\{accountsExpanded \? "Tampilkan dua rekening" : "Tampilkan semua saldo rekening"\}/);
  assert.doesNotMatch(overview, /Lihat semua rekening ·/);
  assert.doesNotMatch(overview, /Buka semua rekening">Lihat semua <ArrowRight/);
  assert.match(overview, /displayAmount\(account\.balance\)/);
  assert.match(overview, /<FinanceLastUpdated hideAmounts=\{hidden\} \/>/);
  assert.match(overview, /href="\/finance\/portfolio"/);
  assert.match(overview, /className="hub-finance-overview-link" onClick=\{onOpenGoals\}/);
  assert.match(crud, /data-table=\{table\}/);
  assert.match(config, /title: "Goals".*description: "Targets, current savings, progress, and deadline\."/);
  assert.match(styles, /hub-finance-workspace \.hub-crud-panel\[data-table="financial_goals"\]/);
  assert.match(styles, /hub-finance-workspace \.hub-channel-tabs button\[aria-current="page"\]/);
  assert.match(styles, /hub-finance-last-transaction \{ display:grid; grid-template-columns:minmax\(0,1fr\) auto/);
  assert.match(styles, /\.hub-finance-overview-links > a,[\s\S]*\.hub-finance-overview-links > button \{ width:100%; cursor:pointer; \}/);
  assert.match(styles, /hub-finance-accounts-actions > button \{ display:inline-flex; flex:0 0 auto; align-items:center; justify-content:center; min-height:2\.5rem; line-height:1; white-space:nowrap; \}/);
});

test("Finance workspace groups every existing channel under the four reference tabs", async () => {
  const workspace = await readFile(new URL("../../components/hub/FinanceWorkspace.jsx", import.meta.url), "utf8");
  const quickAdd = await readFile(new URL("../../components/hub/QuickAdd.jsx", import.meta.url), "utf8");
  for (const id of ["income", "expenses", "transfers", "categories", "budgets", "subscriptions", "accounts", "goals"]) {
    assert.match(workspace, new RegExp(`"${id}"`));
  }
  for (const action of ["expenses", "income", "transfers", "goals", "accounts", "expense-categories"]) assert.match(quickAdd, new RegExp(`id: "${action}"|id === "${action}"`));
  for (const label of ["Overview", "Transactions", "Planning", "Recurring"]) assert.match(workspace, new RegExp(label));
  assert.match(workspace, /onOpenAccounts=\{\(\) => setDetail\("accounts"\)\}/);
  assert.match(workspace, /onOpenGoals=\{\(\) => setDetail\("goals"\)\}/);
  assert.match(workspace, /CHANNEL_DESTINATIONS/);
  assert.match(workspace, /useSearchParams\(\)/);
  assert.match(quickAdd, /fixedValues \|\| \{\}/);
});
