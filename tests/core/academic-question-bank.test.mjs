import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  carryQuestionMetadata,
  createPracticeSession,
  createQuestionRepository,
  extractFilterOptions,
  filterQuestions,
  parseCsv,
  shuffleQuestionOptions,
  validateCsvRows,
  validateQuestionPayload,
  generateCsvTemplate,
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

test("Phase 32 migration extends existing questions, keeps categories and image storage private and owner-scoped", async () => {
  const sql = await readFile(new URL("../../supabase/migrations/032-medical-question-bank-upgrade.sql", import.meta.url), "utf8");
  for (const field of ["exam_type", "question_type", "subtopic", "reference_answer"]) assert.match(sql, new RegExp("add column if not exists " + field));
  assert.match(sql, /academic_question_categories enable row level security/);
  assert.match(sql, /auth\.uid\(\) = user_id/);
  assert.match(sql, /'academic-question-images', 'academic-question-images', false/);
  assert.match(sql, /storage\.foldername\(name\)\)\[1\] = auth\.uid\(\)::text/);
  assert.match(sql, /academic_question_attempts_answer_shape_check/);
});

test("Phase 33 removes implicit categories without deleting existing question data", async () => {
  const sql = await readFile(new URL("../../supabase/migrations/033-question-bank-no-default-categories.sql", import.meta.url), "utf8");
  assert.match(sql, /alter column exam_type drop default/);
  assert.match(sql, /alter column subject drop default/);
  assert.match(sql, /alter column exam_type drop not null/);
  assert.match(sql, /alter column subject drop not null/);
  assert.match(sql, /subject is null or length\(trim\(subject\)\) > 0/);
  assert.doesNotMatch(sql, /\bdelete\s+from\s+public\.academic_questions/i);
  assert.doesNotMatch(sql, /\btruncate\b/i);
});

test("Question Bank UI has no hardcoded exam-type or subject category seeds", async () => {
  const component = await readFile(new URL("../../components/hub/QuestionLibrary.jsx", import.meta.url), "utf8");
  assert.match(component, /useState\(\[\]\)/);
  assert.doesNotMatch(component, /useState\(\[\"MP\"|useState\(\[\"Anatomi\"/);
  assert.doesNotMatch(component, /setExamCategories\(\[\.\.\.new Set\(\[\"MP\"/);
  assert.doesNotMatch(component, /setSubjectCategories\(\[\.\.\.new Set\(\[\"Anatomi\"/);
});

test("permanent Trash deletion also removes private question image objects", async () => {
  const trash = await readFile(new URL("../../components/hub/TrashPanel.jsx", import.meta.url), "utf8");
  assert.match(trash, /item\.table === "academic_questions" && item\.row\.image_path/);
  assert.match(trash, /storage\.from\("academic-question-images"\)\.remove/);
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
});

test("question validation supports essay and does not invent exam or subject categories", () => {
  const essay = validateQuestionPayload({ question_type: "essay", exam_type: "OSPE", subject: "Biokimia", block: "Hepatobilier", topic: "Bilirubin", subtopic: "Konjugasi", question_text: "Jelaskan metabolisme bilirubin", reference_answer: "Bilirubin berasal dari heme.", tags: "heme, hati" });
  assert.equal(essay.question_type, "essay");
  assert.equal(essay.correct_answer, null);
  assert.deepEqual(essay.options, {});
  assert.equal(essay.exam_type, "OSPE");
  assert.throws(() => validateQuestionPayload({ question_type: "essay", question_text: "Essay tanpa rujukan" }), /Reference answer is required/);
  assert.throws(() => validateQuestionPayload({ question_type: "mcq", question_text: "MCQ tanpa opsi" }), /Option A cannot be empty/);
  assert.throws(() => validateQuestionPayload({ question_text: "No block", options: { A: "a", B: "b", C: "c", D: "d", E: "e" }, correct_answer: "A" }), /Block is required/);
  assert.equal(validateQuestionPayload({ question_text: "Legacy question", block: "Umum", options: { A: "a", B: "b", C: "c", D: "d", E: "e" }, correct_answer: "A" }).question_type, "mcq");
  const unclassified = validateQuestionPayload({ question_text: "No category yet", block: "Umum", options: { A: "a", B: "b", C: "c", D: "d", E: "e" }, correct_answer: "A" });
  assert.equal(unclassified.exam_type, null);
  assert.equal(unclassified.subject, null);
});

test("question image identity is a storage path, not an expiring URL", () => {
  const path = "owner-uuid/asset-uuid.webp";
  const question = validateQuestionPayload({ question_text: "Identify the specimen", question_type: "essay", block: "Histologi", reference_answer: "Reference", image_path: path });
  assert.equal(question.image_path, path);
  assert.equal(Object.hasOwn(question, "image_url"), false);
});

test("next question keeps classification selections but resets question-specific content", () => {
  assert.deepEqual(carryQuestionMetadata({ exam_type: "OSPE", block: "Hepatobilier", subject: "PK", topic: "Bilirubin", subtopic: "Konjugasi", question_type: "essay", difficulty: "hard", question_text: "Do not carry", tags: "not carried" }), {
    exam_type: "OSPE",
    block: "Hepatobilier",
    subject: "PK",
    topic: "Bilirubin",
    subtopic: "Konjugasi",
    question_type: "essay",
    difficulty: "hard",
  });
});

test("filters use exam type, subject, format, tags and search metadata", () => {
  const items = [
    { id: "mcq", exam_type: "OSPE", question_type: "mcq", subject: "Biokimia", topic: "Bilirubin", subtopic: "Konjugasi", tags: ["heme"] },
    { id: "essay", exam_type: "MP", question_type: "essay", subject: "Fisiologi", topic: "Bilirubin", tags: ["hepar"] },
  ];
  assert.deepEqual(filterQuestions(items, { examType: "OSPE", subject: "Biokimia", questionType: "mcq", tag: "heme", search: "konjugasi" }).map((item) => item.id), ["mcq"]);
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

test("shuffleQuestionOptions randomizes options while preserving correct answer identity", () => {
  const question = {
    id: "q-shuffle",
    question_text: "Gold standard test for acute coronary syndrome",
    options: {
      A: "Troponin I/T",
      B: "Chest X-ray",
      C: "Echocardiogram",
      D: "CBC",
      E: "Urinalysis",
    },
    correct_answer: "A",
  };

  const expectedCorrectText = "Troponin I/T";

  // Run multiple shuffle iterations
  for (let i = 0; i < 20; i++) {
    const shuffled = shuffleQuestionOptions(question);
    const newCorrectLetter = shuffled.shuffledCorrectAnswer;

    assert.ok(["A", "B", "C", "D", "E"].includes(newCorrectLetter));
    // Verify that whatever position newCorrectLetter is at, its value is the original correct option text!
    assert.equal(shuffled.shuffledOptions[newCorrectLetter], expectedCorrectText);

    // Verify all 5 option values are preserved
    const values = Object.values(shuffled.shuffledOptions).sort();
    const originalValues = Object.values(question.options).sort();
    assert.deepEqual(values, originalValues);
  }
});

test("createPracticeSession shuffles questions and initializes stable session questions", () => {
  const questions = [
    { id: "1", question_text: "Q1", options: { A: "1A", B: "1B", C: "1C", D: "1D", E: "1E" }, correct_answer: "B" },
    { id: "2", question_text: "Q2", options: { A: "2A", B: "2B", C: "2C", D: "2D", E: "2E" }, correct_answer: "C" },
    { id: "3", question_text: "Q3", options: { A: "3A", B: "3B", C: "3C", D: "3D", E: "3E" }, correct_answer: "D" },
  ];

  const session = createPracticeSession(questions);
  assert.equal(session.length, 3);
  for (const item of session) {
    assert.ok(item.shuffledOptions);
    assert.ok(item.shuffledCorrectAnswer);
    const expected = item.options[item.correct_answer];
    assert.equal(item.shuffledOptions[item.shuffledCorrectAnswer], expected);
  }
});

test("parseCsv and validateCsvRows correctly handle RFC-4180 CSV with quotes and validation", () => {
  const validCsv = `question,option_a,option_b,option_c,option_d,option_e,answer,explanation,block,topic
"Pasien sesak, wheezing positif. Terapi awal?","Salbutamol inhalasi","Antibiotik","Antihistamin","Kortikosteroid oral","Oksigen saja","A","SABA adalah lini pertama asma akut.","Blok 8","Respirasi"
"Demam 5 hari, trombositopenia. Uji torniket positif.","DHF","Tifoid","Malaria","Leptospirosis","Campak","A","","Blok 3","Tropis"`;

  const parsed = parseCsv(validCsv);
  assert.equal(parsed.length, 3);
  assert.equal(parsed[1][0], "Pasien sesak, wheezing positif. Terapi awal?");
  assert.equal(parsed[1][1], "Salbutamol inhalasi");

  const validated = validateCsvRows(validCsv);
  assert.equal(validated.errors.length, 0);
  assert.equal(validated.valid.length, 2);
  assert.equal(validated.valid[0].correct_answer, "A");
  assert.equal(validated.valid[0].options.A, "Salbutamol inhalasi");
  assert.equal(validated.valid[0].block, "Blok 8");

  // Invalid CSV: Missing columns and invalid answers
  const invalidCsv = `question,option_a,option_b,option_c,option_d,option_e,answer
"Pertanyaan tanpa opsi C","A","B","","D","E","A"
"Pertanyaan dengan kunci Z","A","B","C","D","E","Z"
"","A","B","C","D","E","B"`;

  const invalidResult = validateCsvRows(invalidCsv);
  assert.equal(invalidResult.errors.length, 3);
  assert.equal(invalidResult.errors[0].rowNumber, 2);
  assert.match(invalidResult.errors[0].reason, /Missing option\(s\): C/);
  assert.equal(invalidResult.errors[1].rowNumber, 3);
  assert.match(invalidResult.errors[1].reason, /Invalid answer 'Z'/);
  assert.equal(invalidResult.errors[2].rowNumber, 4);
  assert.match(invalidResult.errors[2].reason, /Question text is empty/);
});

test("CSV templates provide separate MCQ and Essay starter rows with required metadata columns", () => {
  const header = "\"exam_type\",\"block\",\"subject\",\"topic\",\"subtopic\",\"question_type\",\"question_text\",\"option_a\",\"option_b\",\"option_c\",\"option_d\",\"option_e\",\"correct_answer\",\"reference_answer\",\"explanation\",\"tags\"";
  const mcqRows = generateCsvTemplate("mcq").trimEnd().split("\n");
  const essayRows = generateCsvTemplate("essay").trimEnd().split("\n");

  assert.equal(mcqRows[0], header);
  assert.equal(essayRows[0], header);
  assert.equal(parseCsv(mcqRows[1])[0][5], "mcq");
  assert.equal(parseCsv(essayRows[1])[0][5], "essay");
  assert.equal(generateCsvTemplate().trimEnd(), header);
});

test("modern CSV preview validates MCQ and Essay rows without accepting invalid rows", () => {
  const csv = [
    "exam_type,block,subject,topic,subtopic,question_type,question_text,option_a,option_b,option_c,option_d,option_e,correct_answer,reference_answer,explanation,tags",
    'OSPE,Hepatobilier,Biokimia,Bilirubin,,mcq,"Enzim heme?",A,B,C,D,E,E,,"Penjelasan, singkat",heme;bilirubin',
    ["MP", "Hepatobilier", "Fisiologi", "Bilirubin", "", "essay", "Uraikan proses.", "", "", "", "", "", "", "Konversi dan konjugasi.", "Catatan", "bilirubin;hepar"].join(","),
    'MP,Hepatobilier,Fisiologi,Bilirubin,,essay,"Tanpa jawaban referensi.",,,,,,,,Catatan,bilirubin',
    'OSPE,Hepatobilier,Biokimia,Bilirubin,,mcq,"Kunci invalid",A,B,C,D,E,Z,,Catatan,heme',
  ].join("\n");
  const result = validateCsvRows(csv);
  assert.equal(result.valid.length, 2);
  assert.equal(result.errors.length, 2);
  assert.equal(result.valid[0].exam_type, "OSPE");
  assert.equal(result.valid[0].tags[1], "bilirubin");
  assert.equal(result.valid[1].question_type, "essay");
  assert.equal(result.valid[1].options && Object.keys(result.valid[1].options).length, 0);
});

test("CSV category validation accepts user-managed categories and never invents defaults", () => {
  const csv = [
    "exam_type,block,subject,question_type,question_text,option_a,option_b,option_c,option_d,option_e,correct_answer,reference_answer",
    "Ujian Buatan,Umum,Subjek Buatan,mcq,Pertanyaan,A,B,C,D,E,A,",
    "Default Asing,Umum,Subjek Buatan,mcq,Pertanyaan lain,A,B,C,D,E,A,",
    ",Umum,,mcq,Tanpa metadata,A,B,C,D,E,A,",
  ].join("\n");
  const result = validateCsvRows(csv, { examTypes: ["Ujian Buatan"], subjects: ["Subjek Buatan"] });
  assert.equal(result.valid.length, 2);
  assert.equal(result.errors.length, 1);
  assert.match(result.errors[0].reason, /belum terdaftar/);
  assert.equal(result.valid[0].exam_type, "Ujian Buatan");
  assert.equal(result.valid[1].exam_type, null);
  assert.equal(result.valid[1].subject, null);
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
                order() {
                  return Promise.resolve({ data: [], error: null });
                },
              };
            },
            order() {
              return Promise.resolve({ data: [], error: null });
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
            is(field, val) {
              return {
                eq(topicField, topicVal) {
                  return {
                    eq(blockField, blockVal) {
                      return {
                        select: async () => ({ data: [{ id: "q1" }, { id: "q2" }], error: null }),
                      };
                    },
                    select: async () => ({ data: [{ id: "q1" }, { id: "q2" }], error: null }),
                  };
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
    block: "Blok 1",
    options: { A: "1", B: "2", C: "3", D: "4", E: "5" },
    correct_answer: "B",
  });
  assert.equal(created.id, "new-id");
  assert.equal(inserted.correct_answer, "B");

  // Record attempt
  const attempt = await repo.recordAttempt({
    question_id: "q1",
    selected_answer: "B",
    is_correct: true,
    time_spent_seconds: 12,
  });
  assert.equal(inserted.question_id, "q1");
  assert.equal(inserted.is_correct, true);

  // Soft delete question
  await repo.remove("q1");
  assert.ok(updated.deleted_at);

  // Soft delete by topic
  const topicDelete = await repo.removeByTopic({ block: "Blok 1", topic: "Biologi" });
  assert.equal(topicDelete.deletedCount, 2);
  assert.deepEqual(topicDelete.deletedIds, ["q1", "q2"]);

  await assert.rejects(
    () => repo.removeByTopic({ topic: "" }),
    /A valid topic is required/
  );

  // Toggle bookmark
  const toggled = await repo.toggleBookmark("q1", false);
  assert.equal(toggled.is_bookmarked, true);
});
