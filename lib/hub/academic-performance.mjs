const keyFor = (value) => String(value || "Tanpa kategori");

function summarizeMcq(attempts) {
  const graded = attempts.filter((attempt) => (attempt.question_type || "mcq") !== "essay" && attempt.response_text == null && typeof attempt.is_correct === "boolean");
  const correct = graded.filter((attempt) => attempt.is_correct).length;
  return { attempted: attempts.length, graded: graded.length, correct, wrong: graded.length - correct, accuracy: graded.length ? Math.round((correct / graded.length) * 100) : null };
}

export function buildAcademicPerformance({ attempts = [], sessions = [], questions = [] } = {}) {
  const questionById = new Map(questions.map((question) => [question.id, question]));
  const uniqueAttempts = [...new Map(attempts.filter((attempt) => attempt?.id).map((attempt) => [attempt.id, attempt])).values()];
  const enriched = uniqueAttempts.map((attempt) => ({ ...attempt, ...(questionById.get(attempt.question_id) || {}) }));
  const mcqAttempts = enriched.filter((attempt) => (attempt.question_type || "mcq") !== "essay" && attempt.response_text == null && typeof attempt.is_correct === "boolean");
  const groupBy = (field) => {
    const groups = new Map();
    mcqAttempts.forEach((attempt) => {
      const key = keyFor(attempt[field]);
      groups.set(key, [...(groups.get(key) || []), attempt]);
    });
    return [...groups.entries()].map(([name, rows]) => ({ category: field === "block" ? "Blok" : "Subject", name, ...summarizeMcq(rows) }))
      .sort((a, b) => a.accuracy - b.accuracy || b.graded - a.graded);
  };
  const completed = sessions.filter((session) => session.status === "completed").sort((a, b) => new Date(a.completed_at || a.created_at) - new Date(b.completed_at || b.created_at));
  const sessionTrend = completed.map((session) => ({
    id: session.id,
    at: session.completed_at || session.created_at,
    accuracy: session.accuracy_percent !== null && session.accuracy_percent !== undefined && session.accuracy_percent !== "" && Number.isFinite(Number(session.accuracy_percent)) ? Number(session.accuracy_percent) : null,
  })).filter((session) => session.accuracy !== null);
  const accuracyChange = sessionTrend.length >= 2 ? sessionTrend.at(-1).accuracy - sessionTrend.at(-2).accuracy : null;
  const byBlock = groupBy("block");
  const bySubject = groupBy("subject");
  return {
    totals: {
      attempts: uniqueAttempts.length,
      mcqGraded: mcqAttempts.length,
      correct: mcqAttempts.filter((attempt) => attempt.is_correct).length,
      wrong: mcqAttempts.filter((attempt) => !attempt.is_correct).length,
      essays: enriched.filter((attempt) => attempt.question_type === "essay" || attempt.response_text != null).length,
      accuracy: summarizeMcq(mcqAttempts).accuracy,
    },
    byBlock,
    bySubject,
    weakAreas: [...byBlock, ...bySubject].filter((item) => item.graded >= 3 && item.accuracy < 60),
    sessions: [...sessions].sort((a, b) => new Date(b.started_at || b.created_at) - new Date(a.started_at || a.created_at)),
    sessionTrend,
    accuracyChange,
  };
}

export function buildSessionSnapshot(run) {
  return run.questions.map((question, index) => {
    const response = run.responses[index] || {};
    const essay = question.question_type === "essay";
    const selected = response.selectedAnswer || "";
    return {
      questionId: question.id,
      examType: question.exam_type || null,
      block: question.block || null,
      subject: question.subject || null,
      topic: question.topic || null,
      questionType: essay ? "essay" : "mcq",
      questionText: question.question_text,
      options: essay ? null : question.shuffledOptions,
      selectedAnswer: selected || null,
      selectedAnswerText: selected ? question.shuffledOptions?.[selected] || null : null,
      correctAnswer: essay ? null : question.shuffledCorrectAnswer,
      correctAnswerText: essay ? null : question.shuffledOptions?.[question.shuffledCorrectAnswer] || null,
      isCorrect: essay || !response.submitted ? null : Boolean(response.isCorrect),
      essayAnswer: essay ? response.essayAnswer || "" : null,
      referenceAnswer: essay ? question.reference_answer : null,
      explanation: question.explanation || null,
      timeSpentSeconds: Number.isFinite(Number(response.timeSpentSeconds)) ? Math.max(0, Number(response.timeSpentSeconds)) : null,
      status: !response.submitted ? "unanswered" : essay ? "essay" : response.isCorrect ? "correct" : "wrong",
    };
  });
}
