import test from "node:test";
import assert from "node:assert/strict";
import { calculateReviewSchedule } from "../../lib/hub/academic-review.mjs";

const now = new Date("2026-10-26T00:00:00.000Z");

test("wrong answers remain unmastered and return sooner even if rated Good", () => {
  const result = calculateReviewSchedule({ easeFactor: 2.5 }, { rating: "good", isCorrect: false, now });
  assert.equal(result.mastered, false);
  assert.equal(result.lapseCount, 1);
  assert.equal(result.repetitions, 0);
  assert.equal(result.intervalDays, 1);
});

test("Again schedules a short retry while a correct answer rated Good schedules SM-2 intervals", () => {
  const again = calculateReviewSchedule({}, { rating: "again", isCorrect: true, now });
  const good = calculateReviewSchedule({}, { rating: "good", isCorrect: true, now });
  assert.equal(again.intervalDays, 1 / 96);
  assert.equal(again.mastered, false);
  assert.equal(good.intervalDays, 1);
  assert.equal(good.repetitions, 1);
  assert.equal(good.correctStreak, 1);
});

test("Again on an essay without self-assessment is treated as a lapse", () => {
  const result = calculateReviewSchedule({}, { rating: "again", now });
  assert.equal(result.lapseCount, 1);
  assert.equal(result.mastered, false);
  assert.equal(result.intervalDays, 1 / 96);
});

test("two consecutive Good recalls establish mastery without deleting lapse history", () => {
  const first = calculateReviewSchedule({ lapseCount: 2 }, { rating: "good", isCorrect: true, now });
  const second = calculateReviewSchedule(first, { rating: "easy", isCorrect: true, now });
  assert.equal(first.mastered, false);
  assert.equal(first.intervalDays, 1);
  assert.equal(second.mastered, true);
  assert.equal(second.intervalDays, 6);
  assert.equal(second.lapseCount, 2);
});

test("Hard does not mark a question mastered and invalid ratings are rejected", () => {
  assert.equal(calculateReviewSchedule({ mastered: true, correctStreak: 2 }, { rating: "hard", isCorrect: true, now }).mastered, false);
  assert.throws(() => calculateReviewSchedule({}, { rating: "unknown", now }), /Again, Hard, Good, or Easy/);
});
