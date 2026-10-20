export const VALID_OPTIONS = Object.freeze(["A", "B", "C", "D", "E"]);
export const VALID_DIFFICULTIES = Object.freeze(["easy", "medium", "hard"]);

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

  const rawOptions = input.options || {};
  const options = {};
  for (const key of VALID_OPTIONS) {
    const optionText = String(rawOptions[key] ?? "").trim();
    if (!optionText) {
      throw new Error(`Option ${key} cannot be empty. All 5 options (A–E) are required.`);
    }
    options[key] = optionText;
  }

  const correct_answer = String(input.correct_answer || "").trim().toUpperCase();
  if (!VALID_OPTIONS.includes(correct_answer)) {
    throw new Error(`Correct answer must be one of: ${VALID_OPTIONS.join(", ")}.`);
  }

  const difficulty = String(input.difficulty || "medium").trim().toLowerCase();
  if (!VALID_DIFFICULTIES.includes(difficulty)) {
    throw new Error(`Difficulty must be one of: ${VALID_DIFFICULTIES.join(", ")}.`);
  }

  const subject = String(input.subject || "Kedokteran").trim();
  if (!subject) {
    throw new Error("Subject is required.");
  }

  const block = input.block ? String(input.block).trim() : null;
  const topic = input.topic ? String(input.topic).trim() : null;
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
    options,
    correct_answer,
    difficulty,
    subject,
    block,
    topic,
    explanation,
    image_path,
    tags,
    is_bookmarked,
  };
}

export function filterQuestions(questions = [], filters = {}) {
  const {
    search = "",
    subject = "",
    block = "",
    topic = "",
    difficulty = "",
    bookmarkedOnly = false,
  } = filters;

  const normalizedSearch = search.trim().toLowerCase();

  return questions.filter((item) => {
    if (bookmarkedOnly && !item.is_bookmarked) return false;
    if (subject && item.subject !== subject) return false;
    if (block && item.block !== block) return false;
    if (topic && item.topic !== topic) return false;
    if (difficulty && item.difficulty !== difficulty) return false;

    if (normalizedSearch) {
      const matchText = (item.question_text || "").toLowerCase();
      const matchTopic = (item.topic || "").toLowerCase();
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

  for (const q of questions) {
    if (q.subject) subjects.add(q.subject);
    if (q.block) blocks.add(q.block);
    if (q.topic) topics.add(q.topic);
  }

  return {
    subjects: [...subjects].sort((a, b) => a.localeCompare(b)),
    blocks: [...blocks].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
    topics: [...topics].sort((a, b) => a.localeCompare(b)),
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
    ...question,
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

export function validateCsvRows(csvText = "") {
  const rows = parseCsv(csvText);
  if (rows.length < 2) {
    return {
      valid: [],
      errors: [{ rowNumber: 1, reason: "CSV must contain at least a header row and one question row." }],
    };
  }

  const rawHeaders = rows[0].map((h) => h.trim().toLowerCase());
  const expectedCols = [
    "question",
    "option_a",
    "option_b",
    "option_c",
    "option_d",
    "option_e",
    "answer",
  ];

  const colIndexes = {};
  for (const col of expectedCols) {
    const idx = rawHeaders.indexOf(col);
    if (idx === -1) {
      return {
        valid: [],
        errors: [{ rowNumber: 1, reason: `Missing required column '${col}' in CSV header.` }],
      };
    }
    colIndexes[col] = idx;
  }

  colIndexes.explanation = rawHeaders.indexOf("explanation");
  colIndexes.block = rawHeaders.indexOf("block");
  colIndexes.topic = rawHeaders.indexOf("topic");

  const valid = [];
  const errors = [];

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const rowNumber = r + 1; // 1-based index matching human line number

    const question_text = String(row[colIndexes.question] ?? "").trim();
    const optA = String(row[colIndexes.option_a] ?? "").trim();
    const optB = String(row[colIndexes.option_b] ?? "").trim();
    const optC = String(row[colIndexes.option_c] ?? "").trim();
    const optD = String(row[colIndexes.option_d] ?? "").trim();
    const optE = String(row[colIndexes.option_e] ?? "").trim();
    const answer = String(row[colIndexes.answer] ?? "").trim().toUpperCase();

    const explanation = colIndexes.explanation !== -1 ? String(row[colIndexes.explanation] ?? "").trim() : "";
    const block = colIndexes.block !== -1 ? String(row[colIndexes.block] ?? "").trim() : "";
    const topic = colIndexes.topic !== -1 ? String(row[colIndexes.topic] ?? "").trim() : "";

    if (!question_text) {
      errors.push({ rowNumber, reason: "Question text is empty." });
      continue;
    }

    if (!optA || !optB || !optC || !optD || !optE) {
      const missingOpts = [];
      if (!optA) missingOpts.push("A");
      if (!optB) missingOpts.push("B");
      if (!optC) missingOpts.push("C");
      if (!optD) missingOpts.push("D");
      if (!optE) missingOpts.push("E");
      errors.push({ rowNumber, reason: `Missing option(s): ${missingOpts.join(", ")}.` });
      continue;
    }

    if (!VALID_OPTIONS.includes(answer)) {
      errors.push({ rowNumber, reason: `Invalid answer '${answer}'. Must be A, B, C, D, or E.` });
      continue;
    }

    valid.push({
      question_text,
      options: { A: optA, B: optB, C: optC, D: optD, E: optE },
      correct_answer: answer,
      explanation: explanation || null,
      block: block || null,
      topic: topic || null,
      difficulty: "medium",
      subject: "Kedokteran",
      tags: [],
      is_bookmarked: false,
    });
  }

  return { valid, errors };
}

export function generateCsvTemplate() {
  const headers = "question,option_a,option_b,option_c,option_d,option_e,answer,explanation,block,topic\n";
  const sample1 = '"Laki-laki 54 tahun mengeluh nyeri dada substernal yang menjalar ke lengan kiri sejak 2 jam lalu. EKG menunjukkan ST elevasi di lead II, III, aVF. Diagnosis paling tepat adalah?","STEMI Inferior","NSTEMI","Angina Pektoris Stabil","Perikarditis Akut","Diseksi Aorta","A","Elevasi segmen ST pada lead II, III, aVF spesifik untuk infark miokard dinding inferior.","Blok 5","Kardiovaskular"\n';
  const sample2 = '"Obat antihipertensi pilihan pertama pada pasien dengan nefropati diabetik dan proteinuria adalah?","ACE inhibitor","Beta blocker","Calcium channel blocker","Loop diuretic","Alfa blocker","A","ACEI memiliki efek renoprotektif dengan menurunkan tekanan intraglomerulus melalui dilatasi arteriol eferen.","Blok 5","Farmakologi"\n';
  return headers + sample1 + sample2;
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
      const { data, error } = await client
        .from("academic_questions")
        .insert(payloads)
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

    async recordAttempt({ question_id, selected_answer, is_correct, time_spent_seconds = 0 }) {
      assertId(question_id);
      const answer = String(selected_answer || "").trim().toUpperCase();
      if (!VALID_OPTIONS.includes(answer)) {
        throw new Error(`Attempt answer must be one of: ${VALID_OPTIONS.join(", ")}.`);
      }

      const { data, error } = await client
        .from("academic_question_attempts")
        .insert({
          question_id,
          selected_answer: answer,
          is_correct: Boolean(is_correct),
          time_spent_seconds: Math.max(0, Math.round(Number(time_spent_seconds) || 0)),
        })
        .select("*")
        .single();
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

    async listMistakes() {
      // 1. Fetch all attempts for the current user
      const { data: attempts, error: attemptsError } = await client
        .from("academic_question_attempts")
        .select("*")
        .order("created_at", { ascending: false });
      if (attemptsError) throw attemptsError;

      // Group attempts by question_id
      const mistakeStatsByQuestionId = new Map();
      for (const att of attempts || []) {
        if (!mistakeStatsByQuestionId.has(att.question_id)) {
          mistakeStatsByQuestionId.set(att.question_id, {
            question_id: att.question_id,
            totalAttempts: 0,
            mistakeCount: 0,
            lastAttempt: att,
          });
        }
        const stats = mistakeStatsByQuestionId.get(att.question_id);
        stats.totalAttempts++;
        if (!att.is_correct) {
          stats.mistakeCount++;
        }
      }

      // Filter only questions that have at least one mistake
      const mistakeQuestionIds = [...mistakeStatsByQuestionId.entries()]
        .filter(([, stats]) => stats.mistakeCount > 0)
        .map(([id]) => id);

      if (!mistakeQuestionIds.length) {
        return [];
      }

      // 2. Fetch the corresponding questions that are not soft-deleted
      const { data: questions, error: questionsError } = await client
        .from("academic_questions")
        .select("*")
        .in("id", mistakeQuestionIds)
        .is("deleted_at", null);
      if (questionsError) throw questionsError;

      const questionMap = new Map((questions || []).map((q) => [q.id, q]));

      // Merge and return
      return mistakeQuestionIds
        .map((qid) => {
          const question = questionMap.get(qid);
          if (!question) return null; // question might be soft-deleted
          const stats = mistakeStatsByQuestionId.get(qid);
          return {
            question,
            mistakeCount: stats.mistakeCount,
            totalAttempts: stats.totalAttempts,
            lastAttempt: stats.lastAttempt,
          };
        })
        .filter(Boolean);
    },
  };
}
