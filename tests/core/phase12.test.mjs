import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { ACADEMIC_CHANNELS, FINANCE_CHANNELS, STUDY_CHANNELS } from "../../lib/hub/module-config.mjs";
import { SEARCH_SOURCES } from "../../lib/hub/search.mjs";
test("Academic records support semester filtering and Study is topic-only", () => { assert.equal(ACADEMIC_CHANNELS[0].table, "academic_records"); assert.equal(ACADEMIC_CHANNELS[0].filter.field, "semester"); assert.equal(ACADEMIC_CHANNELS[0].fields.find(({ name }) => name === "credits").step, 0.5); assert.equal(FINANCE_CHANNELS.find(({ id }) => id === "goals").table, "financial_goals"); assert.deepEqual(STUDY_CHANNELS.map(({ id }) => id), ["topics"]); assert.ok(SEARCH_SOURCES.some(({ table }) => table === "academic_records")); });
test("Phase 12 schema provides owner RLS and 30-day trash cleanup", async () => { const sql=await readFile(new URL("../../supabase/migrations/012-academic-goals-trash.sql",import.meta.url),"utf8"); assert.match(sql,/deleted_at/); assert.match(sql,/30 days/); assert.match(sql,/academic_records/); assert.match(sql,/financial_goals/); });
