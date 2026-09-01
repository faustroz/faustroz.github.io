const MAX_ROWS = 100;

const TABLE_QUERIES = Object.freeze([
  { table: "expenses", columns: "id,title,amount,category,spent_on,updated_at", currentMonth: true },
  { table: "subscriptions", columns: "id,name,amount,billing_cycle,next_billing_on,active,updated_at" },
  { table: "budgets", columns: "id,name,limit_amount,period,updated_at" },
  { table: "financial_goals", columns: "id,name,deadline,progress,updated_at" },
  { table: "academic_records", columns: "id,course_name,semester,grade,updated_at" },
  { table: "vault_documents", columns: "id,file_name,created_at,updated_at" },
  { table: "hub_notifications", columns: "id,kind,title,body,due_at,read_at,created_at", orderBy: "created_at", softDelete: false },
]);

function number(value) {
  return Number(value || 0);
}

function recordActivity(record, source, title) {
  return {
    id: `${source}-${record.id}`,
    source,
    title,
    updatedAt: record.updated_at || record.created_at,
  };
}

function latest(records, field = "updated_at") {
  return [...records]
    .filter((record) => record[field])
    .sort((left, right) => new Date(right[field]) - new Date(left[field]))[0] || null;
}

function daysUntil(date) {
  if (!date) return null;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const target = new Date(`${date}T00:00:00`);
  if (Number.isNaN(target.getTime())) return null;
  return Math.round((target - start) / 86_400_000);
}

function deadlineDetail(days, progress) {
  const progressText = Number.isFinite(Number(progress)) ? ` · ${Number(progress)}% complete` : "";
  if (days === null) return `Deadline recorded${progressText}`;
  if (days < 0) return `Overdue by ${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"}${progressText}`;
  if (days === 0) return `Due today${progressText}`;
  return `${days} day${days === 1 ? "" : "s"} remaining${progressText}`;
}

function deriveCurrentFocus({ notifications, financialGoals, subscriptions, academicRecords, vaultDocuments, expenses }) {
  const unreadNotification = latest(notifications.filter(({ read_at }) => !read_at), "created_at");
  if (unreadNotification) {
    return {
      source: "System",
      title: unreadNotification.title,
      detail: unreadNotification.body || "Unread system notification",
    };
  }

  const dueGoals = financialGoals
    .map((record) => ({ record, days: daysUntil(record.deadline) }))
    .filter(({ days }) => days !== null && days <= 30)
    .sort((left, right) => left.days - right.days);
  if (dueGoals[0]) {
    const { record, days } = dueGoals[0];
    return { source: "Finance", title: `Goal: ${record.name}`, detail: deadlineDetail(days, record.progress) };
  }

  const upcomingSubscriptions = subscriptions
    .filter(({ active }) => active)
    .map((record) => ({ record, days: daysUntil(record.next_billing_on) }))
    .filter(({ days }) => days !== null && days <= 7)
    .sort((left, right) => left.days - right.days);
  if (upcomingSubscriptions[0]) {
    const { record, days } = upcomingSubscriptions[0];
    return { source: "Finance", title: `Billing: ${record.name}`, detail: deadlineDetail(days) };
  }

  const academicRecord = latest(academicRecords);
  if (academicRecord) {
    const context = [academicRecord.semester, academicRecord.grade].filter(Boolean).join(" · ");
    return { source: "Academic", title: `Academic: ${academicRecord.course_name}`, detail: context || "Record updated" };
  }

  const vaultDocument = latest(vaultDocuments);
  if (vaultDocument) return { source: "Vault", title: `Vault: ${vaultDocument.file_name}`, detail: "Recent private document" };

  const expense = latest(expenses);
  if (expense) return { source: "Finance", title: `Expense: ${expense.title}`, detail: expense.category || "Recent cashflow entry" };

  return null;
}

export function deriveOperationsSnapshot(records) {
  const expenses = records.expenses || [];
  const subscriptions = records.subscriptions || [];
  const budgets = records.budgets || [];
  const financialGoals = records.financial_goals || [];
  const academicRecords = records.academic_records || [];
  const vaultDocuments = records.vault_documents || [];
  const notifications = records.hub_notifications || [];
  const activeSubscriptions = subscriptions.filter(({ active }) => active);

  const recentActivity = [
    ...expenses.map((record) => recordActivity(record, "Finance", `Expense: ${record.title}`)),
    ...financialGoals.map((record) => recordActivity(record, "Finance", `Goal: ${record.name}`)),
    ...academicRecords.map((record) => recordActivity(record, "Academic", `Academic: ${record.course_name}`)),
    ...vaultDocuments.map((record) => recordActivity(record, "Vault", `Vault: ${record.file_name}`)),
    ...notifications.map((record) => recordActivity(record, "System", record.title)),
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
    currentFocus: deriveCurrentFocus({ notifications, financialGoals, subscriptions, academicRecords, vaultDocuments, expenses }),
    recentActivity,
    empty: {
      finance: expenses.length === 0 && subscriptions.length === 0 && budgets.length === 0,
    },
  };
}

async function fetchTable(client, { table, columns, currentMonth = false, orderBy = "updated_at", softDelete = true }) {
  let query = client.from(table).select(columns).order(orderBy, { ascending: false }).limit(MAX_ROWS);
  if (softDelete) query = query.is("deleted_at", null);
  if (currentMonth) {
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
        TABLE_QUERIES.map(async (config) => [config.table, await fetchTable(client, config)])
      );
      return {
        authenticated: true,
        snapshot: deriveOperationsSnapshot(Object.fromEntries(entries)),
      };
    },
  };
}
