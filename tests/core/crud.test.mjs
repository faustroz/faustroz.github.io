import assert from "node:assert/strict";
import test from "node:test";
import { createCrudRepository } from "../../lib/hub/crud.mjs";

function createQuery(response, calls) {
  const query = {
    select(columns) { calls.push(["select", columns]); return query; },
    is(column, value) { calls.push(["is", column, value]); return query; },
    order(column, options) { calls.push(["order", column, options]); return Promise.resolve(response); },
    insert(values) { calls.push(["insert", values]); return query; },
    update(values) { calls.push(["update", values]); return query; },
    delete() { calls.push(["delete"]); return query; },
    eq(column, value) { calls.push(["eq", column, value]); return query; },
    single() { calls.push(["single"]); return Promise.resolve(response); },
    then(resolve, reject) { return Promise.resolve(response).then(resolve, reject); },
  };
  return query;
}

test("CRUD repository lists owner-visible records in configured order", async () => {
  const calls = [];
  const rows = [{ id: "expense-1", title: "Lunch" }];
  const client = {
    from(table) {
      calls.push(["from", table]);
      return createQuery({ data: rows, error: null }, calls);
    },
  };

  const repository = createCrudRepository(client, "expenses", {
    orderBy: "spent_on",
  });
  assert.deepEqual(await repository.list(), rows);
  assert.deepEqual(calls, [
    ["from", "expenses"],
    ["select", "*"],
    ["is", "deleted_at", null],
    ["order", "spent_on", { ascending: false }],
  ]);
});

test("CRUD repository creates, updates, and deletes records", async () => {
  const calls = [];
  const saved = { id: "budget-1", name: "Monthly" };
  const client = {
    from(table) {
      calls.push(["from", table]);
      return createQuery({ data: saved, error: null }, calls);
    },
  };
  const repository = createCrudRepository(client, "budgets");

  assert.equal((await repository.create({ name: "Monthly" })).id, "budget-1");
  assert.equal((await repository.update("budget-1", { name: "Core" })).id, "budget-1");
  await repository.remove("budget-1");

  assert.ok(calls.some(([method]) => method === "insert"));
  assert.ok(calls.some(([method]) => method === "update"));
  assert.ok(calls.some(([method]) => method === "update"));
  assert.ok(calls.some((call) => call[0] === "eq" && call[2] === "budget-1"));
});

test("CRUD repository rejects invalid ids and Supabase errors", async () => {
  const repository = createCrudRepository(
    {
      from() {
        return createQuery({ data: null, error: new Error("RLS denied") }, []);
      },
    },
    "ai_memory_entries"
  );

  await assert.rejects(() => repository.update("", {}), /record id/i);
  await assert.rejects(() => repository.list(), /RLS denied/);
});
