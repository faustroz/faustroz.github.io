export const VALID_OPTIONS = Object.freeze(["A", "B", "C", "D", "E"]);
export const VALID_DIFFICULTIES = Object.freeze(["easy", "medium", "hard"]);
export const VALID_QUESTION_TYPES = Object.freeze(["mcq", "essay"]);

export function carryQuestionMetadata(input = {}) {
  return Object.fromEntries(["exam_type", "block", "subject", "topic", "subtopic", "question_type", "difficulty"]
    .map((field) => [field, input[field] ?? ""]));
}

function assertClient(client) {
  if (!client?.from) throw new Error("A Supabase client is required.");
}

function assertId(id) {
  if (!id || typeof id !== "string") throw new Error("A valid question id is required.");
}

export function validateQuestionPayload(input = {}) {
  const question_text = String(input.question_text || "").trim();
  if (!question_text) {
    throw new Error("Question text is required.");
  }

  const question_type = String(input.question_type || "mcq").toLowerCase();
  if (!VALID_QUESTION_TYPES.includes(question_type)) throw new Error("Question format must be MCQ or Essay.");
  const rawOptions = input.options || {};
  const options = {};
  if (question_type === "mcq") {
    for (const key of VALID_OPTIONS) {
      const optionText = String(rawOptions[key] ?? "").trim();
      if (!optionText) throw new Error(`Option ${key} cannot be empty. All 5 options (A–E) are required.`);
      options[key] = optionText;
    }
  }

  const correct_answer = question_type === "mcq" ? String(input.correct_answer || "").trim().toUpperCase() : null;
  if (question_type === "mcq" && !VALID_OPTIONS.includes(correct_answer)) {
    throw new Error(`Correct answer must be one of: ${VALID_OPTIONS.join(", ")}.`);
  }
  const reference_answer = String(input.reference_answer || "").trim() || null;
  if (question_type === "essay" && !reference_answer) throw new Error("Reference answer is required for essay questions.");

  const difficulty = String(input.difficulty || "medium").trim().toLowerCase();
  if (!VALID_DIFFICULTIES.includes(difficulty)) {
    throw new Error(`Difficulty must be one of: ${VALID_DIFFICULTIES.join(", ")}.`);
  }

  const subject = String(input.subject || "").trim() || null;

  const block = input.block ? String(input.block).trim() : null;
  if (!block) throw new Error("Block is required.");
  const topic = input.topic ? String(input.topic).trim() : null;
  const exam_type = String(input.exam_type || "").trim() || null;
  const subtopic = input.subtopic ? String(input.subtopic).trim() : null;
  const explanation = input.explanation ? String(input.explanation).trim() : null;
  const image_path = input.image_path ? String(input.image_path).trim() : null;

  let tags = [];
  if (Array.isArray(input.tags)) {
    tags = input.tags.map((t) => String(t).trim()).filter(Boolean);
  } else if (typeof input.tags === "string") {
    tags = input.tags.split(",").map((t) => t.trim()).filter(Boolean);
  }

  const is_bookmarked = Boolean(input.is_bookmarked);

  return {
    question_text,
    question_type,
    exam_type,
    options,
    correct_answer,
    difficulty,
    subject,
    block,
    topic,
    subtopic,
    explanation,
    reference_answer,
    image_path,
    tags,
    is_bookmarked,
  };
}

const normalizeDuplicateValue = (value) => String(value || "").normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase();

export function questionDuplicateKey(question = {}) {
  return [question.question_type || "mcq", question.exam_type, question.block, question.subject, question.topic, question.question_text]
    .map(normalizeDuplicateValue).join("|");
}

export function reviewQuestionQuality(rows = [], existingQuestions = []) {
  const existing = new Set(existingQuestions.map(questionDuplicateKey));
  const seen = new Set();
  const valid = [];
  const errors = [];
  const warnings = [];
  rows.forEach((row, index) => {
    const rowNumber = index + 1;
    let payload;
    try { payload = validateQuestionPayload(row); }
    catch (error) { errors.push({ rowNumber, reason: error.message }); return; }
    const key = questionDuplicateKey(payload);
    if (existing.has(key) || seen.has(key)) warnings.push({ rowNumber, reason: "Soal dengan format dan metadata yang sama sudah ada." });
    seen.add(key);
    valid.push(payload);
  });
  return { valid, errors, warnings };
}

export function createQuestionBackup(questions = [], exportedAt = new Date().toISOString(), categories = {}) {
  const categoryNames = (kind, field) => [...new Set([...(categories[kind] || []), ...questions.map((question) => question[field])].map((value) => String(value || "").trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  return {
    format: "4allx-question-bank",
    version: 1,
    exportedAt,
    categories: { examTypes: categoryNames("examTypes", "exam_type"), subjects: categoryNames("subjects", "subject"), blocks: categoryNames("blocks", "block") },
    questions: questions.map(({ exam_type, block, subject, topic, subtopic, question_type, difficulty, question_text, options, correct_answer, reference_answer, explanation, image_path, tags, is_bookmarked }) => ({
      exam_type: exam_type || null, block: block || null, subject: subject || null, topic: topic || null,
      subtopic: subtopic || null, question_type: question_type || "mcq", difficulty: difficulty || "medium",
      question_text, options: options || {}, correct_answer: correct_answer || null,
      reference_answer: reference_answer || null, explanation: explanation || null, image_path: image_path || null,
      tags: Array.isArray(tags) ? tags : [], is_bookmarked: Boolean(is_bookmarked),
    })),
  };
}

export function validateQuestionBackup(value, existingQuestions = []) {
  if (!value || value.format !== "4allx-question-bank" || value.version !== 1 || !Array.isArray(value.questions)) {
    return { valid: [], errors: [{ rowNumber: 1, reason: "Format backup Question Bank tidak dikenali." }], warnings: [] };
  }
  const result = reviewQuestionQuality(value.questions, existingQuestions);
  const categoryValues = (field) => Array.isArray(value.categories?.[field])
    ? value.categories[field].filter((name) => typeof name === "string" && name.trim() && name.trim().length <= 80).map((name) => name.trim())
    : [];
  return { ...result, categories: { examTypes: categoryValues("examTypes"), subjects: categoryValues("subjects"), blocks: categoryValues("blocks") } };
}

export function filterQuestions(questions = [], filters = {}) {
  const {
    search = "",
    examType = "",
    questionType = "",
    tag = "",
    subject = "",
    block = "",
    topic = "",
    difficulty = "",
    bookmarkedOnly = false,
  } = filters;

  const normalizedSearch = search.trim().toLowerCase();

  return questions.filter((item) => {
    if (bookmarkedOnly && !item.is_bookmarked) return false;
    if (examType && item.exam_type !== examType) return false;
    if (questionType && (item.question_type || "mcq") !== questionType) return false;
    if (tag && !(item.tags || []).includes(tag)) return false;
    if (subject && item.subject !== subject) return false;
    if (block && item.block !== block) return false;
    if (topic && item.topic !== topic) return false;
    if (difficulty && item.difficulty !== difficulty) return false;

    if (normalizedSearch) {
      const matchText = (item.question_text || "").toLowerCase();
      const matchTopic = [item.topic, item.subtopic, item.subject, item.block, item.exam_type, item.reference_answer].filter(Boolean).join(" ").toLowerCase();
      const matchExplanation = (item.explanation || "").toLowerCase();
      const matchTags = (item.tags || []).join(" ").toLowerCase();
      const matchOptions = Object.values(item.options || {}).join(" ").toLowerCase();

      const haystack = `${matchText} ${matchTopic} ${matchExplanation} ${matchTags} ${matchOptions}`;
      if (!haystack.includes(normalizedSearch)) return false;
    }

    return true;
  });
}

export function extractFilterOptions(questions = []) {
  const subjects = new Set();
  const blocks = new Set();
  const topics = new Set();
  const examTypes = new Set();
  const tags = new Set();

  for (const q of questions) {
    if (q.subject) subjects.add(q.subject);
    if (q.block) blocks.add(q.block);
    if (q.topic) topics.add(q.topic);
    if (q.exam_type) examTypes.add(q.exam_type);
    (q.tags || []).forEach((tag) => tags.add(tag));
  }

  return {
    subjects: [...subjects].sort((a, b) => a.localeCompare(b)),
    blocks: [...blocks].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
    topics: [...topics].sort((a, b) => a.localeCompare(b)),
    examTypes: [...examTypes].sort((a, b) => a.localeCompare(b)),
    tags: [...tags].sort((a, b) => a.localeCompare(b)),
  };
}

export function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function shuffleQuestionOptions(question) {
  const safeQuestion = Object.fromEntries(Object.entries(question).filter(([key]) => key !== "image_url"));
  if ((question.question_type || "mcq") === "essay") return { ...safeQuestion, shuffledOptions: {}, shuffledCorrectAnswer: null };
  const originalOptions = question.options || {};
  const originalCorrectKey = String(question.correct_answer || "").toUpperCase();
  const correctOptionText = originalOptions[originalCorrectKey];

  // Extract all 5 option entries and shuffle their positions
  const rawOptionValues = VALID_OPTIONS.map((key) => originalOptions[key] ?? "");
  const shuffledValues = shuffleArray(rawOptionValues);

  const shuffledOptions = {};
  let shuffledCorrectAnswer = "A";

  VALID_OPTIONS.forEach((key, index) => {
    const val = shuffledValues[index];
    shuffledOptions[key] = val;
    if (val === correctOptionText) {
      shuffledCorrectAnswer = key;
    }
  });

  return {
    ...safeQuestion,
    shuffledOptions,
    shuffledCorrectAnswer,
  };
}

export function createPracticeSession(questions = []) {
  // 1. Shuffle question order for the session
  const shuffledQuestions = shuffleArray(questions);

  // 2. Shuffle options for each question once at session creation
  return shuffledQuestions.map((q) => shuffleQuestionOptions(q));
}

// RFC-4180 compliant CSV parser
export function parseCsv(text = "") {
  const rows = [];
  let row = [];
  let currentField = "";
  let inQuotes = false;
  let i = 0;
  const len = text.length;

  while (i < len) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        currentField += '"';
        i += 2;
        continue;
      }
      if (char === '"') {
        inQuotes = false;
        i++;
        continue;
      }
      currentField += char;
      i++;
    } else {
      if (char === '"') {
        inQuotes = true;
        i++;
      } else if (char === ',') {
        row.push(currentField);
        currentField = "";
        i++;
      } else if (char === '\r' && nextChar === '\n') {
        row.push(currentField);
        currentField = "";
        rows.push(row);
        row = [];
        i += 2;
      } else if (char === '\n' || char === '\r') {
        row.push(currentField);
        currentField = "";
        rows.push(row);
        row = [];
        i++;
      } else {
        currentField += char;
        i++;
      }
    }
  }

  if (currentField.length > 0 || row.length > 0) {
    row.push(currentField);
    rows.push(row);
  }

  // Filter out any empty trailing row caused by trailing newline
  return rows.filter((r) => r.length > 1 || (r.length === 1 && r[0].trim() !== ""));
}

export function validateCsvRows(csvText = "", categories = {}) {
  const rows = parseCsv(csvText);
  if (rows.length < 2) {
    return {
      valid: [],
      errors: [{ rowNumber: 1, reason: "CSV must contain at least a header row and one question row." }], warnings: [],
    };
  }

  const rawHeaders = rows[0].map((h) => h.replace(/^\uFEFF/, "").trim().toLowerCase());
  const modern = rawHeaders.includes("question_text") || rawHeaders.includes("exam_type");
  const expectedCols = [modern ? "question_text" : "question", ...(modern ? [] : ["option_a", "option_b", "option_c", "option_d", "option_e", "answer"])];

  const colIndexes = {};
  for (const col of expectedCols) {
    const idx = rawHeaders.indexOf(col);
    if (idx === -1) {
      return {
        valid: [],
        errors: [{ rowNumber: 1, reason: `Missing required column '${col}' in CSV header.` }], warnings: [],
      };
    }
    colIndexes[col] = idx;
  }

  const col = (name) => rawHeaders.indexOf(name);
  colIndexes.question_type = col("question_type");
  for (const key of ["option_a", "option_b", "option_c", "option_d", "option_e"]) colIndexes[key] = col(key);
  colIndexes.exam_type = col("exam_type");
  colIndexes.subject = col("subject");
  colIndexes.subtopic = col("subtopic");
  colIndexes.reference_answer = col("reference_answer");
  colIndexes.tags = col("tags");
  colIndexes.explanation = col("explanation");
  colIndexes.difficulty = col("difficulty");
  colIndexes.image_path = col("image_path");
  colIndexes.is_bookmarked = col("is_bookmarked");
  colIndexes.block = col("block");
  colIndexes.topic = col("topic");
  if (modern && col("question_text") !== -1) colIndexes.question = col("question_text");
  else colIndexes.question = col("question");
  if (modern && col("correct_answer") !== -1) colIndexes.answer = col("correct_answer");
  else colIndexes.answer = col("answer");

  const valid = [];
  const errors = [];
  const warnings = [];
  const existing = new Set((categories.existingQuestions || []).map(questionDuplicateKey));
  const seen = new Set();

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const rowNumber = r + 1; // 1-based index matching human line number

    const question_text = String(row[colIndexes.question] ?? "").trim();
    const question_type = (String(row[colIndexes.question_type] || "mcq").trim().toLowerCase() || "mcq");
    const csvValue = (key) => colIndexes[key] < 0 ? "" : String(row[colIndexes[key]] ?? "").trim();
    const optA = csvValue("option_a");
    const optB = csvValue("option_b");
    const optC = csvValue("option_c");
    const optD = csvValue("option_d");
    const optE = csvValue("option_e");
    const answer = String(row[colIndexes.answer] ?? "").trim().toUpperCase();

    const explanation = colIndexes.explanation !== -1 ? String(row[colIndexes.explanation] ?? "").trim() : "";
    const block = colIndexes.block !== -1 ? String(row[colIndexes.block] ?? "").trim() : "";
    const topic = colIndexes.topic !== -1 ? String(row[colIndexes.topic] ?? "").trim() : "";
    const exam_type = colIndexes.exam_type !== -1 ? String(row[colIndexes.exam_type] ?? "").trim() : "";
    const subject = colIndexes.subject !== -1 ? String(row[colIndexes.subject] ?? "").trim() : "";

    if (!question_text) {
      errors.push({ rowNumber, reason: "Question text is empty." });
      continue;
    }

    if (!VALID_QUESTION_TYPES.includes(question_type)) {
      errors.push({ rowNumber, reason: `Invalid question_type '${question_type}'. Use mcq or essay.` });
      continue;
    }
    if (exam_type && categories.examTypes && !categories.examTypes.includes(exam_type)) {
      errors.push({ rowNumber, reason: `Exam type '${exam_type}' belum terdaftar. Tambahkan melalui pengelolaan Exam Type sebelum impor.` });
      continue;
    }
    if (subject && categories.subjects && !categories.subjects.includes(subject)) {
      errors.push({ rowNumber, reason: `Subject '${subject}' belum terdaftar. Tambahkan melalui pengelolaan Subject sebelum impor.` });
      continue;
    }
    if (question_type === "mcq" && (!optA || !optB || !optC || !optD || !optE)) {
      const missingOpts = [];
      if (!optA) missingOpts.push("A");
      if (!optB) missingOpts.push("B");
      if (!optC) missingOpts.push("C");
      if (!optD) missingOpts.push("D");
      if (!optE) missingOpts.push("E");
      errors.push({ rowNumber, reason: `Missing option(s): ${missingOpts.join(", ")}.` });
      continue;
    }

    if (question_type === "mcq" && !VALID_OPTIONS.includes(answer)) {
      errors.push({ rowNumber, reason: `Invalid answer '${answer}'. Must be A, B, C, D, or E.` });
      continue;
    }

    const reference_answer = colIndexes.reference_answer !== -1 ? String(row[colIndexes.reference_answer] ?? "").trim() : "";
    if (question_type === "essay" && !reference_answer) {
      errors.push({ rowNumber, reason: "Reference answer is required for essay questions." });
      continue;
    }
    if (!block) {
      errors.push({ rowNumber, reason: "Block is required." });
      continue;
    }
    const payload = {
      exam_type: exam_type || null,
      question_type,
      question_text,
      options: question_type === "mcq" ? { A: optA, B: optB, C: optC, D: optD, E: optE } : {},
      correct_answer: question_type === "mcq" ? answer : null,
      reference_answer: question_type === "essay" ? reference_answer : null,
      explanation: explanation || null,
      block: block || null,
      topic: topic || null,
      subtopic: colIndexes.subtopic !== -1 ? String(row[colIndexes.subtopic] || "").trim() || null : null,
      difficulty: "medium",
      subject: subject || null,
      tags: colIndexes.tags !== -1 ? String(row[colIndexes.tags] || "").split(/[;,]/).map((tag) => tag.trim()).filter(Boolean) : [],
      difficulty: (colIndexes.difficulty !== -1 ? String(row[colIndexes.difficulty] || "medium").trim().toLowerCase() : "medium") || "medium",
      image_path: colIndexes.image_path !== -1 ? String(row[colIndexes.image_path] || "").trim() || null : null,
      is_bookmarked: colIndexes.is_bookmarked !== -1 ? ["true", "1", "yes"].includes(String(row[colIndexes.is_bookmarked] || "").trim().toLowerCase()) : false,
    };
    try { validateQuestionPayload(payload); }
    catch (error) { errors.push({ rowNumber, reason: error.message }); continue; }
    const key = questionDuplicateKey(payload);
    if (existing.has(key) || seen.has(key)) warnings.push({ rowNumber, reason: "Soal dengan format dan metadata yang sama sudah ada." });
    seen.add(key);
    valid.push(payload);
  }

  return { valid, errors, warnings };
}

export function generateCsvTemplate(questionType = null) {
  const headers = ["exam_type", "block", "subject", "topic", "subtopic", "question_type", "question_text", "option_a", "option_b", "option_c", "option_d", "option_e", "correct_answer", "reference_answer", "explanation", "tags", "difficulty", "image_path", "is_bookmarked"];
  const csvRow = (values) => values.map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`).join(",");
  const template = [csvRow(headers)];

  if (questionType === "mcq" || questionType === "essay") {
    const row = Array(headers.length).fill("");
    row[headers.indexOf("question_type")] = questionType;
    template.push(csvRow(row));
  }

  return `${template.join("\n")}\n`;
}

export function generateQuestionCsv(questions = []) {
  const headers = ["exam_type", "block", "subject", "topic", "subtopic", "question_type", "question_text", "option_a", "option_b", "option_c", "option_d", "option_e", "correct_answer", "reference_answer", "explanation", "tags", "difficulty", "image_path", "is_bookmarked"];
  const escape = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  const rows = questions.map((question) => [
    question.exam_type, question.block, question.subject, question.topic, question.subtopic,
    question.question_type || "mcq", question.question_text,
    question.options?.A, question.options?.B, question.options?.C, question.options?.D, question.options?.E,
    question.correct_answer, question.reference_answer, question.explanation,
    (question.tags || []).join(";"), question.difficulty || "medium", question.image_path,
    question.is_bookmarked ? "true" : "false",
  ].map(escape).join(","));
  return `\uFEFF${[headers.map(escape).join(","), ...rows].join("\r\n")}\r\n`;
}

async function fetchReviewQueue(client, kind) {
  if (!["mistakes", "due", "unmastered"].includes(kind)) throw new Error("Invalid review queue.");
  let query = client.from("academic_question_review_state")
    .select("id,question_id,latest_attempt_id,due_at,interval_days,ease_factor,repetitions,correct_streak,lapse_count,attempts_count,mastered,last_rating,last_reviewed_at")
    .eq("mastered", false)
    .order(kind === "mistakes" ? "lapse_count" : "due_at", { ascending: kind !== "mistakes" });
  if (kind === "due") query = query.lte("due_at", new Date().toISOString());
  if (kind === "mistakes") query = query.gt("lapse_count", 0);
  const { data: states, error } = await query;
  if (error) throw error;
  if (!states?.length) return [];

  const questionIds = [...new Set(states.map(({ question_id }) => question_id))];
  const attemptIds = [...new Set(states.map(({ latest_attempt_id }) => latest_attempt_id).filter(Boolean))];
  const [{ data: questions, error: questionsError }, { data: attempts, error: attemptsError }] = await Promise.all([
    client.from("academic_questions").select("*").in("id", questionIds).is("deleted_at", null),
    attemptIds.length
      ? client.from("academic_question_attempts").select("*").in("id", attemptIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (questionsError) throw questionsError;
  if (attemptsError) throw attemptsError;
  const questionById = new Map((questions || []).map((question) => [question.id, question]));
  const attemptById = new Map((attempts || []).map((attempt) => [attempt.id, attempt]));
  return states.flatMap((state) => {
    const question = questionById.get(state.question_id);
    if (!question) return [];
    // Mistake history remains useful for both formats, but scheduled reviews
    // and mastery counts are intentionally limited to essay questions.
    if (kind !== "mistakes" && (question.question_type || "mcq") !== "essay") return [];
    return [{
      question,
      mistakeCount: state.lapse_count,
      totalAttempts: state.attempts_count,
      dueAt: state.due_at,
      lastAttempt: attemptById.get(state.latest_attempt_id) || null,
      reviewState: state,
    }];
  });
}

export function createQuestionRepository(client) {
  assertClient(client);

  return {
    async list(filters = {}) {
      let query = client
        .from("academic_questions")
        .select("*")
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (filters.subject) query = query.eq("subject", filters.subject);
      if (filters.block) query = query.eq("block", filters.block);
      if (filters.topic) query = query.eq("topic", filters.topic);
      if (filters.difficulty) query = query.eq("difficulty", filters.difficulty);
      if (filters.bookmarkedOnly) query = query.eq("is_bookmarked", true);

      const { data, error } = await query;
      if (error) throw error;

      let results = data ?? [];
      if (filters.search) {
        results = filterQuestions(results, { search: filters.search });
      }

      return results;
    },

    async getById(id) {
      assertId(id);
      const { data, error } = await client
        .from("academic_questions")
        .select("*")
        .eq("id", id)
        .is("deleted_at", null)
        .single();
      if (error) throw error;
      return data;
    },

    async create(input) {
      const payload = validateQuestionPayload(input);
      const { data, error } = await client
        .from("academic_questions")
        .insert(payload)
        .select("*")
        .single();
      if (error) throw error;
      return data;
    },

    async createBatch(questions = []) {
      if (!questions.length) return [];
      const payloads = questions.map((q) => validateQuestionPayload(q));
      const existing = await this.list();
      const seen = new Set(existing.map(questionDuplicateKey));
      const unique = payloads.filter((q) => {
        const key = questionDuplicateKey(q);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      if (!unique.length) return [];
      const { data, error } = await client
        .from("academic_questions")
        .insert(unique)
        .select("*");
      if (error) throw error;
      return data ?? [];
    },

    async update(id, input) {
      assertId(id);
      const payload = validateQuestionPayload(input);
      const { data, error } = await client
        .from("academic_questions")
        .update(payload)
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw error;
      return data;
    },

    async remove(id) {
      assertId(id);
      const { error } = await client
        .from("academic_questions")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },

    async removeByTopic({ block, topic } = {}) {
      const trimmedTopic = String(topic || "").trim();
      if (!trimmedTopic) {
        throw new Error("A valid topic is required to delete questions by topic.");
      }

      let query = client
        .from("academic_questions")
        .update({ deleted_at: new Date().toISOString() })
        .is("deleted_at", null)
        .eq("topic", trimmedTopic);

      if (block && String(block).trim()) {
        query = query.eq("block", String(block).trim());
      }

      const { data, error } = await query.select("id");
      if (error) throw error;
      return { deletedCount: data?.length || 0, deletedIds: (data || []).map((d) => d.id) };
    },

    async toggleBookmark(id, currentStatus) {
      assertId(id);
      const nextStatus = !currentStatus;
      const { data, error } = await client
        .from("academic_questions")
        .update({ is_bookmarked: nextStatus })
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw error;
      return data;
    },

    async recordAttempt({ question_id, exam_session_id = null, selected_answer, correct_answer = null, correct_answer_text = null, is_correct, time_spent_seconds = 0 }) {
      assertId(question_id);
      const answer = String(selected_answer || "").trim().toUpperCase();
      if (!VALID_OPTIONS.includes(answer)) {
        throw new Error(`Attempt answer must be one of: ${VALID_OPTIONS.join(", ")}.`);
      }

      const { data, error } = await client
        .from("academic_question_attempts")
        .insert({
          question_id,
          exam_session_id,
          selected_answer: answer,
          correct_answer: correct_answer == null ? null : String(correct_answer).trim().toUpperCase(),
          correct_answer_text: correct_answer_text == null ? null : String(correct_answer_text),
          is_correct: Boolean(is_correct),
          time_spent_seconds: Math.max(0, Math.round(Number(time_spent_seconds) || 0)),
          review_rating: null,
        })
        .select("*")
        .single();
      if (error) throw error;
      return data;
    },

    async recordEssayAttempt({ question_id, exam_session_id = null, response_text, reference_answer = null, self_assessed = null, time_spent_seconds = 0 }) {
      assertId(question_id);
      const response = String(response_text || "").trim();
      if (!response) throw new Error("Essay response is required.");
      const { data, error } = await client.from("academic_question_attempts").insert({
        question_id,
        exam_session_id,
        selected_answer: null,
        is_correct: null,
        reference_answer: reference_answer == null ? null : String(reference_answer),
        response_text: response,
        self_assessed: typeof self_assessed === "boolean" ? self_assessed : null,
        time_spent_seconds: Math.max(0, Math.round(Number(time_spent_seconds) || 0)),
        review_rating: null,
      }).select("*").single();
      if (error) throw error;
      return data;
    },

    async rateAttempt(attemptId, rating, questionType) {
      assertId(attemptId);
      if (questionType !== "essay") throw new Error("Spaced repetition is available only for essay questions.");
      if (!["again", "hard", "good", "easy"].includes(rating)) throw new Error("Choose Again, Hard, Good, or Easy.");
      const { data, error } = await client.rpc("rate_academic_question_attempt", { p_attempt_id: attemptId, p_rating: rating });
      if (error) throw error;
      return data;
    },

    async updateEssaySelfAssessment(attemptId, self_assessed) {
      assertId(attemptId);
      if (typeof self_assessed !== "boolean") throw new Error("Self-assessment must be selected.");
      const { data, error } = await client.from("academic_question_attempts").update({ self_assessed }).eq("id", attemptId).select("*").single();
      if (error) throw error;
      return data;
    },

    async listCategories(kind) {
      if (!["exam_type", "subject", "block"].includes(kind)) throw new Error("Invalid category type.");
      const { data, error } = await client.from("academic_question_categories").select("id,kind,name,created_at").eq("kind", kind).order("name");
      if (error) throw error;
      return data ?? [];
    },

    async addCategory(kind, name) {
      if (!["exam_type", "subject", "block"].includes(kind)) throw new Error("Invalid category type.");
      const value = String(name || "").trim();
      if (!value || value.length > 80) throw new Error("Category name must be between 1 and 80 characters.");
      const { data, error } = await client.from("academic_question_categories").upsert({ kind, name: value }, { onConflict: "user_id,kind,name", ignoreDuplicates: true }).select("id,kind,name").maybeSingle();
      if (error) throw error;
      return data;
    },

    async removeCategory(id) {
      assertId(id);
      const { error } = await client.from("academic_question_categories").delete().eq("id", id);
      if (error) throw error;
    },

    async updateCategory(id, name) {
      assertId(id);
      const value = String(name || "").trim();
      if (!value || value.length > 80) throw new Error("Category name must be between 1 and 80 characters.");
      const { data, error } = await client.from("academic_question_categories").update({ name: value }).eq("id", id).select("id,kind,name").single();
      if (error) throw error;
      return data;
    },

    async listAttempts(question_id = null) {
      let query = client
        .from("academic_question_attempts")
        .select("*")
        .order("created_at", { ascending: false });

      if (question_id) {
        query = query.eq("question_id", question_id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },

    async createSession(input) {
      const { data, error } = await client.from("academic_exam_sessions").insert(input).select("*").single();
      if (error) throw error;
      return data;
    },

    async completeSession(id, summary) {
      assertId(id);
      const { data, error } = await client.from("academic_exam_sessions").update({
        ...summary,
        status: "completed",
        completed_at: new Date().toISOString(),
      }).eq("id", id).select("*").single();
      if (error) throw error;
      return data;
    },

    async abandonSession(id) {
      assertId(id);
      const { error } = await client.from("academic_exam_sessions").update({ status: "abandoned", completed_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },

    async listLearningData() {
      const [{ data: attempts, error: attemptsError }, { data: sessions, error: sessionsError }] = await Promise.all([
        client.from("academic_question_attempts").select("*").order("created_at", { ascending: false }),
        client.from("academic_exam_sessions").select("*").is("deleted_at", null).order("created_at", { ascending: false }).limit(50),
      ]);
      if (attemptsError) throw attemptsError;
      if (sessionsError) throw sessionsError;
      const questionIds = [...new Set((attempts || []).map((attempt) => attempt.question_id))];
      const { data: questions, error: questionsError } = questionIds.length
        ? await client.from("academic_questions").select("id,exam_type,block,subject,topic,question_type").in("id", questionIds)
        : { data: [], error: null };
      if (questionsError) throw questionsError;
      return { attempts: attempts || [], sessions: sessions || [], questions: questions || [] };
    },

    async listMistakes() { return fetchReviewQueue(client, "mistakes"); },
    async listDueReviews() { return fetchReviewQueue(client, "due"); },
    async listUnmasteredReviews() { return fetchReviewQueue(client, "unmastered"); },
  };
}
