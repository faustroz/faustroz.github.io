import { createPracticeSession, VALID_OPTIONS } from "./question-bank.mjs";

export const PRACTICE_RUN_STORAGE_KEY = "4allx:academic-practice-run:v1";
export const PRACTICE_FILTER_STORAGE_KEY = "4allx:academic-practice-filters:v1";

export function createPracticeRun(questions, selection = {}) {
  if (!Array.isArray(questions) || questions.length === 0) return null;

  return {
    version: 1,
    block: typeof selection.block === "string" ? selection.block : "",
    topic: typeof selection.topic === "string" ? selection.topic : "",
    questions: createPracticeSession(questions),
    index: 0,
    selectedAnswer: "",
    submitted: false,
    finished: false,
    stats: { correct: 0, wrong: 0, incorrectQuestions: [] },
  };
}

export function isValidPracticeRun(value) {
  return Boolean(
    value &&
    value.version === 1 &&
    Array.isArray(value.questions) &&
    value.questions.length > 0 &&
    value.questions.every((question) =>
      question &&
      typeof question.id === "string" &&
      typeof question.question_text === "string" &&
      question.options &&
      VALID_OPTIONS.every((option) => typeof question.options[option] === "string") &&
      question.shuffledOptions &&
      VALID_OPTIONS.every((option) => typeof question.shuffledOptions[option] === "string") &&
      VALID_OPTIONS.includes(question.shuffledCorrectAnswer)
    ) &&
    Number.isInteger(value.index) &&
    value.index >= 0 &&
    value.index < value.questions.length &&
    (value.selectedAnswer === "" || VALID_OPTIONS.includes(value.selectedAnswer)) &&
    typeof value.submitted === "boolean" &&
    typeof value.finished === "boolean" &&
    value.stats &&
    Number.isInteger(value.stats.correct) &&
    Number.isInteger(value.stats.wrong) &&
    Array.isArray(value.stats.incorrectQuestions)
  );
}

export function readPracticeRun(storage) {
  try {
    const raw = storage?.getItem(PRACTICE_RUN_STORAGE_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw);
    return isValidPracticeRun(value) ? value : null;
  } catch {
    return null;
  }
}

export function writePracticeRun(storage, run) {
  if (!isValidPracticeRun(run) || typeof storage?.setItem !== "function") return false;
  try {
    storage?.setItem(PRACTICE_RUN_STORAGE_KEY, JSON.stringify(run));
    return true;
  } catch {
    return false;
  }
}

export function readPracticeFilters(storage) {
  try {
    const value = JSON.parse(storage?.getItem(PRACTICE_FILTER_STORAGE_KEY) || "null");
    if (!value || typeof value !== "object") return null;
    return {
      block: typeof value.block === "string" ? value.block : "",
      topic: typeof value.topic === "string" ? value.topic : "",
    };
  } catch {
    return null;
  }
}

export function writePracticeFilters(storage, filters) {
  if (typeof storage?.setItem !== "function") return false;
  try {
    storage?.setItem(PRACTICE_FILTER_STORAGE_KEY, JSON.stringify({
      block: typeof filters?.block === "string" ? filters.block : "",
      topic: typeof filters?.topic === "string" ? filters.topic : "",
    }));
    return true;
  } catch {
    return false;
  }
}
