import assert from "node:assert/strict";
import test from "node:test";
import {
  SEARCH_SOURCES,
  buildSearchHref,
  createGlobalSearchService,
  deriveSearchGroups,
} from "../../lib/hub/search.mjs";

test("search source contract covers every private operational module", () => {
  assert.deepEqual(
    [...new Set(SEARCH_SOURCES.map(({ group }) => group))],
    ["Finance", "Academic", "Documents", "System"]
  );
  assert.ok(SEARCH_SOURCES.some(({ label }) => label === "Portfolio"));
  assert.ok(SEARCH_SOURCES.some(({ table }) => table === "vault_documents"));
  assert.ok(SEARCH_SOURCES.some(({ table }) => table === "vault_folders"));
  assert.ok(SEARCH_SOURCES.some(({ table }) => table === "hub_notifications"));
  assert.equal(SEARCH_SOURCES.some(({ group }) => group === "OSINT"), false);
});

test("public global search never queries private tables", async () => {
  let queried = false;
  const search = createGlobalSearchService({
    auth: { getSession: async () => ({ data: { session: null }, error: null }) },
    from() { queried = true; throw new Error("private query must not run"); },
  });

  assert.deepEqual(await search.search("budget"), { authenticated: false, groups: [] });
  assert.equal(queried, false);
});

test("authenticated search is partial, case-insensitive, and groups owner-visible results", async () => {
  const records = {
    expenses: [{ id: "e1", title: "Cloud hosting", category: "Tools", notes: "Annual server" }],
    budgets: [], subscriptions: [],
    academic_records: [{ id: "a1", course_name: "Cloud architecture", semester: "1", block: "Blok 1", grade: "A" }],
  };
  const queriedTables = [];
  const search = createGlobalSearchService({
    auth: { getSession: async () => ({ data: { session: { user: { id: "owner" } } }, error: null }) },
    from(table) {
      queriedTables.push(table);
      return {
        select: () => {
          const query = {
            is: () => query,
            limit: async () => ({ data: records[table] || [], error: null }),
            eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }),
          };
          return query;
        },
      };
    },
  });

  const result = await search.search("CLOU");
  assert.equal(result.authenticated, true);
  assert.deepEqual(result.groups.map(({ group }) => group), ["Finance", "Academic"]);
  assert.equal(result.groups[0].results[0].title, "Cloud hosting");
  assert.equal(result.groups[1].results[0].title, "Cloud architecture");
  assert.equal(result.groups[0].results[0].href, "/finance?channel=expenses&record=e1");
  assert.equal(queriedTables.includes("ai_memory_entries"), false);
});

test("Vault document content is searchable when a private text projection exists", () => {
  const groups = deriveSearchGroups({
    vault_documents: [{ id: "v1", file_name: "notes.md", folder: "Academic", tags: [], mime_type: "text/markdown", search_text: "Cardiovascular physiology review" }],
  }, "vascular PHYS");

  assert.equal(groups[0].group, "Documents");
  assert.equal(groups[0].results[0].title, "notes.md");
});

test("short authenticated search does not fetch records", async () => {
  let queried = false;
  const search = createGlobalSearchService({
    auth: { getSession: async () => ({ data: { session: { user: { id: "owner" } } }, error: null }) },
    from() { queried = true; throw new Error("short query must not fetch"); },
  });

  assert.deepEqual(await search.search("a"), { authenticated: true, groups: [] });
  assert.equal(queried, false);
});

test("search href targets the matching module channel", () => {
  assert.equal(
    buildSearchHref({ route: "/finance", channel: "expenses" }, { id: "e1" }),
    "/finance?channel=expenses&record=e1"
  );
});
