const MAX_ROWS = 100;

const TABLE_QUERIES = Object.freeze([
  ["expenses", "id,title,amount,category,spent_on,updated_at"],
  ["subscriptions", "id,name,amount,billing_cycle,active,updated_at"],
  ["budgets", "id,name,limit_amount,period,updated_at"],
]);

function number(value) {
  return Number(value || 0);
}

function recordActivity(record, source, title) {
  return {
    id: `${source}-${record.id}`,
    source,
    title,
    updatedAt: record.updated_at,
  };
}

export function deriveOperationsSnapshot(records) {
  const expenses = records.expenses || [];
  const subscriptions = records.subscriptions || [];
  const budgets = records.budgets || [];
  const activeSubscriptions = subscriptions.filter(({ active }) => active);

  const recentActivity = [
    ...expenses.map((record) => recordActivity(record, "Finance", `Expense: ${record.title}`)),
  ]
    .filter(({ updatedAt }) => Boolean(updatedAt))
    .sort((left, right) => new Date(right.updatedAt) - new Date(left.updatedAt))
    .slice(0, 5);

  return {
    finance: {
      expenseTotal: expenses.reduce((total, record) => total + number(record.amount), 0),
      expenseCount: expenses.length,
      activeSubscriptions: activeSubscriptions.length,
      budgetCount: budgets.length,
    },
    currentFocus: null,
    recentActivity,
    empty: {
      finance: expenses.length === 0 && subscriptions.length === 0 && budgets.length === 0,
    },
  };
}

async function fetchTable(client, table, columns) {
  let query = client.from(table).select(columns).order("updated_at", { ascending: false }).limit(MAX_ROWS);
  query = query.is("deleted_at", null);
  if (table === "expenses") {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    query = query.gte("spent_on", monthStart.toISOString().slice(0, 10));
  }
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export function createOperationsService(client) {
  if (!client?.auth || !client?.from) {
    throw new Error("A Supabase client is required.");
  }

  return {
    async load() {
      const { data, error } = await client.auth.getSession();
      if (error) throw error;
      if (!data.session) return { authenticated: false, snapshot: null };

      const entries = await Promise.all(
        TABLE_QUERIES.map(async ([table, columns]) => [table, await fetchTable(client, table, columns)])
      );
      return {
        authenticated: true,
        snapshot: deriveOperationsSnapshot(Object.fromEntries(entries)),
      };
    },
  };
}
