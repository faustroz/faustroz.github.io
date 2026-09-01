const MAX_ROWS_PER_SOURCE = 100;
const MAX_RESULTS_PER_GROUP = 8;

// This projection-based adapter keeps the UI independent from the retrieval
// method. A future full-text or vector adapter can return this same result shape.
export const SEARCH_SOURCES = Object.freeze([
  { group: "Finance", label: "Goals", table: "financial_goals", route: "/finance", channel: "goals", fields: ["name", "notes", "progress", "deadline"], primary: "name", secondary: ["progress", "deadline"] },
  { group: "Finance", label: "Balances", table: "bank_accounts", route: "/finance", channel: "accounts", fields: ["name", "bank_name", "account_type"], primary: "name", secondary: ["bank_name", "account_type"] },
  { group: "Finance", label: "Portfolio", table: "portfolio_tracker_store", route: "/finance/portfolio", adapter: "portfolio", fields: ["ticker", "assetName", "category", "notes", "type"], primary: "ticker", secondary: ["assetName", "category", "type"] },
  { group: "Finance", label: "Expenses", table: "expenses", route: "/finance", channel: "expenses", fields: ["title", "category", "notes"], primary: "title", secondary: ["category"] },
  { group: "Finance", label: "Income", table: "income_entries", route: "/finance", channel: "income", fields: ["title", "category", "notes"], primary: "title", secondary: ["category"] },
  { group: "Finance", label: "Categories", table: "finance_categories", route: "/finance", channel: "categories", fields: ["name", "kind"], primary: "name", secondary: ["kind"] },
  { group: "Finance", label: "Budgets", table: "budgets", route: "/finance", channel: "budgets", fields: ["name", "period"], primary: "name", secondary: ["period"] },
  { group: "Finance", label: "Subscriptions", table: "subscriptions", route: "/finance", channel: "subscriptions", fields: ["name", "billing_cycle"], primary: "name", secondary: ["billing_cycle"] },
  { group: "Academic", label: "Academic", table: "academic_records", route: "/academic", fields: ["course_name", "semester", "block", "grade"], primary: "course_name", secondary: ["semester", "grade"] },
  { group: "Documents", label: "Vault file", table: "vault_documents", route: "/vault", fields: ["file_name", "folder", "tags", "mime_type"], optionalFields: ["search_text"], primary: "file_name", secondary: ["folder", "tags"] },
  { group: "Documents", label: "Vault folder", table: "vault_folders", route: "/vault", fields: ["name"], primary: "name", secondary: [] , softDelete: false },
  { group: "System", label: "Notification", table: "hub_notifications", route: "/hub", fields: ["title", "body", "kind"], primary: "title", secondary: ["kind"], softDelete: false },
]);

const GROUP_ORDER = ["Finance", "Academic", "Documents", "System"];

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
        const text = searchableText(record, [...source.fields, ...(source.optionalFields || [])]);
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

  const runQuery = async (fields) => {
    let query = client.from(source.table).select(["id", ...fields].join(","));
    if (source.softDelete !== false) query = query.is("deleted_at", null);
    return query.limit(MAX_ROWS_PER_SOURCE);
  };
  let { data, error } = await runQuery([...source.fields, ...(source.optionalFields || [])]);
  // Deploying the static frontend before the optional Vault content migration
  // must not break metadata search. Retry without optional projections.
  if (error && source.optionalFields?.length) ({ data, error } = await runQuery(source.fields));
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
