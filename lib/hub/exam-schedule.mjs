// Exam schedule per block and the daily question target derived from it.

const DAY_MS = 86400000;

export const EXAM_STATUS = Object.freeze({ PAST: "past", TODAY: "today", SOON: "soon", LATER: "later" });

export const normalizeBlock = (value) => String(value ?? "").trim().toLocaleLowerCase("id");

export function parseDateOnly(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value ?? ""));
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) || date.getMonth() !== Number(match[2]) - 1 ? null : date;
}

const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const dayKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

export function daysUntil(examDate, today = new Date()) {
  const target = parseDateOnly(examDate);
  return target ? Math.round((target.getTime() - startOfDay(today).getTime()) / DAY_MS) : null;
}

export function validateExamInput(input = {}) {
  const block = String(input.block ?? "").trim();
  if (!block) throw new Error("Blok wajib diisi.");
  if (block.length > 120) throw new Error("Nama blok maksimal 120 karakter.");
  if (!parseDateOnly(input.exam_date)) throw new Error("Tanggal ujian tidak valid.");
  const examType = String(input.exam_type ?? "").trim();
  if (examType.length > 60) throw new Error("Jenis ujian maksimal 60 karakter.");
  const notes = String(input.notes ?? "").trim();
  if (notes.length > 500) throw new Error("Catatan maksimal 500 karakter.");
  return { block, exam_type: examType || null, exam_date: input.exam_date, notes: notes || null };
}

/** A question counts as mastered once its latest attempt was correct (MCQ) or self-assessed good (Essay). */
export function masteredQuestionIds(attempts = []) {
  const latest = new Map();
  for (const attempt of [...attempts].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))) {
    if (!latest.has(attempt.question_id)) latest.set(attempt.question_id, attempt);
  }
  return new Set([...latest].filter(([, attempt]) => attempt.is_correct === true || attempt.self_assessed === true).map(([id]) => id));
}

export function buildExamPlan({ exams = [], questions = [], attempts = [], today = new Date() } = {}) {
  const mastered = masteredQuestionIds(attempts);
  const todayKey = dayKey(today);
  const blockOf = new Map(questions.map((question) => [question.id, normalizeBlock(question.block)]));
  const answeredToday = attempts.filter((attempt) => attempt.created_at && dayKey(new Date(attempt.created_at)) === todayKey);

  return exams
    .map((exam) => {
      const days = daysUntil(exam.exam_date, today);
      if (days === null) return null;
      const key = normalizeBlock(exam.block);
      const inBlock = questions.filter((question) => normalizeBlock(question.block) === key);
      const done = inBlock.filter((question) => mastered.has(question.id)).length;
      const remaining = inBlock.length - done;
      const status = days < 0 ? EXAM_STATUS.PAST : days === 0 ? EXAM_STATUS.TODAY : days <= 7 ? EXAM_STATUS.SOON : EXAM_STATUS.LATER;
      const studyDays = Math.max(1, days);
      return {
        exam,
        daysLeft: days,
        status,
        total: inBlock.length,
        mastered: done,
        remaining,
        perDay: status === EXAM_STATUS.PAST ? 0 : Math.ceil(remaining / studyDays),
        answeredToday: answeredToday.filter((attempt) => blockOf.get(attempt.question_id) === key).length,
      };
    })
    .filter(Boolean)
    .sort((a, b) => (a.status === EXAM_STATUS.PAST) - (b.status === EXAM_STATUS.PAST) || String(a.exam.exam_date).localeCompare(String(b.exam.exam_date)));
}

export function formatCountdown(plan) {
  if (plan.status === EXAM_STATUS.PAST) return "Sudah lewat";
  if (plan.status === EXAM_STATUS.TODAY) return "Hari ini";
  return `H-${plan.daysLeft}`;
}

export function createExamScheduleRepository(client) {
  if (!client?.from) throw new Error("A Supabase client is required.");
  const MAX_ATTEMPTS = 5000;
  return {
    async list() {
      const { data, error } = await client.from("academic_exam_schedule").select("id,block,exam_type,exam_date,notes").order("exam_date", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    async create(input) {
      const { data, error } = await client.from("academic_exam_schedule").insert(validateExamInput(input)).select("id,block,exam_type,exam_date,notes").single();
      if (error) throw error;
      return data;
    },
    async remove(id) {
      const { error } = await client.from("academic_exam_schedule").delete().eq("id", id);
      if (error) throw error;
    },
    async loadPlanInputs() {
      const [questions, attempts] = await Promise.all([
        client.from("academic_questions").select("id,block").is("deleted_at", null),
        client.from("academic_question_attempts").select("question_id,is_correct,self_assessed,created_at").order("created_at", { ascending: false }).limit(MAX_ATTEMPTS),
      ]);
      if (questions.error) throw questions.error;
      if (attempts.error) throw attempts.error;
      return { questions: questions.data || [], attempts: attempts.data || [] };
    },
  };
}
