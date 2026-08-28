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
    ["Finance", "Study", "Projects", "AI Memory"]
  );
  assert.ok(SEARCH_SOURCES.some(({ label }) => label === "Portfolio"));
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
    study_topics: [{ id: "s1", title: "Cloud architecture", subject: "Systems", status: "active" }],
    study_exams: [], study_flashcards: [],
    hub_projects: [{ id: "p1", name: "Hub refresh", description: "Cloud navigation", status: "active" }],
    project_tasks: [], project_changelog: [], ai_memory_entries: [],
  };
  const queriedTables = [];
  const search = createGlobalSearchService({
    auth: { getSession: async () => ({ data: { session: { user: { id: "owner" } } }, error: null }) },
    from(table) {
      queriedTables.push(table);
      return {
        select: () => ({
          limit: async () => ({ data: records[table] || [], error: null }),
          eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }),
        }),
      };
    },
  });

  const result = await search.search("CLOU");
  assert.equal(result.authenticated, true);
  assert.deepEqual(result.groups.map(({ group }) => group), ["Finance", "Study", "Projects"]);
  assert.equal(result.groups[0].results[0].title, "Cloud hosting");
  assert.equal(result.groups[1].results[0].title, "Cloud architecture");
  assert.equal(result.groups[2].results[0].title, "Hub refresh");
  assert.equal(result.groups[0].results[0].href, "/finance?channel=expenses&record=e1");
  assert.equal(queriedTables.includes("ai_memory_entries"), true);
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
    buildSearchHref({ route: "/memory", channel: "memory" }, { id: "m1" }),
    "/memory?channel=memory&record=m1"
  );
  assert.deepEqual(
    deriveSearchGroups({ ai_memory_entries: [{ id: "m1", title: "API preference", kind: "preference", tags: ["api"] }] }, "PREF"),
    [{ group: "AI Memory", results: [{ id: "ai_memory_entries-m1", recordId: "m1", group: "AI Memory", source: "Memory", title: "API preference", detail: "preference · api", href: "/memory?channel=memory&record=m1" }] }]
  );
});
