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
  const snapshot = deriveOperationsSnapshot({}, new Date(2026, 7, 31, 12));
  assert.equal(snapshot.finance.expenseTotal, 0);
  assert.equal(snapshot.currentFocus, null);
  assert.deepEqual(snapshot.recentActivity, []);
  assert.deepEqual(snapshot.empty, { finance: true, academic: true });
});

test("authenticated snapshot uses real current-month cashflow and latest expense timestamp", () => {
  const snapshot = deriveOperationsSnapshot({
    expenses: [
      { id: "e1", title: "Books", amount: "125000", category: "Study", spent_on: "2026-08-28", created_at: "2026-08-28T08:00:00Z", updated_at: "2026-08-28T08:00:00Z" },
      { id: "e2", title: "Older", amount: "90000", spent_on: "2026-07-28", created_at: "2026-07-28T08:00:00Z", updated_at: "2026-07-28T08:00:00Z" },
    ],
    income_entries: [{ id: "i1", title: "Allowance", amount: "500000", received_on: "2026-08-02", created_at: "2026-08-02T08:00:00Z", updated_at: "2026-08-02T08:00:00Z" }],
    subscriptions: [{ id: "s1", name: "Cloud", amount: "50000", active: true }],
    budgets: [{ id: "b1", name: "Learning", limit_amount: "300000" }],
  }, new Date(2026, 7, 31, 12));

  assert.equal(snapshot.finance.expenseTotal, 125000);
  assert.equal(snapshot.finance.expenseCount, 1);
  assert.equal(snapshot.finance.incomeTotal, 500000);
  assert.equal(snapshot.finance.incomeCount, 1);
  assert.equal(snapshot.finance.lastExpenseAdded.id, "e1");
  assert.equal(snapshot.finance.activeSubscriptions, 1);
  assert.deepEqual(snapshot.currentFocus, { source: "Finance", title: "Books", detail: "Study" , href: "/finance" });
  assert.equal(snapshot.recentActivity[0].title, "Expense · Books");
});

test("system alerts take priority and cross-module records appear in activity", () => {
  const snapshot = deriveOperationsSnapshot({
    expenses: [{ id: "e1", title: "Books", category: "Study", spent_on: "2026-08-28", created_at: "2026-08-28T08:00:00Z", updated_at: "2026-08-28T08:00:00Z" }],
    financial_goals: [{ id: "g1", name: "Emergency fund", deadline: "2026-09-10", progress: "25", updated_at: "2026-08-29T08:00:00Z" }],
    academic_records: [{ id: "a1", course_name: "Anatomy", semester: "3", credits: 4, grade: "A", created_at: "2026-08-30T08:00:00Z", updated_at: "2026-08-30T08:00:00Z" }],
    vault_documents: [{ id: "v1", file_name: "notes.pdf", created_at: "2026-08-30T10:00:00Z", updated_at: "2026-08-30T10:00:00Z" }],
    hub_notifications: [{ id: "n1", title: "Budget review", body: "Review the monthly limit.", read_at: null, created_at: "2026-08-31T08:00:00Z" }],
  });

  assert.deepEqual(snapshot.currentFocus, { source: "System", title: "Budget review", detail: "Review the monthly limit.", href: "/insights" });
  assert.deepEqual(snapshot.recentActivity.map(({ source }) => source), ["System", "Vault", "Academic", "Finance", "Finance"]);
});

test("academic overview combines course records and reports only actual question accuracy", () => {
  const snapshot = deriveOperationsSnapshot({
    academic_records: [{ id: "a1", course_name: "Anatomy", semester: "1", credits: "4", grade: "A", created_at: "2026-08-01", updated_at: "2026-08-01" }],
    academic_mku_records: [{ id: "m1", course_name: "Pancasila", semester: "1", credits: "2", grade: "B+", created_at: "2026-08-02", updated_at: "2026-08-02" }],
    academic_question_attempts: [{ id: "q1", is_correct: true, created_at: "2026-08-03" }, { id: "q2", is_correct: false, created_at: "2026-08-04" }],
  });

  assert.equal(snapshot.academic.credits, 6);
  assert.equal(snapshot.academic.semesterCount, 1);
  assert.equal(snapshot.academic.practiceCount, 2);
  assert.equal(snapshot.academic.practiceAccuracy, 50);
  assert.equal(snapshot.empty.academic, false);
});
