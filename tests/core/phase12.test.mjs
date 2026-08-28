import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { ACADEMIC_CHANNELS, FINANCE_CHANNELS } from "../../lib/hub/module-config.mjs";
import { SEARCH_SOURCES } from "../../lib/hub/search.mjs";
test("Phase 12 exposes academic records and real financial goals", () => { assert.equal(ACADEMIC_CHANNELS[0].table, "academic_records"); assert.equal(ACADEMIC_CHANNELS[0].fields.find(({ name }) => name === "credits").step, 0.5); assert.equal(FINANCE_CHANNELS.find(({ id }) => id === "goals").table, "financial_goals"); assert.ok(SEARCH_SOURCES.some(({ table }) => table === "academic_records")); });
test("Phase 12 schema provides owner RLS and 30-day trash cleanup", async () => { const sql=await readFile(new URL("../../supabase-phase12-academic-goals-trash.sql",import.meta.url),"utf8"); assert.match(sql,/deleted_at/); assert.match(sql,/30 days/); assert.match(sql,/academic_records/); assert.match(sql,/financial_goals/); });
