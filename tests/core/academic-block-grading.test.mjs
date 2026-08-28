import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { ACADEMIC_CHANNELS } from "../../lib/hub/module-config.mjs";
test("academic block grading captures all assessment components and calculates grade", async () => {
  const sql = await readFile(new URL("../../supabase-phase13-academic-block-grading.sql", import.meta.url), "utf8");
  for (const column of ["ospe", "osce", "soca_tutorial", "mp", "behavior", "final_score"]) assert.match(sql, new RegExp(column));
  assert.match(sql, /when score >= 75 then 'A'/);
  assert.match(sql, /when score >= 70 then 'B\+'/);
  assert.ok(ACADEMIC_CHANNELS[0].fields.some(({ name }) => name === "final_score" && true));
});
