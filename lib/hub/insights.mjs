const MAX_ROWS = 500;
const GRADE_POINTS = { A: 4, "A-": 3.7, "B+": 3.5, B: 3, "B-": 2.7, "C+": 2.5, C: 2, D: 1, E: 0 };

const SOURCES = Object.freeze([
  ["expenses", "id,amount,spent_on,updated_at", true],
  ["bank_accounts", "id,balance,currency,updated_at", true],
  ["budgets", "id,limit_amount,period,updated_at", true],
  ["subscriptions", "id,amount,active,next_billing_on,updated_at", true],
  ["financial_goals", "id,target_amount,current_amount,deadline,progress,updated_at", true],
  ["academic_records", "id,credits,grade,semester,updated_at", true],
  ["vault_documents", "id,byte_size,created_at,updated_at", true],
  ["vault_folders", "id,created_at", false],
]);

const value = (input) => Number(input || 0);
const dateKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

function monthsEnding(now, count = 6) {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (count - 1 - index), 1);
    return { key: dateKey(date), label: new Intl.DateTimeFormat("id-ID", { month: "short" }).format(date) };
  });
}

export function deriveInsightsSnapshot(records, now = new Date()) {
  const expenses = records.expenses || [];
  const accounts = records.bank_accounts || [];
  const budgets = records.budgets || [];
  const subscriptions = records.subscriptions || [];
  const goals = records.financial_goals || [];
  const academics = records.academic_records || [];
  const documents = records.vault_documents || [];
  const folders = records.vault_folders || [];
  const currentMonth = dateKey(now);
  const previousMonth = dateKey(new Date(now.getFullYear(), now.getMonth() - 1, 1));
  const months = monthsEnding(now);
  const trend = months.map((month) => ({
    ...month,
    total: expenses.filter(({ spent_on }) => String(spent_on || "").startsWith(month.key)).reduce((total, row) => total + value(row.amount), 0),
  }));
  const currentExpenses = trend.find(({ key }) => key === currentMonth)?.total || 0;
  const previousExpenses = expenses.filter(({ spent_on }) => String(spent_on || "").startsWith(previousMonth)).reduce((total, row) => total + value(row.amount), 0);
  const credits = academics.reduce((total, row) => total + value(row.credits), 0);
  const ipk = credits ? academics.reduce((total, row) => total + value(row.credits) * (GRADE_POINTS[row.grade] ?? 0), 0) / credits : null;
  const goalProgress = goals.length ? goals.reduce((total, row) => total + value(row.progress), 0) / goals.length : null;

  return {
    finance: {
      hasData: Boolean(expenses.length || accounts.length || budgets.length || subscriptions.length || goals.length),
      currentExpenses,
      previousExpenses,
      expenseCount: expenses.filter(({ spent_on }) => String(spent_on || "").startsWith(currentMonth)).length,
      balanceTotal: accounts.reduce((total, row) => total + value(row.balance), 0),
      accountCount: accounts.length,
      activeSubscriptions: subscriptions.filter(({ active }) => active).length,
      budgetCount: budgets.length,
      goalCount: goals.length,
      goalProgress,
      trend,
      hasTrend: trend.some(({ total }) => total > 0),
    },
    academic: {
      hasData: academics.length > 0,
      recordCount: academics.length,
      credits,
      ipk,
      semesterCount: new Set(academics.map(({ semester }) => semester).filter(Boolean)).size,
    },
    vault: {
      hasData: Boolean(documents.length || folders.length),
      documentCount: documents.length,
      folderCount: folders.length,
      byteSize: documents.reduce((total, row) => total + value(row.byte_size), 0),
    },
  };
}

async function fetchSource(client, [table, columns, softDelete]) {
  let query = client.from(table).select(columns);
  if (softDelete) query = query.is("deleted_at", null);
  const { data, error } = await query.limit(MAX_ROWS);
  if (error) throw error;
  return [table, data || []];
}

export function createInsightsService(client) {
  if (!client?.auth || !client?.from) throw new Error("A Supabase client is required.");
  return {
    async load() {
      const { data, error } = await client.auth.getSession();
      if (error) throw error;
      if (!data.session) return { authenticated: false, snapshot: null };
      const entries = await Promise.all(SOURCES.map((source) => fetchSource(client, source)));
      return { authenticated: true, snapshot: deriveInsightsSnapshot(Object.fromEntries(entries)) };
    },
  };
}
