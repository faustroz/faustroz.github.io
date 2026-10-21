import { createPracticeSession, VALID_OPTIONS } from "./question-bank.mjs";

export const PRACTICE_RUN_STORAGE_KEY = "4allx:academic-practice-run:v1";
export const PRACTICE_FILTER_STORAGE_KEY = "4allx:academic-practice-filters:v1";

export function createPracticeRun(questions, selection = {}) {
  if (!Array.isArray(questions) || questions.length === 0) return null;

  const sessionQuestions = createPracticeSession(questions);
  return {
    version: 2,
    examType: typeof selection.examType === "string" ? selection.examType : "",
    block: typeof selection.block === "string" ? selection.block : "",
    subject: typeof selection.subject === "string" ? selection.subject : "",
    topic: typeof selection.topic === "string" ? selection.topic : "",
    questionType: typeof selection.questionType === "string" ? selection.questionType : "",
    questions: sessionQuestions,
    index: 0,
    selectedAnswer: "",
    essayAnswer: "",
    submitted: false,
    finished: false,
    responses: sessionQuestions.map(() => ({ selectedAnswer: "", essayAnswer: "", submitted: false, isCorrect: null, selfAssessed: null })),
    stats: { correct: 0, wrong: 0, unanswered: 0, essaysToReview: 0, incorrectQuestions: [] },
  };
}

export function isValidPracticeRun(value) {
  return Boolean(
    value &&
      [1, 2].includes(value.version) &&
    Array.isArray(value.questions) &&
    value.questions.length > 0 &&
    value.questions.every((question) => question && typeof question.id === "string" && typeof question.question_text === "string" && (
      ((question.question_type || "mcq") === "essay" && typeof question.reference_answer === "string") ||
      (question.options && VALID_OPTIONS.every((option) => typeof question.options[option] === "string") &&
        question.shuffledOptions && VALID_OPTIONS.every((option) => typeof question.shuffledOptions[option] === "string") &&
        VALID_OPTIONS.includes(question.shuffledCorrectAnswer))
    )) &&
    Number.isInteger(value.index) &&
    value.index >= 0 &&
    value.index < value.questions.length &&
    (value.selectedAnswer === "" || VALID_OPTIONS.includes(value.selectedAnswer)) &&
    (value.version === 1 || (typeof value.essayAnswer === "string" && Array.isArray(value.responses) && value.responses.length === value.questions.length)) &&
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
    if (!isValidPracticeRun(value)) return null;
    if (value.version === 1) {
      const responses = value.questions.map((question, index) => ({
        selectedAnswer: index === value.index ? value.selectedAnswer : "",
        essayAnswer: "",
        submitted: index === value.index && value.submitted,
        isCorrect: index === value.index ? value.lastAnswerCorrect ?? null : null,
        selfAssessed: null,
      }));
      return {
        ...value,
        version: 2,
        examType: "",
        subject: "",
        questionType: "",
        essayAnswer: "",
        responses,
        stats: { ...value.stats, unanswered: 0, essaysToReview: 0 },
      };
    }
    return value;
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
      examType: typeof value.examType === "string" ? value.examType : "",
      block: typeof value.block === "string" ? value.block : "",
      subject: typeof value.subject === "string" ? value.subject : "",
      topic: typeof value.topic === "string" ? value.topic : "",
      questionType: typeof value.questionType === "string" ? value.questionType : "",
      count: typeof value.count === "string" ? value.count : "all",
    };
  } catch {
    return null;
  }
}

export function writePracticeFilters(storage, filters) {
  if (typeof storage?.setItem !== "function") return false;
  try {
    storage?.setItem(PRACTICE_FILTER_STORAGE_KEY, JSON.stringify({
      examType: typeof filters?.examType === "string" ? filters.examType : "",
      block: typeof filters?.block === "string" ? filters.block : "",
      subject: typeof filters?.subject === "string" ? filters.subject : "",
      topic: typeof filters?.topic === "string" ? filters.topic : "",
      questionType: typeof filters?.questionType === "string" ? filters.questionType : "",
      count: typeof filters?.count === "string" ? filters.count : "all",
    }));
    return true;
  } catch {
    return false;
  }
}
