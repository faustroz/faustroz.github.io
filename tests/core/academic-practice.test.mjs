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
