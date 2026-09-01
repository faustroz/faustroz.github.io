import assert from "node:assert/strict";
import test from "node:test";
import { deriveInsightsSnapshot } from "../../lib/hub/insights.mjs";

test("cross-module insights derive only from real Finance, Academic, and Vault records", () => {
  const snapshot = deriveInsightsSnapshot({
    expenses: [{ amount: 100000, spent_on: "2026-09-03" }, { amount: 50000, spent_on: "2026-08-21" }],
    bank_accounts: [{ balance: 900000 }], budgets: [{ id: "budget" }], subscriptions: [{ active: true }], financial_goals: [{ progress: 40 }],
    academic_records: [{ credits: 4, grade: "A", semester: "1" }, { credits: 2, grade: "B+", semester: "1" }],
    vault_documents: [{ byte_size: 2048 }], vault_folders: [{ id: "folder" }],
  }, new Date(2026, 8, 5));

  assert.equal(snapshot.finance.currentExpenses, 100000);
  assert.equal(snapshot.finance.previousExpenses, 50000);
  assert.equal(snapshot.finance.balanceTotal, 900000);
  assert.equal(snapshot.academic.ipk, 23 / 6);
  assert.equal(snapshot.academic.semesterCount, 1);
  assert.equal(snapshot.vault.byteSize, 2048);
});

test("cross-module insights preserve honest empty states", () => {
  const snapshot = deriveInsightsSnapshot({}, new Date(2026, 8, 5));
  assert.equal(snapshot.finance.hasData, false);
  assert.equal(snapshot.academic.hasData, false);
  assert.equal(snapshot.vault.hasData, false);
  assert.equal(snapshot.finance.hasTrend, false);
});
