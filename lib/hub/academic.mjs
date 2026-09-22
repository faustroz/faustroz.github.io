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

export function calculateAcademicTarget(records, targetIp, remainingCredits) {
  if (!Number.isFinite(targetIp) || targetIp < 0 || targetIp > 4 || !Number.isFinite(remainingCredits) || remainingCredits <= 0) return null;
  const gradedRecords = (records || []).filter((record) => Number(record.credits) > 0 && Number.isFinite(GRADE_POINTS[record.grade]));
  const currentCredits = gradedRecords.reduce((total, record) => total + Number(record.credits), 0);
  const currentPoints = gradedRecords.reduce((total, record) => total + Number(record.credits) * GRADE_POINTS[record.grade], 0);
  const requiredAverage = (targetIp * (currentCredits + remainingCredits) - currentPoints) / remainingCredits;
  const recommendedGrade = Object.entries(GRADE_POINTS)
    .sort(([, left], [, right]) => left - right)
    .find(([, point]) => point >= requiredAverage)?.[0] || null;

  return {
    currentCredits,
    currentIp: currentCredits ? currentPoints / currentCredits : null,
    projectedCredits: currentCredits + remainingCredits,
    requiredAverage,
    achievable: requiredAverage <= 4,
    alreadySecured: requiredAverage <= 0,
    recommendedGrade,
  };
}
