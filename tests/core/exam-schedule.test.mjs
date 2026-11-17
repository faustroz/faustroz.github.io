import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { buildExamPlan, daysUntil, EXAM_STATUS, formatCountdown, masteredQuestionIds, validateExamInput } from "../../lib/hub/exam-schedule.mjs";

const today = new Date(2026, 10, 17, 14, 30); // 17 Nov 2026, local time

test("migration 047 keeps the exam schedule owner-private", async () => {
  const sql = await readFile(new URL("../../supabase/migrations/047-academic-exam-schedule.sql", import.meta.url), "utf8");
  assert.match(sql, /create table if not exists public\.academic_exam_schedule/);
  assert.match(sql, /enable row level security/);
  for (const action of ["select", "insert", "update", "delete"]) assert.match(sql, new RegExp(`create policy "owner ${action}" on public\\.academic_exam_schedule`));
  assert.doesNotMatch(sql, /to anon/);
});

test("validateExamInput trims, nulls optional fields and rejects bad input", () => {
  assert.deepEqual(validateExamInput({ block: "  Blok 12 ", exam_type: " ", exam_date: "2026-12-01", notes: "" }), { block: "Blok 12", exam_type: null, exam_date: "2026-12-01", notes: null });
  assert.throws(() => validateExamInput({ block: "", exam_date: "2026-12-01" }), /Blok wajib/);
  assert.throws(() => validateExamInput({ block: "B", exam_date: "2026-02-31" }), /Tanggal ujian tidak valid/);
  assert.throws(() => validateExamInput({ block: "B", exam_date: "01/12/2026" }), /Tanggal ujian tidak valid/);
});

test("daysUntil counts whole local days regardless of the time of day", () => {
  assert.equal(daysUntil("2026-11-17", today), 0);
  assert.equal(daysUntil("2026-11-29", today), 12);
  assert.equal(daysUntil("2026-11-16", today), -1);
  assert.equal(daysUntil("nope", today), null);
});

test("masteredQuestionIds uses the latest attempt of each question only", () => {
  const ids = masteredQuestionIds([
    { question_id: "a", is_correct: false, created_at: "2026-11-01T10:00:00Z" },
    { question_id: "a", is_correct: true, created_at: "2026-11-02T10:00:00Z" },
    { question_id: "b", is_correct: true, created_at: "2026-11-01T10:00:00Z" },
    { question_id: "b", is_correct: false, created_at: "2026-11-03T10:00:00Z" },
    { question_id: "c", is_correct: null, self_assessed: true, created_at: "2026-11-01T10:00:00Z" },
  ]);
  assert.deepEqual([...ids].sort(), ["a", "c"]);
});

test("buildExamPlan derives the daily target from remaining questions and days left", () => {
  const questions = [
    ...Array.from({ length: 10 }, (_, index) => ({ id: `q${index}`, block: "Blok 12" })),
    { id: "other", block: "Blok 9" },
  ];
  const attempts = [
    { question_id: "q0", is_correct: true, created_at: new Date(2026, 10, 10, 9).toISOString() },
    { question_id: "q1", is_correct: true, created_at: new Date(2026, 10, 17, 8).toISOString() },
    { question_id: "q2", is_correct: false, created_at: new Date(2026, 10, 17, 9).toISOString() },
    { question_id: "other", is_correct: true, created_at: new Date(2026, 10, 17, 9).toISOString() },
  ];
  const exams = [
    { id: "e2", block: " blok 12 ", exam_type: "UKMPPD", exam_date: "2026-11-23" },
    { id: "e1", block: "Blok 9", exam_date: "2026-11-17" },
    { id: "old", block: "Blok 1", exam_date: "2026-11-01" },
  ];
  const plans = buildExamPlan({ exams, questions, attempts, today });
  assert.deepEqual(plans.map((plan) => plan.exam.id), ["e1", "e2", "old"]);
  const blok12 = plans.find((plan) => plan.exam.id === "e2");
  assert.equal(blok12.total, 10);
  assert.equal(blok12.mastered, 2);
  assert.equal(blok12.remaining, 8);
  assert.equal(blok12.daysLeft, 6);
  assert.equal(blok12.perDay, 2); // ceil(8 / 6)
  assert.equal(blok12.answeredToday, 2);
  assert.equal(blok12.status, EXAM_STATUS.SOON);
  assert.equal(formatCountdown(blok12), "H-6");
  const examDay = plans.find((plan) => plan.exam.id === "e1");
  assert.equal(examDay.status, EXAM_STATUS.TODAY);
  assert.equal(examDay.perDay, 0);
  assert.equal(formatCountdown(examDay), "Hari ini");
  const past = plans.find((plan) => plan.exam.id === "old");
  assert.equal(past.perDay, 0);
  assert.equal(formatCountdown(past), "Sudah lewat");
});
