const MAX_ROWS = 100;

const TABLE_QUERIES = Object.freeze([
  ["expenses", "id,title,amount,category,spent_on,updated_at"],
  ["subscriptions", "id,name,amount,billing_cycle,active,updated_at"],
  ["budgets", "id,name,limit_amount,period,updated_at"],
  ["study_topics", "id,title,subject,status,progress,updated_at"],
  ["hub_projects", "id,name,status,progress,updated_at"],
  ["project_tasks", "id,title,project_name,status,due_on,updated_at"],
  ["project_changelog", "id,title,project_name,logged_on,updated_at"],
]);

function number(value) {
  return Number(value || 0);
}

function average(values) {
  if (!values.length) return 0;
  return Math.round(values.reduce((total, value) => total + number(value), 0) / values.length);
}

function countBy(records, key) {
  return records.reduce((counts, record) => {
    const value = record[key] || "unknown";
    counts[value] = (counts[value] || 0) + 1;
    return counts;
  }, {});
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
  const topics = records.study_topics || [];
  const projects = records.hub_projects || [];
  const tasks = records.project_tasks || [];
  const changelog = records.project_changelog || [];

  const activeProjects = projects.filter(({ status }) => status === "active");
  const activeTopics = topics.filter(({ status }) => status === "active");
  const openTasks = tasks.filter(({ status }) => status !== "done");
  const activeSubscriptions = subscriptions.filter(({ active }) => active);
  const completedTasks = tasks.filter(({ status }) => status === "done");

  const focusProject = activeProjects[0];
  const focusTopic = activeTopics[0];
  const currentFocus = focusProject
    ? {
        type: "project",
        title: focusProject.name,
        detail: `${number(focusProject.progress)}% project progress`,
      }
    : focusTopic
      ? {
          type: "study",
          title: focusTopic.title,
          detail: `${number(focusTopic.progress)}% study progress`,
        }
      : null;

  const recentActivity = [
    ...expenses.map((record) => recordActivity(record, "Finance", `Expense: ${record.title}`)),
    ...topics.map((record) => recordActivity(record, "Study", `Topic: ${record.title}`)),
    ...projects.map((record) => recordActivity(record, "Projects", `Project: ${record.name}`)),
    ...tasks.map((record) => recordActivity(record, "Projects", `Task: ${record.title}`)),
    ...changelog.map((record) => recordActivity(record, "Projects", `Change: ${record.title}`)),
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
    study: {
      topicCount: topics.length,
      averageProgress: average(topics.map(({ progress }) => progress)),
      status: countBy(topics, "status"),
    },
    projects: {
      projectCount: projects.length,
      activeProjectCount: activeProjects.length,
      openTaskCount: openTasks.length,
      taskCompletion: tasks.length ? Math.round((completedTasks.length / tasks.length) * 100) : 0,
      status: countBy(projects, "status"),
    },
    currentFocus,
    recentActivity,
    empty: {
      finance: expenses.length === 0 && subscriptions.length === 0 && budgets.length === 0,
      study: topics.length === 0,
      projects: projects.length === 0 && tasks.length === 0 && changelog.length === 0,
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
