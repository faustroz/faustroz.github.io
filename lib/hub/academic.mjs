export const GRADE_POINTS = Object.freeze({ A: 4, "A-": 3.7, "B+": 3.5, B: 3, "B-": 2.7, "C+": 2.5, C: 2, D: 1, E: 0 });

const validScore = (value) => typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100;

export function calculateOspeScore(pretest, ospeExam) {
  if (!validScore(pretest)) return null;
  const pretestContribution = pretest * 0.3;
  const minimumExam = (55 - pretestContribution) / 0.7;
  const examProvided = validScore(ospeExam);
  const finalScore = examProvided ? pretestContribution + ospeExam * 0.7 : null;

  return {
    pretestContribution,
    minimumExam,
    canReachPassingScore: minimumExam <= 100,
    alreadyMeetsMinimum: minimumExam <= 0,
    finalScore,
    passed: finalScore === null ? null : finalScore >= 55,
  };
}
