import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { calculateOspeScore } from "../../lib/hub/academic.mjs";
import { ACADEMIC_CHANNELS } from "../../lib/hub/module-config.mjs";

test("OSPE calculator uses the requested 30/70 formula and KKM 55", () => {
  const result = calculateOspeScore(50, 60);
  assert.equal(result.pretestContribution, 15);
  assert.equal(result.minimumExam.toFixed(2), "57.14");
  assert.equal(result.finalScore, 57);
  assert.equal(result.passed, true);
});

test("OSPE calculator handles missing exam input and invalid scores without inventing results", () => {
  const pending = calculateOspeScore(0, null);
  assert.equal(pending.minimumExam.toFixed(2), "78.57");
  assert.equal(pending.finalScore, null);
  assert.equal(pending.passed, null);
  assert.equal(calculateOspeScore(-1, 90), null);
  assert.equal(calculateOspeScore(101, 90), null);
});

test("MKU records are isolated from medical block assessments and owner scoped", async () => {
  const sql = await readFile(new URL("../../supabase/migrations/027-academic-mku-records.sql", import.meta.url), "utf8");
  const mku = ACADEMIC_CHANNELS.find(({ id }) => id === "mku");
  assert.equal(mku.table, "academic_mku_records");
  assert.deepEqual(mku.displayFields, ["course_name", "semester"]);
  assert.match(sql, /academic_mku_records/);
  assert.match(sql, /auth\.uid\(\) = user_id/);
  assert.match(sql, /deleted_at/);
  assert.doesNotMatch(sql, /calculate_academic_block_grade/);
});

test("Academic UI keeps MKU in the shared IP summary and switches only the entry fields", async () => {
  const panel = await readFile(new URL("../../components/hub/AcademicPanel.jsx", import.meta.url), "utf8");
  assert.match(panel, /const allRecords = \[\.\.\.records, \.\.\.mkuRecords\]/);
  assert.match(panel, /IPK dan IP per semester menghitung nilai blok serta MKU bersama-sama/);
  assert.match(panel, /BLOK KEDOKTERAN/);
  assert.match(panel, /MATA KULIAH UMUM/);
  assert.match(panel, /hidden=\{recordType !== "medical"\}/);
  assert.match(panel, /hidden=\{recordType !== "mku"\}/);
});
