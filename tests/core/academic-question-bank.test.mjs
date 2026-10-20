import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  createQuestionRepository,
  extractFilterOptions,
  filterQuestions,
  validateQuestionPayload,
} from "../../lib/hub/question-bank.mjs";

test("Phase 31 schema defines owner-scoped tables, RLS, and 30-day trash retention for Question Bank", async () => {
  const sql = await readFile(
    new URL("../../supabase/migrations/031-academic-question-bank.sql", import.meta.url),
    "utf8"
  );

  for (const table of ["academic_questions", "academic_question_attempts", "academic_exam_sessions"]) {
    assert.match(sql, new RegExp(`create table if not exists public\\.${table}`));
    assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`));
    assert.match(sql, new RegExp(`revoke all on public\\.${table} from anon`));
    assert.match(sql, new RegExp(`grant select, insert, update, delete on public\\.${table} to authenticated`));
  }

  assert.match(sql, /create policy "owner select academic_questions" on public\.academic_questions for select to authenticated using \(auth\.uid\(\) = user_id\)/);
  assert.match(sql, /create policy "owner insert academic_questions" on public\.academic_questions for insert to authenticated with check \(auth\.uid\(\) = user_id\)/);
  assert.match(sql, /create policy "owner update academic_questions" on public\.academic_questions for update to authenticated using \(auth\.uid\(\) = user_id\)/);
  assert.match(sql, /create policy "owner delete academic_questions" on public\.academic_questions for delete to authenticated using \(auth\.uid\(\) = user_id\)/);
  assert.match(sql, /'academic_questions'/);
  assert.match(sql, /'academic_exam_sessions'/);
  assert.match(sql, /purge_expired_hub_trash/);
});

test("validateQuestionPayload validates single-choice MCQs with 5 options (A-E)", () => {
  const valid = {
    question_text: "What is the primary pacemaker of the human heart?",
    options: {
      A: "Sinoatrial node",
      B: "Atrioventricular node",
      C: "Bundle of His",
      D: "Purkinje fibers",
      E: "Bachmann bundle",
    },
    correct_answer: "A",
    difficulty: "easy",
    subject: "Kedokteran",
    block: "Blok 5",
    topic: "Kardiovaskular",
    explanation: "The SA node spontaneously depolarizes at 60-100 bpm.",
    tags: ["cardiology", "electrophysiology"],
    is_bookmarked: true,
  };

  const parsed = validateQuestionPayload(valid);
  assert.equal(parsed.question_text, valid.question_text);
  assert.equal(parsed.options.A, "Sinoatrial node");
  assert.equal(parsed.correct_answer, "A");
  assert.equal(parsed.difficulty, "easy");
  assert.equal(parsed.is_bookmarked, true);
  assert.deepEqual(parsed.tags, ["cardiology", "electrophysiology"]);

  // Test missing question text
  assert.throws(
    () => validateQuestionPayload({ ...valid, question_text: "   " }),
    /Question text is required/
  );

  // Test missing one of the 5 options
  assert.throws(
    () => validateQuestionPayload({ ...valid, options: { ...valid.options, E: "" } }),
    /Option E cannot be empty/
  );

  // Test invalid correct answer
  assert.throws(
    () => validateQuestionPayload({ ...valid, correct_answer: "Z" }),
    /Correct answer must be one of: A, B, C, D, E/
  );

  // Test invalid difficulty
  assert.throws(
    () => validateQuestionPayload({ ...valid, difficulty: "impossible" }),
    /Difficulty must be one of: easy, medium, hard/
  );
});

test("filterQuestions and extractFilterOptions work accurately on question collections", () => {
  const sample = [
    {
      id: "q1",
      question_text: "Enzyme responsible for unwinding DNA",
      subject: "Kedokteran",
      block: "Blok 1",
      topic: "Biologi Molekuler",
      difficulty: "easy",
      is_bookmarked: true,
      options: { A: "DNA Helicase", B: "DNA Ligase", C: "DNA Polymerase", D: "Topoisomerase", E: "Primase" },
      explanation: "Helicase unwinds the double helix at replication forks.",
      tags: ["genetics", "biochem"],
    },
    {
      id: "q2",
      question_text: "First-line antihypertensive in diabetic nephropathy",
      subject: "Kedokteran",
      block: "Blok 5",
      topic: "Farmakologi",
      difficulty: "medium",
      is_bookmarked: false,
      options: { A: "ACE inhibitor", B: "Beta blocker", C: "Loop diuretic", D: "Thiazide", E: "Alpha blocker" },
      explanation: "ACE inhibitors reduce efferent arteriolar resistance.",
      tags: ["pharmacology", "renal"],
    },
  ];

  const extracted = extractFilterOptions(sample);
  assert.deepEqual(extracted.subjects, ["Kedokteran"]);
  assert.deepEqual(extracted.blocks, ["Blok 1", "Blok 5"]);
  assert.deepEqual(extracted.topics, ["Biologi Molekuler", "Farmakologi"]);

  // Search filter
  const searchResults = filterQuestions(sample, { search: "helicase" });
  assert.equal(searchResults.length, 1);
  assert.equal(searchResults[0].id, "q1");

  // Bookmark filter
  const bookmarked = filterQuestions(sample, { bookmarkedOnly: true });
  assert.equal(bookmarked.length, 1);
  assert.equal(bookmarked[0].id, "q1");

  // Block filter
  const block5 = filterQuestions(sample, { block: "Blok 5" });
  assert.equal(block5.length, 1);
  assert.equal(block5[0].id, "q2");
});

test("createQuestionRepository delegates to Supabase with proper checks", async () => {
  let queriedTable = "";
  let queryParams = {};
  let inserted = null;
  let updated = null;

  const fakeClient = {
    from(table) {
      queriedTable = table;
      return {
        select() {
          return {
            is() {
              return {
                order() {
                  return {
                    eq(field, val) {
                      queryParams[field] = val;
                      return { data: [{ id: "q1", question_text: "Sample" }], error: null };
                    },
                    then(resolve) {
                      resolve({ data: [{ id: "q1", question_text: "Sample" }], error: null });
                    },
                  };
                },
              };
            },
            eq(field, val) {
              return {
                is() {
                  return {
                    single: async () => ({ data: { id: val, question_text: "Single" }, error: null }),
                  };
                },
              };
            },
          };
        },
        insert(values) {
          inserted = values;
          return {
            select() {
              return {
                single: async () => ({ data: { id: "new-id", ...values }, error: null }),
              };
            },
          };
        },
        update(values) {
          updated = values;
          return {
            eq(field, val) {
              return {
                select() {
                  return {
                    single: async () => ({ data: { id: val, ...values }, error: null }),
                  };
                },
                then(resolve) {
                  resolve({ data: null, error: null });
                },
              };
            },
          };
        },
      };
    },
  };

  const repo = createQuestionRepository(fakeClient);

  // List questions
  const list = await repo.list();
  assert.equal(queriedTable, "academic_questions");
  assert.equal(list.length, 1);

  // Create question
  const created = await repo.create({
    question_text: "Test question",
    options: { A: "1", B: "2", C: "3", D: "4", E: "5" },
    correct_answer: "B",
  });
  assert.equal(created.id, "new-id");
  assert.equal(inserted.correct_answer, "B");

  // Soft delete question
  await repo.remove("q1");
  assert.ok(updated.deleted_at);

  // Toggle bookmark
  const toggled = await repo.toggleBookmark("q1", false);
  assert.equal(toggled.is_bookmarked, true);
});

