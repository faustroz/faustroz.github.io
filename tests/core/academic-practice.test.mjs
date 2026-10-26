import test from "node:test";
import assert from "node:assert/strict";
import {
  createPracticeRun,
  isValidPracticeRun,
  readPracticeRun,
  writePracticeRun,
} from "../../lib/hub/academic-practice.mjs";

const question = (id, answer = "C") => ({
  id,
  question_text: `Question ${id}`,
  options: { A: "one", B: "two", C: "three", D: "four", E: "five" },
  correct_answer: answer,
});

test("practice run shuffles once, keeps answer mapping valid, and round-trips through session storage", () => {
  const run = createPracticeRun([question("q-1"), question("q-2")], { block: "Block 1", topic: "Topic A" });
  assert.equal(isValidPracticeRun(run), true);
  assert.equal(run.questions.length, 2);
  assert.equal(run.block, "Block 1");
  assert.equal(run.topic, "Topic A");
  for (const item of run.questions) {
    assert.equal(item.shuffledOptions[item.shuffledCorrectAnswer], item.options[item.correct_answer]);
  }

  const store = new Map();
  const storage = {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => store.set(key, value),
  };
  assert.equal(writePracticeRun(storage, run), true);
  assert.deepEqual(readPracticeRun(storage), run);
});

test("practice run storage rejects malformed data and unavailable storage", () => {
  const storage = { getItem: () => '{"version":1,"questions":[]}' };
  assert.equal(readPracticeRun(storage), null);
  assert.equal(writePracticeRun(undefined, createPracticeRun([question("q-1")])), false);
  assert.equal(createPracticeRun([]), null);
});

test("practice runs preserve the selected mistake or due-review queue", () => {
  const review = createPracticeRun([question("q-1")], { reviewKind: "due" });
  assert.equal(review.reviewKind, "due");
  assert.equal(readPracticeRun({ getItem: () => JSON.stringify(review) }).reviewKind, "due");
  const normal = createPracticeRun([question("q-2")]);
  assert.equal(normal.reviewKind, "");
});

test("practice includes essays without MCQ grading and persists each answer in session state", () => {
  const essay = { id: "essay-1", question_text: "Explain", question_type: "essay", reference_answer: "Reference", options: {} };
  const run = createPracticeRun([essay], { examType: "MP", subject: "Fisiologi", questionType: "essay" });
  assert.equal(isValidPracticeRun(run), true);
  assert.equal(run.questions[0].shuffledCorrectAnswer, null);
  assert.equal(run.stats.correct, 0);
  assert.equal(run.responses.length, 1);
  assert.equal(run.examType, "MP");
  assert.equal(run.questions[0].reference_answer, "Reference");
});

test("practice run retains private image storage paths without persisting temporary signed URLs", () => {
  const run = createPracticeRun([{ ...question("image-q"), image_path: "owner-uuid/question.webp", image_url: "https://temporary.example/signed" }]);
  assert.equal(run.questions[0].image_path, "owner-uuid/question.webp");
  assert.equal(Object.hasOwn(run.questions[0], "image_url"), false);
});

test("legacy MCQ run remains readable and is upgraded to the response-aware session shape", () => {
  const current = createPracticeRun([question("legacy-q")]);
  const legacy = {
    ...current,
    version: 1,
    responses: undefined,
    essayAnswer: undefined,
    stats: { correct: 1, wrong: 0, incorrectQuestions: [] },
  };
  const storage = { getItem: () => JSON.stringify(legacy) };
  const restored = readPracticeRun(storage);
  assert.equal(restored.version, 2);
  assert.equal(restored.questions[0].question_type, undefined);
  assert.equal(restored.responses.length, 1);
  assert.equal(isValidPracticeRun(restored), true);
});
