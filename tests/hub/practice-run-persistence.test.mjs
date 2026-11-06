import { describe, expect, it } from "vitest";
import {
  PRACTICE_RUN_STORAGE_KEY,
  clearPracticeRun,
  createPracticeRun,
  describePracticeRun,
  getPracticeRunStorage,
  migratePracticeRun,
  readPracticeRun,
  writePracticeRun,
} from "@/lib/hub/academic-practice.mjs";

function makeStorage({ failWrites = false } = {}) {
  const map = new Map();
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => { if (failWrites) throw new Error("quota"); map.set(key, String(value)); },
    removeItem: (key) => map.delete(key),
    _map: map,
  };
}

function makeQuestions(count = 3) {
  return Array.from({ length: count }, (unused, index) => ({
    id: `q${index}`,
    question_text: `Pertanyaan ${index}`,
    question_type: "mcq",
    options: { A: "a", B: "b", C: "c", D: "d", E: "e" },
    correct_answer: "A",
  }));
}

describe("practice run storage selection", () => {
  it("prefers localStorage so a run survives closing the tab", () => {
    const win = { localStorage: makeStorage(), sessionStorage: makeStorage() };
    expect(getPracticeRunStorage(win)).toBe(win.localStorage);
  });

  it("falls back to sessionStorage when localStorage refuses writes", () => {
    const win = { localStorage: makeStorage({ failWrites: true }), sessionStorage: makeStorage() };
    expect(getPracticeRunStorage(win)).toBe(win.sessionStorage);
  });

  it("returns null when neither store exists", () => {
    expect(getPracticeRunStorage({})).toBe(null);
  });
});

describe("migratePracticeRun", () => {
  it("carries a run left in sessionStorage over to localStorage once", () => {
    const win = { localStorage: makeStorage(), sessionStorage: makeStorage() };
    const run = createPracticeRun(makeQuestions(), {});
    writePracticeRun(win.sessionStorage, run);

    const migrated = migratePracticeRun(win);
    expect(migrated?.questions).toHaveLength(3);
    expect(win.localStorage.getItem(PRACTICE_RUN_STORAGE_KEY)).toBeTruthy();
    expect(win.sessionStorage.getItem(PRACTICE_RUN_STORAGE_KEY)).toBe(null);
  });

  it("keeps the localStorage run when both stores hold one", () => {
    const win = { localStorage: makeStorage(), sessionStorage: makeStorage() };
    writePracticeRun(win.localStorage, createPracticeRun(makeQuestions(5), {}));
    writePracticeRun(win.sessionStorage, createPracticeRun(makeQuestions(2), {}));
    expect(migratePracticeRun(win)?.questions).toHaveLength(5);
  });

  it("returns null when there is nothing saved anywhere", () => {
    expect(migratePracticeRun({ localStorage: makeStorage(), sessionStorage: makeStorage() })).toBe(null);
  });
});

describe("clearPracticeRun", () => {
  it("removes the run from both stores", () => {
    const win = { localStorage: makeStorage(), sessionStorage: makeStorage() };
    writePracticeRun(win.localStorage, createPracticeRun(makeQuestions(), {}));
    writePracticeRun(win.sessionStorage, createPracticeRun(makeQuestions(), {}));
    clearPracticeRun(win);
    expect(readPracticeRun(win.localStorage)).toBe(null);
    expect(readPracticeRun(win.sessionStorage)).toBe(null);
  });
});

describe("describePracticeRun", () => {
  it("summarises progress for the resume prompt", () => {
    const run = createPracticeRun(makeQuestions(4), { startedAt: "2026-11-06T10:00:00.000Z" });
    run.index = 2;
    run.responses[0].submitted = true;
    run.responses[1].submitted = true;
    const summary = describePracticeRun(run);
    expect(summary).toMatchObject({ answered: 2, total: 4, position: 3, startedAt: "2026-11-06T10:00:00.000Z" });
  });

  it("offers nothing for a finished or invalid run", () => {
    const run = createPracticeRun(makeQuestions(), {});
    expect(describePracticeRun({ ...run, finished: true })).toBe(null);
    expect(describePracticeRun(null)).toBe(null);
    expect(describePracticeRun({ version: 3, questions: [] })).toBe(null);
  });
});

describe("answer progress round-trip", () => {
  it("restores the answers and position written mid-session", () => {
    const win = { localStorage: makeStorage(), sessionStorage: makeStorage() };
    const run = createPracticeRun(makeQuestions(3), {});
    run.index = 1;
    run.selectedAnswer = "B";
    run.responses[0] = { ...run.responses[0], selectedAnswer: "A", submitted: true, isCorrect: true };
    run.stats = { ...run.stats, correct: 1 };
    expect(writePracticeRun(getPracticeRunStorage(win), run)).toBe(true);

    const restored = readPracticeRun(win.localStorage);
    expect(restored.index).toBe(1);
    expect(restored.selectedAnswer).toBe("B");
    expect(restored.responses[0]).toMatchObject({ selectedAnswer: "A", submitted: true, isCorrect: true });
    expect(restored.stats.correct).toBe(1);
  });
});
