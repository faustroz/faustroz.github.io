import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Finance recent transaction reads the latest visible income or expense", async () => {
  const component = await readFile(new URL("../../components/hub/FinanceLastUpdated.jsx", import.meta.url), "utf8");

  assert.match(component, /select\("title,category,amount,created_at,spent_on"\)/);
  assert.match(component, /select\("title,category,amount,created_at,received_on"\)/);
  assert.match(component, /is\("deleted_at", null\)/);
  assert.match(component, /order\("created_at", \{ ascending: false \}\)/);
  assert.match(component, /TRANSAKSI TERAKHIR/);
  assert.match(component, /className="hub-finance-last-transaction"/);
  assert.match(component, /hideAmounts \? "••••••" : transactionAmount/);
  assert.match(component, /title=\{title\}/);
  assert.match(component, /Belum ada transaksi\./);
  assert.match(component, /Transaksi belum dapat dimuat\./);
  assert.match(component, /postgres_changes/);
});
