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

test("authenticated snapshot derives focus, activity, and analytics from records", () => {
  const snapshot = deriveOperationsSnapshot({
    expenses: [{ id: "e1", title: "Books", amount: "125000", updated_at: "2026-08-28T08:00:00Z" }],
    subscriptions: [{ id: "s1", name: "Cloud", amount: "50000", active: true }],
    budgets: [{ id: "b1", name: "Learning", limit_amount: "300000" }],
  });

  assert.equal(snapshot.finance.expenseTotal, 125000);
  assert.equal(snapshot.finance.activeSubscriptions, 1);
  assert.equal(snapshot.currentFocus, null);
  assert.equal(snapshot.recentActivity[0].source, "Finance");
});
