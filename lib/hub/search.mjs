const MAX_ROWS_PER_SOURCE = 100;
const MAX_RESULTS_PER_GROUP = 8;

// This projection-based adapter keeps the UI independent from the retrieval
// method. A future full-text or vector adapter can return this same result shape.
export const SEARCH_SOURCES = Object.freeze([
  { group: "Finance", label: "Portfolio", table: "portfolio_tracker_store", route: "/finance/portfolio", adapter: "portfolio", fields: ["ticker", "assetName", "category", "notes", "type"], primary: "ticker", secondary: ["assetName", "category", "type"] },
  { group: "Finance", label: "Expenses", table: "expenses", route: "/finance", channel: "expenses", fields: ["title", "category", "notes"], primary: "title", secondary: ["category"] },
  { group: "Finance", label: "Budgets", table: "budgets", route: "/finance", channel: "budgets", fields: ["name", "period"], primary: "name", secondary: ["period"] },
  { group: "Finance", label: "Subscriptions", table: "subscriptions", route: "/finance", channel: "subscriptions", fields: ["name", "billing_cycle"], primary: "name", secondary: ["billing_cycle"] },
  { group: "Study", label: "Topics", table: "study_topics", route: "/study", channel: "topics", fields: ["title", "subject", "status"], primary: "title", secondary: ["subject", "status"] },
  { group: "Study", label: "Exams", table: "study_exams", route: "/study", channel: "exams", fields: ["title", "notes"], primary: "title", secondary: ["notes"] },
  { group: "Study", label: "Flashcards", table: "study_flashcards", route: "/study", channel: "flashcards", fields: ["front", "back", "topic"], primary: "front", secondary: ["topic"] },
  { group: "Projects", label: "Projects", table: "hub_projects", route: "/projects", channel: "projects", fields: ["name", "description", "status"], primary: "name", secondary: ["status", "description"] },
  { group: "Projects", label: "Tasks", table: "project_tasks", route: "/projects", channel: "tasks", fields: ["title", "project_name", "status"], primary: "title", secondary: ["project_name", "status"] },
  { group: "Projects", label: "Changelog", table: "project_changelog", route: "/projects", channel: "changelog", fields: ["title", "project_name", "details"], primary: "title", secondary: ["project_name", "details"] },
  { group: "AI Memory", label: "Memory", table: "ai_memory_entries", route: "/memory", channel: "memory", fields: ["title", "content", "kind", "tags"], primary: "title", secondary: ["kind", "tags"] },
  { group: "Documents", label: "Vault", table: "vault_documents", route: "/vault", fields: ["file_name", "folder", "tags", "mime_type"], primary: "file_name", secondary: ["folder", "tags"] },
]);

const GROUP_ORDER = ["Finance", "Study", "Projects", "AI Memory", "Documents"];

function normalize(value) {
  return String(value ?? "").toLocaleLowerCase();
}

function searchableText(record, fields) {
  return fields
    .flatMap((field) => Array.isArray(record[field]) ? record[field] : [record[field]])
    .map(normalize)
    .join(" ");
}

function compactSecondary(record, fields) {
  return fields
    .flatMap((field) => Array.isArray(record[field]) ? record[field] : [record[field]])
    .map((value) => String(value ?? "").trim())
    .filter(Boolean)
    .join(" · ");
}

export function buildSearchHref(source, record) {
  if (!source.channel) return source.route;
  const params = new URLSearchParams({ channel: source.channel });
  if (record.id) params.set("record", record.id);
  return `${source.route}?${params.toString()}`;
}

export function deriveSearchGroups(recordsByTable, query) {
  const terms = normalize(query).trim().split(/\s+/).filter(Boolean);
  if (!terms.length) return [];

  const grouped = new Map(GROUP_ORDER.map((group) => [group, []]));
  for (const source of SEARCH_SOURCES) {
    const records = recordsByTable[source.table] || [];
    const matches = records
      .filter((record) => {
        const text = searchableText(record, source.fields);
        return terms.every((term) => text.includes(term));
      })
      .slice(0, MAX_RESULTS_PER_GROUP)
      .map((record) => ({
        id: `${source.table}-${record.id}`,
        recordId: record.id,
        group: source.group,
        source: source.label,
        title: String(record[source.primary] ?? "Untitled record"),
        detail: compactSecondary(record, source.secondary),
        href: buildSearchHref(source, record),
      }));
    grouped.get(source.group).push(...matches);
  }

  return GROUP_ORDER
    .map((group) => ({ group, results: grouped.get(group).slice(0, MAX_RESULTS_PER_GROUP) }))
    .filter(({ results }) => results.length);
}

async function fetchSource(client, source) {
  if (source.adapter === "portfolio") {
    const { data, error } = await client
      .from(source.table)
      .select("key,value,updated_at")
      .eq("key", "pt_transactions")
      .maybeSingle();
    if (error) throw error;
    const transactions = Array.isArray(data?.value)
      ? data.value.map((transaction, index) => ({
          ...transaction,
          id: transaction.id || `${transaction.ticker || "asset"}-${transaction.date || index}`,
        }))
      : [];
    return [source.table, transactions];
  }

  const columns = ["id", ...source.fields].join(",");
  const { data, error } = await client
    .from(source.table)
    .select(columns)
    .limit(MAX_ROWS_PER_SOURCE);
  if (error) throw error;
  return [source.table, data || []];
}

export function createGlobalSearchService(client) {
  if (!client?.auth || !client?.from) {
    throw new Error("A Supabase client is required.");
  }

  return {
    async search(query) {
      const normalizedQuery = String(query || "").trim();
      const { data, error } = await client.auth.getSession();
      if (error) throw error;
      if (!data.session) return { authenticated: false, groups: [] };
      if (normalizedQuery.length < 2) return { authenticated: true, groups: [] };

      const entries = await Promise.all(SEARCH_SOURCES.map((source) => fetchSource(client, source)));
      return {
        authenticated: true,
        groups: deriveSearchGroups(Object.fromEntries(entries), normalizedQuery),
      };
    },
  };
}
