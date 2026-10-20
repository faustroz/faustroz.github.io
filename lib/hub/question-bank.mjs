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
  };
}

