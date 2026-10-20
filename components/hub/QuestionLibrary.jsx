"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bookmark,
  ChevronDown,
  ChevronUp,
  Filter,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { requireSupabase } from "@/lib/supabase/client";
import {
  createQuestionRepository,
  extractFilterOptions,
  filterQuestions,
  VALID_DIFFICULTIES,
  VALID_OPTIONS,
} from "@/lib/hub/question-bank.mjs";

const DEFAULT_FORM = Object.freeze({
  question_text: "",
  subject: "Kedokteran",
  block: "",
  topic: "",
  difficulty: "medium",
  options: { A: "", B: "", C: "", D: "", E: "" },
  correct_answer: "A",
  explanation: "",
  tags: "",
  is_bookmarked: false,
});

export default function QuestionLibrary() {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");
  const [blockFilter, setBlockFilter] = useState("");
  const [topicFilter, setTopicFilter] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState("");
  const [bookmarkedOnly, setBookmarkedOnly] = useState(false);

  // Form modal state
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Explanations expanded map
  const [expandedExplanations, setExpandedExplanations] = useState({});

  const repository = useMemo(() => {
    try {
      const client = requireSupabase();
      return createQuestionRepository(client);
    } catch {
      return null;
    }
  }, []);

  const loadQuestions = useCallback(async () => {
    if (!repository) {
      setLoading(false);
      setError("Supabase client is not configured.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const data = await repository.list();
      setQuestions(data);
    } catch (err) {
      setError(err.message || "Failed to load question bank.");
    } finally {
      setLoading(false);
    }
  }, [repository]);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  const filterOptions = useMemo(() => extractFilterOptions(questions), [questions]);

  const filteredQuestions = useMemo(() => {
    return filterQuestions(questions, {
      search,
      subject: subjectFilter,
      block: blockFilter,
      topic: topicFilter,
      difficulty: difficultyFilter,
      bookmarkedOnly,
    });
  }, [questions, search, subjectFilter, blockFilter, topicFilter, difficultyFilter, bookmarkedOnly]);

  const hasActiveFilters = Boolean(
    search || subjectFilter || blockFilter || topicFilter || difficultyFilter || bookmarkedOnly
  );

  const resetFilters = () => {
    setSearch("");
    setSubjectFilter("");
    setBlockFilter("");
    setTopicFilter("");
    setDifficultyFilter("");
    setBookmarkedOnly(false);
  };

  const openCreateForm = () => {
    setEditingId(null);
    setForm(DEFAULT_FORM);
    setFormError("");
    setFormOpen(true);
  };

  const openEditForm = (question) => {
    setEditingId(question.id);
    setForm({
      question_text: question.question_text || "",
      subject: question.subject || "Kedokteran",
      block: question.block || "",
      topic: question.topic || "",
      difficulty: question.difficulty || "medium",
      options: {
        A: question.options?.A || "",
        B: question.options?.B || "",
        C: question.options?.C || "",
        D: question.options?.D || "",
        E: question.options?.E || "",
      },
      correct_answer: question.correct_answer || "A",
      explanation: question.explanation || "",
      tags: (question.tags || []).join(", "),
      is_bookmarked: Boolean(question.is_bookmarked),
    });
    setFormError("");
    setFormOpen(true);
  };

  const closeForm = () => {
    if (submitting) return;
    setFormOpen(false);
    setEditingId(null);
    setForm(DEFAULT_FORM);
    setFormError("");
  };

  const handleSave = async (event) => {
    event.preventDefault();
    if (!repository) {
      setFormError("Supabase client is not configured.");
      return;
    }
    setSubmitting(true);
    setFormError("");

    try {
      if (editingId) {
        const updated = await repository.update(editingId, form);
        setQuestions((prev) => prev.map((q) => (q.id === editingId ? updated : q)));
      } else {
        const created = await repository.create(form);
        setQuestions((prev) => [created, ...prev]);
      }
      closeForm();
    } catch (err) {
      setFormError(err.message || "Failed to save question.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (question) => {
    if (!repository) {
      setError("Supabase client is not configured.");
      return;
    }
    const confirmText = `Are you sure you want to delete this question? It will be moved to Trash.`;
    if (!window.confirm(confirmText)) return;

    try {
      await repository.remove(question.id);
      setQuestions((prev) => prev.filter((q) => q.id !== question.id));
    } catch (err) {
      setError(err.message || "Failed to delete question.");
    }
  };

  const handleToggleBookmark = async (question) => {
    if (!repository) {
      setError("Supabase client is not configured.");
      return;
    }
    try {
      const updated = await repository.toggleBookmark(question.id, question.is_bookmarked);
      setQuestions((prev) => prev.map((q) => (q.id === question.id ? updated : q)));
    } catch (err) {
      setError(err.message || "Failed to toggle bookmark.");
    }
  };

  const toggleExplanation = (id) => {
    setExpandedExplanations((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <section className="hub-crud-panel hub-question-library" aria-label="Question Bank Library">
      {/* Header bar */}
      <header className="hub-crud-heading">
        <div>
          <span>ACADEMIC / QUESTION BANK</span>
          <h2>Question Library</h2>
          <p>Create, organize, and manage single-choice medical MCQs with 5 options (A–E).</p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button type="button" onClick={openCreateForm} className="hub-primary-action">
            <Plus aria-hidden="true" /> NEW QUESTION
          </button>
        </div>
      </header>

      {/* Filter and Search Bar */}
      <div className="hub-ledger-controls" aria-label="Question library filters">
        <label style={{ minWidth: "12rem" }}>
          <span>SEARCH</span>
          <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
            <input
              type="search"
              placeholder="Search question text, topic, tag..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: "100%", paddingLeft: "1.8rem" }}
            />
            <Search
              size={13}
              style={{ position: "absolute", left: "0.6rem", pointerEvents: "none", opacity: 0.5 }}
            />
          </div>
        </label>

        {filterOptions.subjects.length > 1 && (
          <label>
            <span>SUBJECT</span>
            <select value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)}>
              <option value="">All subjects</option>
              {filterOptions.subjects.map((sub) => (
                <option key={sub} value={sub}>{sub}</option>
              ))}
            </select>
          </label>
        )}

        <label>
          <span>BLOCK</span>
          <select value={blockFilter} onChange={(e) => setBlockFilter(e.target.value)}>
            <option value="">All blocks</option>
            {filterOptions.blocks.map((blk) => (
              <option key={blk} value={blk}>{blk}</option>
            ))}
          </select>
        </label>

        {filterOptions.topics.length > 0 && (
          <label>
            <span>TOPIC</span>
            <select value={topicFilter} onChange={(e) => setTopicFilter(e.target.value)}>
              <option value="">All topics</option>
              {filterOptions.topics.map((top) => (
                <option key={top} value={top}>{top}</option>
              ))}
            </select>
          </label>
        )}

        <label>
          <span>DIFFICULTY</span>
          <select value={difficultyFilter} onChange={(e) => setDifficultyFilter(e.target.value)}>
            <option value="">All difficulties</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </label>

        <button
          type="button"
          className={bookmarkedOnly ? "is-active" : undefined}
          onClick={() => setBookmarkedOnly((prev) => !prev)}
          title="Filter only bookmarked questions"
          style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
        >
          <Star size={12} fill={bookmarkedOnly ? "currentColor" : "none"} />
          BOOKMARKS
        </button>

        {hasActiveFilters && (
          <button type="button" onClick={resetFilters} title="Reset all filters">
            <RotateCcw size={12} /> CLEAR
          </button>
        )}

        <strong>
          {filteredQuestions.length} / {questions.length} QUESTIONS
        </strong>
      </div>

      {error && <p className="hub-data-error" role="alert">{error}</p>}

      {/* Question Cards Grid */}
      {loading ? (
        <div className="hub-data-state">LOADING QUESTION BANK…</div>
      ) : questions.length === 0 ? (
        <div className="hub-data-state">
          <span>NO QUESTIONS IN BANK</span>
          <p style={{ marginTop: "0.5rem", color: "var(--hub-muted)", fontSize: "0.8rem" }}>
            Your question bank is empty. Add single-choice MCQs with options A–E to start practicing.
          </p>
          <button
            type="button"
            onClick={openCreateForm}
            className="hub-primary-action"
            style={{ marginTop: "1rem" }}
          >
            <Plus aria-hidden="true" /> ADD FIRST QUESTION
          </button>
        </div>
      ) : filteredQuestions.length === 0 ? (
        <div className="hub-data-state">
          <span>NO MATCHING QUESTIONS</span>
          <p style={{ marginTop: "0.5rem", color: "var(--hub-muted)", fontSize: "0.8rem" }}>
            No questions match your current search and filter criteria.
          </p>
          <button
            type="button"
            onClick={resetFilters}
            style={{ marginTop: "1rem", padding: "0.5rem 1rem", border: "1px solid var(--hub-line)", background: "transparent", color: "var(--hub-text)", cursor: "pointer", borderRadius: "4px" }}
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="hub-question-list" style={{ display: "grid", gap: "0.75rem", padding: "1rem" }}>
          {filteredQuestions.map((q, index) => {
            const isExpanded = Boolean(expandedExplanations[q.id]);
            return (
              <article
                key={q.id}
                className="hub-question-card"
                style={{
                  border: "1px solid var(--hub-line)",
                  borderRadius: "8px",
                  background: "var(--hub-panel)",
                  padding: "1rem",
                  display: "grid",
                  gap: "0.75rem",
                }}
              >
                {/* Meta Header */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "0.5rem",
                    borderBottom: "1px solid var(--hub-line)",
                    paddingBottom: "0.5rem",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                    <span
                      style={{
                        fontFamily: "var(--font-geist-mono), monospace",
                        fontSize: "0.65rem",
                        color: "var(--hub-accent)",
                        fontWeight: 600,
                      }}
                    >
                      #{String(index + 1).padStart(2, "0")}
                    </span>

                    {q.block && (
                      <span
                        style={{
                          fontSize: "0.62rem",
                          padding: "0.15rem 0.4rem",
                          border: "1px solid var(--hub-line)",
                          borderRadius: "4px",
                          color: "var(--hub-muted)",
                          fontFamily: "var(--font-geist-mono), monospace",
                        }}
                      >
                        {q.block}
                      </span>
                    )}

                    {q.topic && (
                      <span
                        style={{
                          fontSize: "0.62rem",
                          padding: "0.15rem 0.4rem",
                          border: "1px solid var(--hub-line)",
                          borderRadius: "4px",
                          color: "var(--hub-muted)",
                          fontFamily: "var(--font-geist-mono), monospace",
                        }}
                      >
                        {q.topic}
                      </span>
                    )}

                    <span
                      style={{
                        fontSize: "0.62rem",
                        padding: "0.15rem 0.45rem",
                        borderRadius: "4px",
                        fontFamily: "var(--font-geist-mono), monospace",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        background:
                          q.difficulty === "easy"
                            ? "rgba(34, 197, 94, 0.15)"
                            : q.difficulty === "hard"
                            ? "rgba(239, 68, 68, 0.15)"
                            : "rgba(255, 255, 255, 0.08)",
                        color:
                          q.difficulty === "easy"
                            ? "#4ade80"
                            : q.difficulty === "hard"
                            ? "#f87171"
                            : "var(--hub-muted)",
                      }}
                    >
                      {q.difficulty}
                    </span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                    <button
                      type="button"
                      onClick={() => handleToggleBookmark(q)}
                      aria-label={q.is_bookmarked ? "Remove bookmark" : "Bookmark question"}
                      title={q.is_bookmarked ? "Bookmarked" : "Bookmark"}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: q.is_bookmarked ? "#fbbf24" : "var(--hub-muted)",
                        cursor: "pointer",
                        padding: "0.3rem",
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      <Star size={15} fill={q.is_bookmarked ? "#fbbf24" : "none"} />
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditForm(q)}
                      aria-label="Edit question"
                      title="Edit question"
                      style={{
                        background: "transparent",
                        border: "1px solid var(--hub-line)",
                        borderRadius: "4px",
                        color: "var(--hub-muted)",
                        cursor: "pointer",
                        padding: "0.3rem",
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(q)}
                      aria-label="Delete question"
                      title="Delete question"
                      style={{
                        background: "transparent",
                        border: "1px solid var(--hub-line)",
                        borderRadius: "4px",
                        color: "var(--hub-muted)",
                        cursor: "pointer",
                        padding: "0.3rem",
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Question Stem */}
                <p
                  style={{
                    margin: 0,
                    fontSize: "0.88rem",
                    lineHeight: 1.5,
                    color: "var(--hub-text)",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {q.question_text}
                </p>

                {/* Options List (A through E) */}
                <div
                  style={{
                    display: "grid",
                    gap: "0.4rem",
                    paddingTop: "0.25rem",
                  }}
                >
                  {VALID_OPTIONS.map((opt) => {
                    const isCorrect = q.correct_answer === opt;
                    const text = q.options?.[opt] || "—";
                    return (
                      <div
                        key={opt}
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: "0.6rem",
                          padding: "0.45rem 0.65rem",
                          borderRadius: "5px",
                          border: isCorrect
                            ? "1px solid rgba(34, 197, 94, 0.4)"
                            : "1px solid var(--hub-line)",
                          background: isCorrect
                            ? "rgba(34, 197, 94, 0.06)"
                            : "var(--hub-panel-raised)",
                          fontSize: "0.8rem",
                          color: isCorrect ? "#f0fdf4" : "var(--hub-text)",
                        }}
                      >
                        <strong
                          style={{
                            fontFamily: "var(--font-geist-mono), monospace",
                            fontSize: "0.72rem",
                            color: isCorrect ? "#4ade80" : "var(--hub-muted)",
                            minWidth: "1.2rem",
                          }}
                        >
                          {opt}.
                        </strong>
                        <span style={{ flex: 1, whiteSpace: "pre-wrap" }}>{text}</span>
                        {isCorrect && (
                          <span
                            style={{
                              fontSize: "0.6rem",
                              fontFamily: "var(--font-geist-mono), monospace",
                              letterSpacing: "0.05em",
                              color: "#4ade80",
                              textTransform: "uppercase",
                              padding: "0.1rem 0.35rem",
                              border: "1px solid rgba(34, 197, 94, 0.3)",
                              borderRadius: "3px",
                            }}
                          >
                            Correct
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Explanation Toggle & Content */}
                {q.explanation && (
                  <div
                    style={{
                      borderTop: "1px solid var(--hub-line)",
                      paddingTop: "0.5rem",
                      marginTop: "0.25rem",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => toggleExplanation(q.id)}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "var(--hub-muted)",
                        fontSize: "0.7rem",
                        fontFamily: "var(--font-geist-mono), monospace",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.35rem",
                        padding: 0,
                      }}
                    >
                      {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                      {isExpanded ? "HIDE EXPLANATION" : "SHOW EXPLANATION"}
                    </button>
                    {isExpanded && (
                      <div
                        style={{
                          marginTop: "0.45rem",
                          padding: "0.65rem",
                          background: "var(--hub-panel-raised)",
                          borderRadius: "5px",
                          fontSize: "0.8rem",
                          lineHeight: 1.45,
                          color: "var(--hub-muted)",
                          whiteSpace: "pre-wrap",
                        }}
                      >
                        {q.explanation}
                      </div>
                    )}
                  </div>
                )}

                {/* Tags row */}
                {q.tags && q.tags.length > 0 && (
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "0.35rem",
                      paddingTop: "0.25rem",
                    }}
                  >
                    {q.tags.map((tag) => (
                      <span
                        key={tag}
                        style={{
                          fontSize: "0.58rem",
                          fontFamily: "var(--font-geist-mono), monospace",
                          color: "var(--hub-muted)",
                          padding: "0.15rem 0.35rem",
                          border: "1px solid var(--hub-line)",
                          borderRadius: "3px",
                        }}
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {/* Question Form Modal */}
      {formOpen && (
        <div className="hub-crud-modal-backdrop" onMouseDown={closeForm}>
          <form
            className="hub-crud-form hub-crud-modal"
            onSubmit={handleSave}
            role="dialog"
            aria-modal="true"
            aria-label={editingId ? "Edit Question" : "Create New Question"}
            onMouseDown={(e) => e.stopPropagation()}
            style={{ maxWidth: "42rem", width: "95%" }}
          >
            <div className="hub-crud-form-head">
              <span>{editingId ? "EDIT QUESTION" : "NEW QUESTION"}</span>
              <button type="button" onClick={closeForm} disabled={submitting} aria-label="Close">
                <X />
              </button>
            </div>

            {formError && (
              <p className="hub-data-error" style={{ margin: "0.5rem 1rem 0" }}>
                {formError}
              </p>
            )}

            <div className="hub-form-grid" style={{ padding: "1rem" }}>
              {/* Question Text */}
              <label className="hub-field-wide">
                <span>QUESTION TEXT (STEM) *</span>
                <textarea
                  rows={3}
                  required
                  placeholder="Enter the medical question text or clinical vignette..."
                  value={form.question_text}
                  onChange={(e) => setForm({ ...form, question_text: e.target.value })}
                />
              </label>

              {/* Subject, Block, Topic, Difficulty */}
              <label>
                <span>SUBJECT *</span>
                <input
                  type="text"
                  required
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                />
              </label>

              <label>
                <span>BLOCK (OPTIONAL)</span>
                <input
                  type="text"
                  placeholder="e.g. Blok 1, Blok 5"
                  value={form.block}
                  onChange={(e) => setForm({ ...form, block: e.target.value })}
                />
              </label>

              <label>
                <span>TOPIC (OPTIONAL)</span>
                <input
                  type="text"
                  placeholder="e.g. Kardiovaskular, Farmakologi"
                  value={form.topic}
                  onChange={(e) => setForm({ ...form, topic: e.target.value })}
                />
              </label>

              <label>
                <span>DIFFICULTY *</span>
                <select
                  value={form.difficulty}
                  onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </label>

              {/* 5 Options A-E */}
              <div
                className="hub-field-wide"
                style={{
                  display: "grid",
                  gap: "0.5rem",
                  marginTop: "0.5rem",
                  borderTop: "1px solid var(--hub-line)",
                  paddingTop: "0.75rem",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "0.62rem", color: "var(--hub-muted)", fontFamily: "var(--font-geist-mono), monospace" }}>
                    OPTIONS (A–E) & CORRECT ANSWER *
                  </span>
                  <span style={{ fontSize: "0.58rem", color: "var(--hub-muted)" }}>
                    Select the radio button corresponding to the correct answer.
                  </span>
                </div>

                {VALID_OPTIONS.map((opt) => (
                  <div
                    key={opt}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.35rem",
                        cursor: "pointer",
                        minWidth: "3.2rem",
                      }}
                    >
                      <input
                        type="radio"
                        name="correct_answer"
                        value={opt}
                        checked={form.correct_answer === opt}
                        onChange={() => setForm({ ...form, correct_answer: opt })}
                      />
                      <strong style={{ fontFamily: "var(--font-geist-mono), monospace", fontSize: "0.75rem" }}>
                        {opt}.
                      </strong>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder={`Option ${opt} text...`}
                      value={form.options[opt]}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          options: { ...form.options, [opt]: e.target.value },
                        })
                      }
                      style={{ flex: 1 }}
                    />
                  </div>
                ))}
              </div>

              {/* Explanation */}
              <label className="hub-field-wide" style={{ marginTop: "0.5rem" }}>
                <span>EXPLANATION (OPTIONAL)</span>
                <textarea
                  rows={3}
                  placeholder="Provide clinical rationale or key learning point..."
                  value={form.explanation}
                  onChange={(e) => setForm({ ...form, explanation: e.target.value })}
                />
              </label>

              {/* Tags */}
              <label className="hub-field-wide">
                <span>TAGS (COMMA SEPARATED, OPTIONAL)</span>
                <input
                  type="text"
                  placeholder="e.g. cardio, arrhythmia, ecg"
                  value={form.tags}
                  onChange={(e) => setForm({ ...form, tags: e.target.value })}
                />
              </label>

              {/* Bookmark */}
              <label
                className="hub-field-wide"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={form.is_bookmarked}
                  onChange={(e) => setForm({ ...form, is_bookmarked: e.target.checked })}
                />
                <span style={{ fontSize: "0.75rem" }}>Bookmark this question</span>
              </label>
            </div>

            <div
              className="hub-form-actions"
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "0.5rem",
                padding: "0.75rem 1rem",
                borderTop: "1px solid var(--hub-line)",
              }}
            >
              <button type="button" onClick={closeForm} disabled={submitting}>
                CANCEL
              </button>
              <button type="submit" disabled={submitting} className="hub-primary-action">
                {submitting ? "SAVING…" : editingId ? "UPDATE QUESTION" : "SAVE QUESTION"}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}

