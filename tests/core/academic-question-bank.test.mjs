import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  carryQuestionMetadata,
  createPracticeSession,
  createQuestionRepository,
  extractFilterOptions,
  extractPracticeTopics,
  filterQuestions,
  parseCsv,
  shuffleQuestionOptions,
  validateCsvRows,
  validateQuestionPayload,
  generateCsvTemplate,
  generateQuestionCsv,
  createQuestionBackup,
  validateQuestionBackup,
  reviewQuestionQuality,
} from "../../lib/hub/question-bank.mjs";
import { buildAcademicPerformance, buildSessionSnapshot } from "../../lib/hub/academic-performance.mjs";

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

test("Phase 35 keeps attempt history and creates an owner-scoped review schedule with SM-2 rating RPC", async () => {
  const sql = await readFile(new URL("../../supabase/migrations/035-academic-review-schedule.sql", import.meta.url), "utf8");
  assert.match(sql, /add column if not exists review_rating/);
  assert.match(sql, /add column if not exists correct_answer text/);
  assert.match(sql, /add column if not exists correct_answer_text text/);
  assert.match(sql, /add column if not exists reference_answer text/);
  assert.match(sql, /latest_attempt_failure_counted boolean not null default false/);
  assert.match(sql, /create table if not exists public\.academic_question_review_state/);
  assert.match(sql, /unique \(user_id, question_id\)/);
  assert.match(sql, /academic_question_review_state enable row level security/);
  assert.match(sql, /auth\.uid\(\) = user_id/);
  assert.match(sql, /create trigger track_academic_question_attempt/);
  assert.match(sql, /create or replace function public\.rate_academic_question_attempt/);
  assert.match(sql, /greatest\(1\.30/);
  assert.match(sql, /two consecutive Good\/Easy recalls/);
  assert.doesNotMatch(sql, /truncate\s+table|delete\s+from\s+public\.academic_question_attempts/i);
});

test("Phase 36 preserves old sessions and enables untimed owner-private practice history", async () => {
  const sql = await readFile(new URL("../../supabase/migrations/036-academic-practice-history.sql", import.meta.url), "utf8");
  assert.match(sql, /duration_minutes drop not null/i);
  assert.match(sql, /session_kind text not null default 'exam'/i);
  assert.match(sql, /check \(session_kind in \('exam', 'practice', 'mistakes', 'due'\)\)/i);
  assert.doesNotMatch(sql, /truncate\s+table|delete\s+from\s+public\.academic_exam_sessions/i);
});

test("Phase 37 restricts spaced-repetition ratings to essay without removing MCQ mistake history", async () => {
  const sql = await readFile(new URL("../../supabase/migrations/037-essay-only-spaced-repetition.sql", import.meta.url), "utf8");
  assert.match(sql, /new\.review_rating is null/i);
  assert.match(sql, /v_question_type is distinct from 'essay'/i);
  assert.match(sql, /before update of review_rating on public\.academic_question_attempts/i);
  const repository = await readFile(new URL("../../lib/hub/question-bank.mjs", import.meta.url), "utf8");
  assert.match(repository, /kind !== "mistakes" && \(question\.question_type \|\| "mcq"\) !== "essay"/);
  const practice = await readFile(new URL("../../components/hub/AcademicPracticePage.jsx", import.meta.url), "utf8");
  assert.match(practice, /run\.submitted && essay && <div className="academic-practice__review-rating"/);
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

test("practice topics are children of the currently selected exam type, block, and subject", () => {
  const questions = [
    { exam_type: "OSPE", block: "Hepatobilier", subject: "PK", topic: "Nutrisi pada Kelainan GIT" },
    { exam_type: "OSPE", block: "Hepatobilier", subject: "Biokimia", topic: "Metabolisme Bilirubin" },
    { exam_type: "MP", block: "Hepatobilier", subject: "PK", topic: "Pemeriksaan Laboratorium" },
  ];
  assert.deepEqual(extractPracticeTopics(questions, { examType: "OSPE", block: "Hepatobilier", subject: "PK" }), ["Nutrisi pada Kelainan GIT"]);
  assert.deepEqual(extractPracticeTopics(questions, { examType: "OSPE", block: "Hepatobilier" }), ["Metabolisme Bilirubin", "Nutrisi pada Kelainan GIT"]);
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
  const header = "\"exam_type\",\"block\",\"subject\",\"topic\",\"subtopic\",\"question_type\",\"question_text\",\"option_a\",\"option_b\",\"option_c\",\"option_d\",\"option_e\",\"correct_answer\",\"reference_answer\",\"explanation\",\"tags\",\"difficulty\",\"image_path\",\"is_bookmarked\"";
  const mcqRows = generateCsvTemplate("mcq").trimEnd().split("\n");
  const essayRows = generateCsvTemplate("essay").trimEnd().split("\n");

  assert.equal(mcqRows[0], header);
  assert.equal(essayRows[0], header);
  assert.equal(parseCsv(mcqRows[1])[0][5], "mcq");
  assert.equal(parseCsv(essayRows[1])[0][5], "essay");
  assert.equal(generateCsvTemplate().trimEnd(), header);
});

test("quality review validates batch questions and flags normalized existing and in-file duplicates", () => {
  const base = { question_type: "mcq", block: "Hepatobilier", subject: "PK", topic: "Bilirubin", question_text: "Apa fungsi enzim?", options: { A: "1", B: "2", C: "3", D: "4", E: "5" }, correct_answer: "A" };
  const reviewed = reviewQuestionQuality([base, { ...base, question_text: "  Apa   fungsi ENZIM? " }, { ...base, question_text: "Soal baru" }], [{ ...base, question_text: "Pertanyaan lain" }]);
  assert.equal(reviewed.valid.length, 3);
  assert.equal(reviewed.errors.length, 0);
  assert.deepEqual(reviewed.warnings.map((item) => item.rowNumber), [2]);
  assert.equal(reviewQuestionQuality([{ ...base, block: "" }]).errors.length, 1);
});

test("essay duplicate checks distinguish shared prompts with different reference answers", () => {
  const essay = { question_type: "essay", block: "Hepatobilier", subject: "PK", topic: "Bilirubin", question_text: "Jelaskan interpretasi hasil pemeriksaan.", reference_answer: "Interpretasi A" };
  const reviewed = reviewQuestionQuality([
    { ...essay, reference_answer: "Interpretasi B" },
    { ...essay, reference_answer: " interpretasi   b " },
  ], [essay]);

  assert.equal(reviewed.valid.length, 2);
  assert.deepEqual(reviewed.warnings.map(({ rowNumber }) => rowNumber), [2]);
});

test("CSV export round-trips all supported question metadata and marks possible duplicates", () => {
  const question = { question_type: "essay", block: "Hepatobilier", subject: "PK", question_text: "Jelaskan, singkat", reference_answer: "Jawaban", difficulty: "hard", image_path: "owner/q.webp", is_bookmarked: true, tags: ["bilirubin"] };
  const csv = generateQuestionCsv([question]);
  const parsed = validateCsvRows(csv, { existingQuestions: [question] });
  assert.equal(parsed.valid.length, 1);
  assert.equal(parsed.valid[0].difficulty, "hard");
  assert.equal(parsed.valid[0].image_path, "owner/q.webp");
  assert.equal(parsed.valid[0].is_bookmarked, true);
  assert.equal(parsed.warnings.length, 1);
});

test("JSON question backup is versioned, excludes owner identity, and safely reports duplicates", () => {
  const backup = createQuestionBackup([{ id: "db-id", user_id: "private-owner", image_url: "signed-url", question_type: "essay", block: "Block", question_text: "Question", reference_answer: "Answer", image_path: "owner/private.webp" }], "2026-10-26T00:00:00.000Z", { subjects: ["Subject"] });
  assert.equal(backup.version, 1);
  assert.equal(backup.questions[0].image_path, "owner/private.webp");
  assert.deepEqual(backup.categories.subjects, ["Subject"]);
  assert.equal("user_id" in backup.questions[0], false);
  assert.equal("image_url" in backup.questions[0], false);
  assert.equal(validateQuestionBackup(backup).valid.length, 1);
  assert.equal(validateQuestionBackup(backup, backup.questions).warnings.length, 1);
  assert.equal(validateQuestionBackup({ format: "other", version: 1, questions: [] }).errors.length, 1);
});

test("academic performance excludes essays from MCQ accuracy and calculates groups and session change", () => {
  const questions = [
    { id: "q1", block: "Hepatobilier", subject: "PK", question_type: "mcq" },
    { id: "q2", block: "Hepatobilier", subject: "PK", question_type: "mcq" },
    { id: "q3", block: "Hepatobilier", subject: "PK", question_type: "essay" },
    { id: "q4", block: "Hepatobilier", subject: "PK", question_type: "mcq" },
  ];
  const attempts = [
    { id: "a1", question_id: "q1", is_correct: false },
    { id: "a2", question_id: "q2", is_correct: false },
    { id: "a3", question_id: "q3", is_correct: null, response_text: "Essay" },
    { id: "a3", question_id: "q3", is_correct: null, response_text: "Essay" },
    { id: "a4", question_id: "q4", is_correct: false },
  ];
  const analytics = buildAcademicPerformance({ attempts, questions, sessions: [
    { id: "s1", status: "completed", accuracy_percent: 40, completed_at: "2026-01-01" },
    { id: "s2", status: "completed", accuracy_percent: 60, completed_at: "2026-01-02" },
  ] });
  assert.equal(analytics.totals.attempts, 4);
  assert.equal(analytics.totals.essays, 1);
  assert.equal(analytics.totals.accuracy, 0);
  assert.equal(analytics.byBlock[0].name, "Hepatobilier");
  assert.equal(analytics.weakAreas[0].accuracy, 0);
  assert.equal(analytics.accuracyChange, 20);
  assert.equal(buildAcademicPerformance().totals.accuracy, null);
});

test("session detail snapshot keeps unanswered, MCQ and essay review states distinct", () => {
  const snapshot = buildSessionSnapshot({ questions: [
    { id: "q1", question_text: "MCQ", options: {}, shuffledOptions: { A: "A" }, shuffledCorrectAnswer: "A" },
    { id: "q2", question_type: "essay", question_text: "Essay", reference_answer: "Reference" },
  ], responses: [
    { submitted: true, selectedAnswer: "A", isCorrect: true, timeSpentSeconds: 25 },
    { submitted: false, essayAnswer: "" },
  ] });
  assert.equal(snapshot[0].status, "correct");
  assert.equal(snapshot[0].timeSpentSeconds, 25);
  assert.equal(snapshot[1].status, "unanswered");
  assert.equal(snapshot[1].questionType, "essay");
});

test("practice attempts link to their owner-scoped session and sessions can be created or completed", async () => {
  const operations = [];
  let currentPayload;
  const client = { from(table) {
    return {
      insert(payload) { currentPayload = payload; operations.push({ table, operation: "insert", payload }); return this; },
      update(payload) { currentPayload = payload; operations.push({ table, operation: "update", payload }); return this; },
      eq() { return this; },
      select() { return this; },
      single: async () => ({ data: { id: "session-1", ...currentPayload }, error: null }),
    };
  } };
  const repository = createQuestionRepository(client);
  await repository.recordAttempt({ question_id: "q-1", exam_session_id: "session-1", selected_answer: "A", is_correct: false });
  await repository.recordEssayAttempt({ question_id: "q-2", exam_session_id: "session-1", response_text: "Answer" });
  await repository.createSession({ title: "Practice Session", session_kind: "practice", total_questions: 1, duration_minutes: null });
  await repository.completeSession("session-1", { score: 0, accuracy_percent: null, answers: [] });
  assert.equal(operations[0].payload.exam_session_id, "session-1");
  assert.equal(operations[1].payload.exam_session_id, "session-1");
  assert.equal(operations[2].payload.duration_minutes, null);
  assert.equal(operations[3].payload.status, "completed");
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
    correct_answer: "B",
    correct_answer_text: "Correct choice",
    is_correct: true,
    time_spent_seconds: 12,
  });
  assert.equal(inserted.question_id, "q1");
  assert.equal(inserted.is_correct, true);
  assert.equal(inserted.correct_answer_text, "Correct choice");
  await repo.recordEssayAttempt({ question_id: "q1", response_text: "My response", reference_answer: "Reference response", time_spent_seconds: 21 });
  assert.equal(inserted.response_text, "My response");
  assert.equal(inserted.reference_answer, "Reference response");

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

test("review repository deduplicates by question state and exposes due, mistake, and rating actions", async () => {
  const stateRows = [
    { question_id: "q-1", latest_attempt_id: "a-1", due_at: "2026-01-01T00:00:00Z", lapse_count: 2, attempts_count: 3, mastered: false },
    { question_id: "q-2", latest_attempt_id: "a-2", due_at: "2026-01-01T00:00:00Z", lapse_count: 1, attempts_count: 2, mastered: false },
  ];
  const tableRows = {
    academic_question_review_state: stateRows,
    academic_questions: [{ id: "q-1", question_type: "essay", question_text: "Question 1", deleted_at: null }, { id: "q-2", question_type: "mcq", question_text: "Question 2", deleted_at: null }],
    academic_question_attempts: [{ id: "a-1", question_id: "q-1", selected_answer: null, is_correct: null }, { id: "a-2", question_id: "q-2", selected_answer: "A", is_correct: false }],
  };
  const rpcCalls = [];
  const client = {
    from(table) {
      const filters = [];
      const builder = {
        select() { return builder; },
        eq(field, value) { filters.push((row) => row[field] === value); return builder; },
        gt(field, value) { filters.push((row) => row[field] > value); return builder; },
        lte(field, value) { filters.push((row) => row[field] <= value); return builder; },
        order() { return builder; },
        in(field, values) { filters.push((row) => values.includes(row[field])); return builder; },
        is(field, value) { filters.push((row) => row[field] === value); return builder; },
        then(resolve) { return resolve({ data: (tableRows[table] || []).filter((row) => filters.every((filter) => filter(row))), error: null }); },
      };
      return builder;
    },
    rpc(name, args) { rpcCalls.push({ name, args }); return Promise.resolve({ data: { id: args.p_attempt_id }, error: null }); },
  };
  const repository = createQuestionRepository(client);
  const mistakes = await repository.listMistakes();
  const due = await repository.listDueReviews();
  const unmastered = await repository.listUnmasteredReviews();
  assert.equal(mistakes.length, 2);
  assert.equal(mistakes[0].question.id, "q-1");
  assert.equal(mistakes[0].mistakeCount, 2);
  assert.equal(due.length, 1);
  assert.equal(due[0].question.question_type, "essay");
  assert.equal(unmastered.length, 1);
  await assert.rejects(() => repository.rateAttempt("a-2", "good", "mcq"), /only for essay/i);
  await repository.rateAttempt("a-1", "good", "essay");
  assert.deepEqual(rpcCalls, [{ name: "rate_academic_question_attempt", args: { p_attempt_id: "a-1", p_rating: "good" } }]);
});
