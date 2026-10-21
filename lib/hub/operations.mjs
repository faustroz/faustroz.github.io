import { GRADE_POINTS } from "./academic.mjs";

const MAX_ROWS = 100;

const TABLE_QUERIES = Object.freeze([
  { table: "expenses", columns: "id,title,amount,category,spent_on,created_at,updated_at" },
  { table: "income_entries", columns: "id,title,amount,category,received_on,created_at,updated_at" },
  { table: "subscriptions", columns: "id,name,amount,billing_cycle,next_billing_on,active,updated_at" },
  { table: "budgets", columns: "id,name,limit_amount,period,updated_at" },
  { table: "financial_goals", columns: "id,name,deadline,progress,updated_at" },
  { table: "academic_records", columns: "id,course_name,credits,semester,grade,created_at,updated_at" },
  { table: "academic_mku_records", columns: "id,course_name,credits,semester,grade,created_at,updated_at" },
  { table: "academic_question_attempts", columns: "id,is_correct,created_at", orderBy: "created_at", softDelete: false },
  { table: "vault_documents", columns: "id,file_name,created_at,updated_at" },
  { table: "hub_notifications", columns: "id,kind,title,body,due_at,read_at,created_at", orderBy: "created_at", softDelete: false },
]);

const number = (value) => Number(value || 0);
const monthKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

function recordActivity(record, source, title, href) {
  return {
    id: `${source}-${record.id}`,
    source,
    title,
    href,
    updatedAt: record.updated_at || record.created_at,
  };
}

function latest(records, field = "updated_at") {
  return [...records]
    .filter((record) => record[field] && !Number.isNaN(new Date(record[field]).getTime()))
    .sort((left, right) => new Date(right[field]) - new Date(left[field]))[0] || null;
}

function daysUntil(date, now = new Date()) {
  if (!date) return null;
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(`${date}T00:00:00`);
  if (Number.isNaN(target.getTime())) return null;
  return Math.round((target - start) / 86_400_000);
}

function deadlineDetail(days, progress) {
  const progressText = progress !== null && progress !== undefined && Number.isFinite(Number(progress)) ? ` · ${Number(progress)}% complete` : "";
  if (days === null) return `Deadline recorded${progressText}`;
  if (days < 0) return `Overdue by ${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"}${progressText}`;
  if (days === 0) return `Due today${progressText}`;
  return `${days} day${days === 1 ? "" : "s"} remaining${progressText}`;
}

function deriveCurrentFocus({ notifications, financialGoals, subscriptions, academicRecords, vaultDocuments, expenses, income }, now) {
  const unreadNotification = latest(notifications.filter(({ read_at }) => !read_at), "created_at");
  if (unreadNotification) return { source: "System", title: unreadNotification.title, detail: unreadNotification.body || "Unread system notification", href: "/insights" };

  const dueGoals = financialGoals
    .map((record) => ({ record, days: daysUntil(record.deadline, now) }))
    .filter(({ days }) => days !== null && days <= 30)
    .sort((left, right) => left.days - right.days);
  if (dueGoals[0]) {
    const { record, days } = dueGoals[0];
    return { source: "Finance", title: `Goal: ${record.name}`, detail: deadlineDetail(days, record.progress), href: "/finance" };
  }

  const upcomingSubscriptions = subscriptions
    .filter(({ active }) => active)
    .map((record) => ({ record, days: daysUntil(record.next_billing_on, now) }))
    .filter(({ days }) => days !== null && days <= 7)
    .sort((left, right) => left.days - right.days);
  if (upcomingSubscriptions[0]) {
    const { record, days } = upcomingSubscriptions[0];
    return { source: "Finance", title: `Billing: ${record.name}`, detail: deadlineDetail(days), href: "/finance" };
  }

  const academicRecord = latest(academicRecords);
  if (academicRecord) {
    const context = [academicRecord.semester && `Semester ${academicRecord.semester}`, academicRecord.grade].filter(Boolean).join(" · ");
    return { source: "Academic", title: academicRecord.course_name, detail: context || "Most recently updated grade", href: "/academic" };
  }

  const vaultDocument = latest(vaultDocuments);
  if (vaultDocument) return { source: "Vault", title: vaultDocument.file_name, detail: "Dokumen terakhir diperbarui", href: "/vault" };

  const recentCashflow = latest([...expenses, ...income]);
  if (recentCashflow) {
    const isIncome = income.some(({ id }) => id === recentCashflow.id);
    return { source: "Finance", title: recentCashflow.title || (isIncome ? "Income entry" : "Expense entry"), detail: isIncome ? "Income terakhir" : recentCashflow.category || "Expense terakhir", href: "/finance" };
  }

  return null;
}

export function deriveOperationsSnapshot(records, now = new Date()) {
  const expenses = records.expenses || [];
  const incomeEntries = records.income_entries || [];
  const subscriptions = records.subscriptions || [];
  const budgets = records.budgets || [];
  const financialGoals = records.financial_goals || [];
  const medicalRecords = records.academic_records || [];
  const mkuRecords = records.academic_mku_records || [];
  const academicRecords = [...medicalRecords, ...mkuRecords];
  const vaultDocuments = records.vault_documents || [];
  const notifications = records.hub_notifications || [];
  const attempts = records.academic_question_attempts || [];
  const currentMonth = monthKey(now);
  const monthExpenses = expenses.filter(({ spent_on }) => String(spent_on || "").startsWith(currentMonth));
  const monthIncome = incomeEntries.filter(({ received_on }) => String(received_on || "").startsWith(currentMonth));
  const activeSubscriptions = subscriptions.filter(({ active }) => active);
  const credits = academicRecords.reduce((sum, record) => sum + number(record.credits), 0);
  const points = academicRecords.reduce((sum, record) => sum + number(record.credits) * (GRADE_POINTS[record.grade] ?? 0), 0);
  const semesters = [...new Set(academicRecords.map(({ semester }) => String(semester || "")).filter(Boolean))];
  const latestSemester = [...semesters].sort((left, right) => right.localeCompare(left, undefined, { numeric: true }))[0] || null;
  const latestSemesterRecords = latestSemester ? academicRecords.filter((record) => String(record.semester || "") === latestSemester) : [];
  const latestSemesterCredits = latestSemesterRecords.reduce((sum, record) => sum + number(record.credits), 0);
  const latestSemesterPoints = latestSemesterRecords.reduce((sum, record) => sum + number(record.credits) * (GRADE_POINTS[record.grade] ?? 0), 0);

  const recentActivity = [
    ...expenses.map((record) => recordActivity(record, "Finance", `Expense · ${record.title || record.category || "New entry"}`, "/finance")),
    ...incomeEntries.map((record) => recordActivity(record, "Finance", `Income · ${record.title || record.category || "New entry"}`, "/finance")),
    ...financialGoals.map((record) => recordActivity(record, "Finance", `Goal · ${record.name}`, "/finance")),
    ...academicRecords.map((record) => recordActivity(record, "Academic", record.course_name, "/academic")),
    ...attempts.map((record) => recordActivity(record, "Academic", record.is_correct ? "Practice · correct answer" : "Practice · review needed", "/academic")),
    ...vaultDocuments.map((record) => recordActivity(record, "Vault", record.file_name, "/vault")),
    ...notifications.map((record) => recordActivity(record, "System", record.title, "/insights")),
  ]
    .filter(({ updatedAt }) => Boolean(updatedAt))
    .sort((left, right) => new Date(right.updatedAt) - new Date(left.updatedAt))
    .slice(0, 5);

  return {
    finance: {
      expenseTotal: monthExpenses.reduce((total, record) => total + number(record.amount), 0),
      expenseCount: monthExpenses.length,
      incomeTotal: monthIncome.reduce((total, record) => total + number(record.amount), 0),
      incomeCount: monthIncome.length,
      lastExpenseAdded: latest(expenses, "created_at"),
      activeSubscriptions: activeSubscriptions.length,
      budgetCount: budgets.length,
      hasData: Boolean(expenses.length || incomeEntries.length || subscriptions.length || budgets.length || financialGoals.length),
    },
    academic: {
      hasData: academicRecords.length > 0,
      recordCount: academicRecords.length,
      credits,
      ipk: credits ? points / credits : null,
      semesterCount: semesters.length,
      latestSemester,
      latestSemesterIp: latestSemesterCredits ? latestSemesterPoints / latestSemesterCredits : null,
      practiceCount: attempts.length,
      practiceAccuracy: attempts.length ? attempts.filter(({ is_correct }) => is_correct).length / attempts.length * 100 : null,
    },
    currentFocus: deriveCurrentFocus({ notifications, financialGoals, subscriptions, academicRecords, vaultDocuments, expenses, income: incomeEntries }, now),
    recentActivity,
    empty: {
      finance: !expenses.length && !incomeEntries.length && !subscriptions.length && !budgets.length,
      academic: academicRecords.length === 0,
    },
  };
}

async function fetchTable(client, { table, columns, orderBy = "updated_at", softDelete = true }) {
  let query = client.from(table).select(columns).order(orderBy, { ascending: false }).limit(MAX_ROWS);
  if (softDelete) query = query.is("deleted_at", null);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export function createOperationsService(client) {
  if (!client?.auth || !client?.from) throw new Error("A Supabase client is required.");

  return {
    async load(now = new Date()) {
      const { data, error } = await client.auth.getSession();
      if (error) throw error;
      if (!data.session) return { authenticated: false, snapshot: null };

      const entries = await Promise.all(TABLE_QUERIES.map(async (config) => [config.table, await fetchTable(client, config)]));
      return { authenticated: true, snapshot: deriveOperationsSnapshot(Object.fromEntries(entries), now) };
    },
  };
}
