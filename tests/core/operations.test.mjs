import assert from "node:assert/strict";
import test from "node:test";
import { createOperationsService, deriveOperationsSnapshot } from "../../lib/hub/operations.mjs";

test("public operation load makes no private table queries", async () => {
  let queried = false;
  const service = createOperationsService({
    auth: { getSession: async () => ({ data: { session: null }, error: null }) },
    from() { queried = true; throw new Error("must not query private data"); },
  });

  assert.deepEqual(await service.load(), { authenticated: false, snapshot: null });
  assert.equal(queried, false);
});

test("empty authenticated data returns real zero-state summaries", () => {
  const snapshot = deriveOperationsSnapshot({});
  assert.equal(snapshot.finance.expenseTotal, 0);
  assert.equal(snapshot.currentFocus, null);
  assert.deepEqual(snapshot.recentActivity, []);
  assert.deepEqual(snapshot.empty, { finance: true });
});

test("authenticated snapshot derives a finance focus and activity from records", () => {
  const snapshot = deriveOperationsSnapshot({
    expenses: [{ id: "e1", title: "Books", amount: "125000", updated_at: "2026-08-28T08:00:00Z" }],
    subscriptions: [{ id: "s1", name: "Cloud", amount: "50000", active: true }],
    budgets: [{ id: "b1", name: "Learning", limit_amount: "300000" }],
  });

  assert.equal(snapshot.finance.expenseTotal, 125000);
  assert.equal(snapshot.finance.activeSubscriptions, 1);
  assert.deepEqual(snapshot.currentFocus, { source: "Finance", title: "Expense: Books", detail: "Recent cashflow entry" });
  assert.equal(snapshot.recentActivity[0].source, "Finance");
});

test("system alerts take priority and cross-module records appear in activity", () => {
  const snapshot = deriveOperationsSnapshot({
    expenses: [{ id: "e1", title: "Books", updated_at: "2026-08-28T08:00:00Z" }],
    financial_goals: [{ id: "g1", name: "Emergency fund", deadline: "2026-09-10", progress: "25", updated_at: "2026-08-29T08:00:00Z" }],
    academic_records: [{ id: "a1", course_name: "Anatomy", semester: "3", grade: "A", updated_at: "2026-08-30T08:00:00Z" }],
    vault_documents: [{ id: "v1", file_name: "notes.pdf", created_at: "2026-08-30T10:00:00Z", updated_at: "2026-08-30T10:00:00Z" }],
    hub_notifications: [{ id: "n1", title: "Budget review", body: "Review the monthly limit.", read_at: null, created_at: "2026-08-31T08:00:00Z" }],
  });

  assert.deepEqual(snapshot.currentFocus, { source: "System", title: "Budget review", detail: "Review the monthly limit." });
  assert.deepEqual(snapshot.recentActivity.map(({ source }) => source), ["System", "Vault", "Academic", "Finance", "Finance"]);
});
