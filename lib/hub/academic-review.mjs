export const REVIEW_RATINGS = Object.freeze(["again", "hard", "good", "easy"]);

const ratingQuality = Object.freeze({ again: 0, hard: 3, good: 4, easy: 5 });

/** SM-2 inspired interval calculation. Incorrect attempts are capped at quality 1. */
export function calculateReviewSchedule(previous = {}, { rating, isCorrect = null, selfAssessed = null, now = new Date() } = {}) {
  if (!REVIEW_RATINGS.includes(rating)) throw new Error("Choose Again, Hard, Good, or Easy.");
  const previousEase = Number.isFinite(Number(previous.easeFactor)) ? Number(previous.easeFactor) : 2.5;
  const previousInterval = Math.max(0, Number(previous.intervalDays) || 0);
  const previousRepetitions = Math.max(0, Math.trunc(Number(previous.repetitions) || 0));
  const previousStreak = Math.max(0, Math.trunc(Number(previous.correctStreak) || 0));
  const previousLapses = Math.max(0, Math.trunc(Number(previous.lapseCount) || 0));
  const actualFailure = isCorrect === false || selfAssessed === false || (isCorrect == null && selfAssessed == null && rating === "again");
  const quality = actualFailure ? Math.min(ratingQuality[rating], 1) : ratingQuality[rating];
  const easeFactor = Math.max(1.3, previousEase + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));

  let intervalDays;
  let repetitions;
  if (quality < 3) {
    intervalDays = rating === "again" ? 1 / 96 : 1;
    repetitions = 0;
  } else if (previousRepetitions === 0) {
    intervalDays = quality === 5 ? 4 : 1;
    repetitions = 1;
  } else if (previousRepetitions === 1) {
    intervalDays = 6;
    repetitions = 2;
  } else {
    const multiplier = quality === 3 ? 1.2 : easeFactor * (quality === 5 ? 1.3 : 1);
    intervalDays = Math.max(1, Math.round(previousInterval * multiplier));
    repetitions = previousRepetitions + 1;
  }

  const successfulRecall = !actualFailure && quality >= 4;
  const correctStreak = successfulRecall ? previousStreak + 1 : 0;
  const mastered = !actualFailure && quality >= 4 && Boolean(previous.mastered || correctStreak >= 2);
  const dueAt = new Date(new Date(now).getTime() + intervalDays * 86_400_000).toISOString();

  return {
    rating,
    easeFactor,
    intervalDays,
    repetitions,
    correctStreak,
    lapseCount: previousLapses + (actualFailure ? 1 : 0),
    mastered,
    dueAt,
  };
}
