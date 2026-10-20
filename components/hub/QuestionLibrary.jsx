"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Download,
  Eye,
  EyeOff,
  Filter,
  FileSpreadsheet,
  Pencil,
  Play,
  Plus,
  RotateCcw,
  Search,
  Star,
  Trash2,
  Upload,
  X,
  XCircle,
} from "lucide-react";
import { requireSupabase } from "@/lib/supabase/client";
import {
  createPracticeSession,
  createQuestionRepository,
  extractFilterOptions,
  filterQuestions,
  generateCsvTemplate,
  VALID_OPTIONS,
  validateCsvRows,
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
  // Top-level bank sub-navigation: "practice" | "library" | "mistakes" | "import"
  const [activeTab, setActiveTab] = useState("practice");

  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Library filters
  const [search, setSearch] = useState("");
  const [blockFilter, setBlockFilter] = useState("");
  const [topicFilter, setTopicFilter] = useState("");
  const [bookmarkedOnly, setBookmarkedOnly] = useState(false);

  // Library question form modal
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Hidden/revealed answers in library cards
  const [revealedAnswers, setRevealedAnswers] = useState({});

  // ---------------------------------------------------------------------------
  // PRACTICE MODE STATE
  // ---------------------------------------------------------------------------
  const [practiceBlock, setPracticeBlock] = useState("");
  const [practiceTopic, setPracticeTopic] = useState("");
  const [practiceActive, setPracticeActive] = useState(false);
  const [practiceQuestions, setPracticeQuestions] = useState([]);
  const [practiceIndex, setPracticeIndex] = useState(0);
  const [practiceSelectedAnswer, setPracticeSelectedAnswer] = useState("");
  const [practiceSubmitted, setPracticeSubmitted] = useState(false);
  const [practiceStats, setPracticeStats] = useState({ correct: 0, wrong: 0, incorrectQuestions: [] });
  const [practiceFinished, setPracticeFinished] = useState(false);

  // ---------------------------------------------------------------------------
  // MISTAKES REVIEW STATE
  // ---------------------------------------------------------------------------
  const [mistakes, setMistakes] = useState([]);
  const [loadingMistakes, setLoadingMistakes] = useState(false);

  // ---------------------------------------------------------------------------
  // CSV IMPORT STATE
  // ---------------------------------------------------------------------------
  const [importFile, setImportFile] = useState(null);
  const [importPreview, setImportPreview] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState("");

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

  const loadMistakes = useCallback(async () => {
    if (!repository) return;
    setLoadingMistakes(true);
    try {
      const data = await repository.listMistakes();
      setMistakes(data);
    } catch (err) {
      setError(err.message || "Failed to load mistake notebook.");
    } finally {
      setLoadingMistakes(false);
    }
  }, [repository]);

  useEffect(() => {
    if (activeTab === "mistakes") {
      loadMistakes();
    }
  }, [activeTab, loadMistakes]);

  const filterOptions = useMemo(() => extractFilterOptions(questions), [questions]);

  const filteredQuestions = useMemo(() => {
    return filterQuestions(questions, {
      search,
      block: blockFilter,
      topic: topicFilter,
      bookmarkedOnly,
    });
  }, [questions, search, blockFilter, topicFilter, bookmarkedOnly]);

  const hasActiveFilters = Boolean(search || blockFilter || topicFilter || bookmarkedOnly);

  const resetFilters = () => {
    setSearch("");
    setBlockFilter("");
    setTopicFilter("");
    setBookmarkedOnly(false);
  };

  // ---------------------------------------------------------------------------
  // PRACTICE HANDLERS
  // ---------------------------------------------------------------------------
  const matchingPracticeQuestions = useMemo(() => {
    return questions.filter((q) => {
      if (practiceBlock && q.block !== practiceBlock) return false;
      if (practiceTopic && q.topic !== practiceTopic) return false;
      return true;
    });
  }, [questions, practiceBlock, practiceTopic]);

  const startPractice = (targetQuestions = null) => {
    const pool = targetQuestions || matchingPracticeQuestions;
    if (!pool.length) return;

    const session = createPracticeSession(pool);
    setPracticeQuestions(session);
    setPracticeIndex(0);
    setPracticeSelectedAnswer("");
    setPracticeSubmitted(false);
    setPracticeStats({ correct: 0, wrong: 0, incorrectQuestions: [] });
    setPracticeFinished(false);
    setPracticeActive(true);
  };

  const currentQuestion = practiceQuestions[practiceIndex] || null;

  const handlePracticeSubmit = async () => {
    if (!practiceSelectedAnswer || practiceSubmitted || !currentQuestion) return;

    const isCorrect = practiceSelectedAnswer === currentQuestion.shuffledCorrectAnswer;
    setPracticeSubmitted(true);

    // Track stats
    setPracticeStats((prev) => {
      const nextCorrect = isCorrect ? prev.correct + 1 : prev.correct;
      const nextWrong = !isCorrect ? prev.wrong + 1 : prev.wrong;
      const nextIncorrectQuestions = !isCorrect
        ? [...prev.incorrectQuestions, currentQuestion]
        : prev.incorrectQuestions;
      return {
        correct: nextCorrect,
        wrong: nextWrong,
        incorrectQuestions: nextIncorrectQuestions,
      };
    });

    // Record attempt asynchronously to Supabase
    if (repository) {
      try {
        await repository.recordAttempt({
          question_id: currentQuestion.id,
          selected_answer: practiceSelectedAnswer,
          is_correct: isCorrect,
          time_spent_seconds: 0,
        });
      } catch (attemptErr) {
        console.error("Failed to record attempt:", attemptErr);
      }
    }
  };

  const handlePracticeNext = () => {
    if (practiceIndex + 1 < practiceQuestions.length) {
      setPracticeIndex((prev) => prev + 1);
      setPracticeSelectedAnswer("");
      setPracticeSubmitted(false);
    } else {
      setPracticeFinished(true);
    }
  };

  const retryPracticeIncorrect = () => {
    if (!practiceStats.incorrectQuestions.length) return;
    startPractice(practiceStats.incorrectQuestions);
  };

  // ---------------------------------------------------------------------------
  // LIBRARY CRUD HANDLERS
  // ---------------------------------------------------------------------------
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

  const toggleRevealAnswer = (id) => {
    setRevealedAnswers((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // ---------------------------------------------------------------------------
  // CSV IMPORT HANDLERS
  // ---------------------------------------------------------------------------
  const handleCsvFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setImportFile(file);
    setImportMessage("");

    try {
      const text = await file.text();
      const validation = validateCsvRows(text);
      setImportPreview(validation);
    } catch (parseErr) {
      setImportPreview({
        valid: [],
        errors: [{ rowNumber: 1, reason: parseErr.message || "Failed to read CSV file." }],
      });
    }
  };

  const handleExecuteImport = async () => {
    if (!repository || !importPreview || !importPreview.valid.length) return;
    setImporting(true);
    setImportMessage("");

    try {
      const inserted = await repository.createBatch(importPreview.valid);
      setQuestions((prev) => [...inserted, ...prev]);
      setImportMessage(`Successfully imported ${inserted.length} question(s)!`);
      setImportFile(null);
      setImportPreview(null);
    } catch (importErr) {
      setImportMessage(`Import failed: ${importErr.message}`);
    } finally {
      setImporting(false);
    }
  };

  const handleDownloadTemplate = () => {
    const csvContent = generateCsvTemplate();
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "medical_questions_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <section className="hub-crud-panel hub-question-bank-workspace" aria-label="Question Bank Workspace">
      {/* Top Heading & Tab Bar */}
      <header className="hub-crud-heading" style={{ flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <span>ACADEMIC / INTERACTIVE MCQ</span>
          <h2>Question Library & Practice</h2>
          <p>Practice medical questions with randomized options, review mistakes, and manage library.</p>
        </div>

        {/* Workspace Mode Subtabs */}
        <div role="tablist" aria-label="Question bank modes" style={{ display: "flex", gap: "0.35rem", padding: "0.25rem", border: "1px solid var(--hub-line)", borderRadius: "7px" }}>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "practice"}
            className={activeTab === "practice" ? "is-active" : undefined}
            onClick={() => { setActiveTab("practice"); setPracticeActive(false); }}
            style={{
              padding: "0.45rem 0.75rem",
              border: 0,
              borderRadius: "4px",
              color: activeTab === "practice" ? "var(--hub-text)" : "var(--hub-muted)",
              background: activeTab === "practice" ? "var(--hub-surface)" : "transparent",
              font: "0.62rem 'IBM Plex Mono', var(--font-geist-mono), monospace",
              cursor: "pointer",
            }}
          >
            PRACTICE
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "library"}
            className={activeTab === "library" ? "is-active" : undefined}
            onClick={() => setActiveTab("library")}
            style={{
              padding: "0.45rem 0.75rem",
              border: 0,
              borderRadius: "4px",
              color: activeTab === "library" ? "var(--hub-text)" : "var(--hub-muted)",
              background: activeTab === "library" ? "var(--hub-surface)" : "transparent",
              font: "0.62rem 'IBM Plex Mono', var(--font-geist-mono), monospace",
              cursor: "pointer",
            }}
          >
            LIBRARY
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "mistakes"}
            className={activeTab === "mistakes" ? "is-active" : undefined}
            onClick={() => setActiveTab("mistakes")}
            style={{
              padding: "0.45rem 0.75rem",
              border: 0,
              borderRadius: "4px",
              color: activeTab === "mistakes" ? "var(--hub-text)" : "var(--hub-muted)",
              background: activeTab === "mistakes" ? "var(--hub-surface)" : "transparent",
              font: "0.62rem 'IBM Plex Mono', var(--font-geist-mono), monospace",
              cursor: "pointer",
            }}
          >
            MISTAKES
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "import"}
            className={activeTab === "import" ? "is-active" : undefined}
            onClick={() => setActiveTab("import")}
            style={{
              padding: "0.45rem 0.75rem",
              border: 0,
              borderRadius: "4px",
              color: activeTab === "import" ? "var(--hub-text)" : "var(--hub-muted)",
              background: activeTab === "import" ? "var(--hub-surface)" : "transparent",
              font: "0.62rem 'IBM Plex Mono', var(--font-geist-mono), monospace",
              cursor: "pointer",
            }}
          >
            CSV IMPORT
          </button>
        </div>
      </header>

      {error && <p className="hub-data-error" role="alert">{error}</p>}

      {/* ===================================================================== */}
      {/* TAB 1: PRACTICE MODE                                                  */}
      {/* ===================================================================== */}
      {activeTab === "practice" && (
        <div className="hub-practice-container" style={{ padding: "1rem" }}>
          {!practiceActive ? (
            /* Practice Setup Screen */
            <div style={{ maxWidth: "34rem", margin: "0 auto", display: "grid", gap: "1.2rem" }}>
              <div style={{ border: "1px solid var(--hub-line)", padding: "1.25rem", borderRadius: "8px", background: "var(--hub-panel)" }}>
                <span style={{ fontSize: "0.62rem", color: "var(--hub-muted)", fontFamily: "var(--font-geist-mono), monospace" }}>
                  SETUP PRACTICE SESSION
                </span>
                <h3 style={{ margin: "0.4rem 0 0.2rem", fontSize: "1.25rem", color: "var(--hub-text)" }}>
                  Pilih Soal Latihan
                </h3>
                <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--hub-muted)", lineHeight: 1.45 }}>
                  Latihan akan mengacak urutan soal dan mengacak urutan opsi pilihan (A–E). Kunci jawaban dan pembahasan langsung tampil setelah Anda menjawab.
                </p>

                <div style={{ display: "grid", gap: "0.75rem", marginTop: "1rem" }}>
                  <label style={{ display: "grid", gap: "0.3rem" }}>
                    <span style={{ fontSize: "0.62rem", color: "var(--hub-muted)", fontFamily: "var(--font-geist-mono), monospace" }}>
                      BLOK KEDOKTERAN
                    </span>
                    <select
                      value={practiceBlock}
                      onChange={(e) => setPracticeBlock(e.target.value)}
                      style={{ padding: "0.55rem", border: "1px solid var(--hub-line)", background: "var(--hub-panel-raised)", color: "var(--hub-text)", borderRadius: "6px" }}
                    >
                      <option value="">Semua Blok ({questions.length} soal)</option>
                      {filterOptions.blocks.map((b) => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </label>

                  {filterOptions.topics.length > 0 && (
                    <label style={{ display: "grid", gap: "0.3rem" }}>
                      <span style={{ fontSize: "0.62rem", color: "var(--hub-muted)", fontFamily: "var(--font-geist-mono), monospace" }}>
                        TOPIK (OPSIONAL)
                      </span>
                      <select
                        value={practiceTopic}
                        onChange={(e) => setPracticeTopic(e.target.value)}
                        style={{ padding: "0.55rem", border: "1px solid var(--hub-line)", background: "var(--hub-panel-raised)", color: "var(--hub-text)", borderRadius: "6px" }}
                      >
                        <option value="">Semua Topik</option>
                        {filterOptions.topics.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </label>
                  )}
                </div>

                <div style={{ marginTop: "1.25rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "0.75rem", color: "var(--hub-muted)", fontFamily: "var(--font-geist-mono), monospace" }}>
                    {matchingPracticeQuestions.length} SOAL TERSEDIA
                  </span>

                  <button
                    type="button"
                    onClick={() => startPractice()}
                    disabled={!matchingPracticeQuestions.length}
                    className="hub-primary-action"
                    style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", padding: "0.6rem 1.1rem" }}
                  >
                    <Play size={13} fill="currentColor" /> MULAI LATIHAN
                  </button>
                </div>
              </div>
            </div>
          ) : practiceFinished ? (
            /* Practice Finished Screen */
            <div style={{ maxWidth: "34rem", margin: "0 auto", border: "1px solid var(--hub-line)", padding: "1.5rem", borderRadius: "8px", background: "var(--hub-panel)", textAlign: "center" }}>
              <span style={{ fontSize: "0.62rem", color: "var(--hub-muted)", fontFamily: "var(--font-geist-mono), monospace" }}>
                SESI SELESAI
              </span>
              <h3 style={{ margin: "0.5rem 0", fontSize: "1.6rem", color: "var(--hub-text)" }}>
                Hasil Latihan
              </h3>

              {/* Accuracy score display */}
              <div style={{ margin: "1.5rem 0", padding: "1rem", background: "var(--hub-panel-raised)", borderRadius: "8px", border: "1px solid var(--hub-line)" }}>
                <strong style={{ display: "block", fontSize: "2.5rem", color: "var(--hub-accent)", fontFamily: "var(--font-geist-mono), monospace" }}>
                  {practiceQuestions.length ? Math.round((practiceStats.correct / practiceQuestions.length) * 100) : 0}%
                </strong>
                <p style={{ margin: "0.4rem 0 0", fontSize: "0.85rem", color: "var(--hub-muted)" }}>
                  {practiceStats.correct} Benar &nbsp;·&nbsp; {practiceStats.wrong} Salah &nbsp;·&nbsp; Total {practiceQuestions.length} Soal
                </p>
              </div>

              <div style={{ display: "flex", justifyContent: "center", gap: "0.6rem", flexWrap: "wrap" }}>
                {practiceStats.wrong > 0 && (
                  <button
                    type="button"
                    onClick={retryPracticeIncorrect}
                    className="hub-primary-action"
                    style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}
                  >
                    <RotateCcw size={13} /> ULANGI SOAL SALAH ({practiceStats.wrong})
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setPracticeActive(false)}
                  style={{ padding: "0.5rem 1rem", border: "1px solid var(--hub-line)", background: "transparent", color: "var(--hub-text)", cursor: "pointer", borderRadius: "4px" }}
                >
                  SESI BARU
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("mistakes")}
                  style={{ padding: "0.5rem 1rem", border: "1px solid var(--hub-line)", background: "transparent", color: "var(--hub-muted)", cursor: "pointer", borderRadius: "4px" }}
                >
                  CATATAN KESALAHAN
                </button>
              </div>
            </div>
          ) : (
            /* Active Question Runner */
            <div style={{ maxWidth: "42rem", margin: "0 auto", display: "grid", gap: "1rem" }}>
              {/* Progress & Score Bar */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--hub-line)", paddingBottom: "0.6rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <span style={{ fontSize: "0.72rem", color: "var(--hub-accent)", fontFamily: "var(--font-geist-mono), monospace", fontWeight: 600 }}>
                    SOAL {practiceIndex + 1} / {practiceQuestions.length}
                  </span>
                  {currentQuestion?.block && (
                    <span style={{ fontSize: "0.62rem", padding: "0.15rem 0.4rem", border: "1px solid var(--hub-line)", borderRadius: "4px", color: "var(--hub-muted)" }}>
                      {currentQuestion.block}
                    </span>
                  )}
                  {currentQuestion?.topic && (
                    <span style={{ fontSize: "0.62rem", padding: "0.15rem 0.4rem", border: "1px solid var(--hub-line)", borderRadius: "4px", color: "var(--hub-muted)" }}>
                      {currentQuestion.topic}
                    </span>
                  )}
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                  <span style={{ fontSize: "0.65rem", fontFamily: "var(--font-geist-mono), monospace", color: "#4ade80" }}>
                    ✓ {practiceStats.correct}
                  </span>
                  <span style={{ fontSize: "0.65rem", fontFamily: "var(--font-geist-mono), monospace", color: "#f87171" }}>
                    ✗ {practiceStats.wrong}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPracticeActive(false)}
                    style={{ background: "transparent", border: "none", color: "var(--hub-muted)", fontSize: "0.68rem", cursor: "pointer", marginLeft: "0.5rem" }}
                  >
                    Keluar
                  </button>
                </div>
              </div>

              {/* Question Stem */}
              <div style={{ background: "var(--hub-panel)", border: "1px solid var(--hub-line)", padding: "1.25rem", borderRadius: "8px" }}>
                <p style={{ margin: 0, fontSize: "0.95rem", lineHeight: 1.55, color: "var(--hub-text)", whiteSpace: "pre-wrap" }}>
                  {currentQuestion?.question_text}
                </p>
              </div>

              {/* Shuffled Options (A–E) */}
              <div style={{ display: "grid", gap: "0.5rem" }}>
                {VALID_OPTIONS.map((opt) => {
                  const optText = currentQuestion?.shuffledOptions?.[opt] || "";
                  const isSelected = practiceSelectedAnswer === opt;
                  const isCorrect = currentQuestion?.shuffledCorrectAnswer === opt;

                  let optionBorder = "1px solid var(--hub-line)";
                  let optionBg = "var(--hub-panel)";
                  let optionColor = "var(--hub-text)";

                  if (practiceSubmitted) {
                    if (isCorrect) {
                      optionBorder = "1px solid rgba(34, 197, 94, 0.6)";
                      optionBg = "rgba(34, 197, 94, 0.12)";
                      optionColor = "#f0fdf4";
                    } else if (isSelected && !isCorrect) {
                      optionBorder = "1px solid rgba(239, 68, 68, 0.6)";
                      optionBg = "rgba(239, 68, 68, 0.12)";
                      optionColor = "#fef2f2";
                    }
                  } else if (isSelected) {
                    optionBorder = "1px solid var(--hub-accent)";
                    optionBg = "var(--hub-accent-soft)";
                  }

                  return (
                    <button
                      key={opt}
                      type="button"
                      disabled={practiceSubmitted}
                      onClick={() => setPracticeSelectedAnswer(opt)}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "0.75rem",
                        padding: "0.75rem 0.9rem",
                        borderRadius: "6px",
                        border: optionBorder,
                        background: optionBg,
                        color: optionColor,
                        cursor: practiceSubmitted ? "default" : "pointer",
                        textAlign: "left",
                        width: "100%",
                      }}
                    >
                      <strong
                        style={{
                          fontFamily: "var(--font-geist-mono), monospace",
                          fontSize: "0.8rem",
                          minWidth: "1.4rem",
                          color: isCorrect && practiceSubmitted ? "#4ade80" : isSelected && !practiceSubmitted ? "var(--hub-accent)" : "var(--hub-muted)",
                        }}
                      >
                        {opt}.
                      </strong>
                      <span style={{ flex: 1, fontSize: "0.85rem", lineHeight: 1.45, whiteSpace: "pre-wrap" }}>
                        {optText}
                      </span>
                      {practiceSubmitted && isCorrect && (
                        <CheckCircle2 size={16} color="#4ade80" style={{ flexShrink: 0 }} />
                      )}
                      {practiceSubmitted && isSelected && !isCorrect && (
                        <XCircle size={16} color="#f87171" style={{ flexShrink: 0 }} />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Action Buttons: Submit / Next */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.6rem", marginTop: "0.5rem" }}>
                {!practiceSubmitted ? (
                  <button
                    type="button"
                    onClick={handlePracticeSubmit}
                    disabled={!practiceSelectedAnswer}
                    className="hub-primary-action"
                    style={{ padding: "0.65rem 1.4rem" }}
                  >
                    SUBMIT JAWABAN
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handlePracticeNext}
                    className="hub-primary-action"
                    style={{ padding: "0.65rem 1.4rem", display: "inline-flex", alignItems: "center", gap: "0.4rem" }}
                  >
                    {practiceIndex + 1 < practiceQuestions.length ? "SOAL BERIKUTNYA" : "SELESAI & LIHAT HASIL"}
                    <ArrowRight size={14} />
                  </button>
                )}
              </div>

              {/* Immediate Explanation Display after Submit */}
              {practiceSubmitted && (
                <div
                  style={{
                    border: "1px solid var(--hub-line)",
                    borderRadius: "8px",
                    background: "var(--hub-panel-raised)",
                    padding: "1rem",
                    marginTop: "0.5rem",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.4rem" }}>
                    <BookOpen size={14} color="var(--hub-accent)" />
                    <span style={{ fontSize: "0.65rem", fontFamily: "var(--font-geist-mono), monospace", color: "var(--hub-accent)", fontWeight: 600 }}>
                      PEMBAHASAN & KUNCI JAWABAN
                    </span>
                  </div>
                  <p style={{ margin: "0 0 0.5rem", fontSize: "0.82rem", color: "var(--hub-text)" }}>
                    Kunci Jawaban yang Benar: <b>{currentQuestion.shuffledCorrectAnswer}. {currentQuestion.shuffledOptions[currentQuestion.shuffledCorrectAnswer]}</b>
                  </p>
                  {currentQuestion.explanation ? (
                    <div style={{ fontSize: "0.82rem", color: "var(--hub-muted)", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
                      {currentQuestion.explanation}
                    </div>
                  ) : (
                    <span style={{ fontSize: "0.75rem", color: "var(--hub-muted)", fontStyle: "italic" }}>
                      Tidak ada pembahasan tambahan untuk soal ini.
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 2: QUESTION LIBRARY                                               */}
      {/* ===================================================================== */}
      {activeTab === "library" && (
        <div className="hub-library-tab">
          {/* Action & Filter Bar */}
          <div className="hub-ledger-controls" aria-label="Question library filters">
            <label style={{ minWidth: "12rem" }}>
              <span>SEARCH</span>
              <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <input
                  type="search"
                  placeholder="Cari teks soal, topik, tag..."
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

            <label>
              <span>BLOK</span>
              <select value={blockFilter} onChange={(e) => setBlockFilter(e.target.value)}>
                <option value="">Semua blok</option>
                {filterOptions.blocks.map((blk) => (
                  <option key={blk} value={blk}>{blk}</option>
                ))}
              </select>
            </label>

            {filterOptions.topics.length > 0 && (
              <label>
                <span>TOPIK</span>
                <select value={topicFilter} onChange={(e) => setTopicFilter(e.target.value)}>
                  <option value="">Semua topik</option>
                  {filterOptions.topics.map((top) => (
                    <option key={top} value={top}>{top}</option>
                  ))}
                </select>
              </label>
            )}

            <button
              type="button"
              className={bookmarkedOnly ? "is-active" : undefined}
              onClick={() => setBookmarkedOnly((prev) => !prev)}
              title="Filter bookmark"
              style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
            >
              <Star size={12} fill={bookmarkedOnly ? "currentColor" : "none"} />
              BOOKMARK
            </button>

            {hasActiveFilters && (
              <button type="button" onClick={resetFilters} title="Reset filter">
                <RotateCcw size={12} /> RESET
              </button>
            )}

            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <strong>
                {filteredQuestions.length} / {questions.length} SOAL
              </strong>
              <button type="button" onClick={openCreateForm} className="hub-primary-action">
                <Plus aria-hidden="true" /> TAMBAH SOAL
              </button>
            </div>
          </div>

          {/* Question List */}
          {loading ? (
            <div className="hub-data-state">MEMUAT DAFTAR SOAL…</div>
          ) : questions.length === 0 ? (
            <div className="hub-data-state">
              <span>BELUM ADA SOAL DI BANK</span>
              <p style={{ marginTop: "0.5rem", color: "var(--hub-muted)", fontSize: "0.8rem" }}>
                Bank soal masih kosong. Anda dapat menambahkan soal secara manual atau mengimpor via CSV.
              </p>
              <div style={{ marginTop: "1rem", display: "flex", gap: "0.5rem" }}>
                <button type="button" onClick={openCreateForm} className="hub-primary-action">
                  <Plus aria-hidden="true" /> TAMBAH SOAL PERTAMA
                </button>
                <button type="button" onClick={() => setActiveTab("import")} style={{ padding: "0.5rem 1rem", border: "1px solid var(--hub-line)", background: "transparent", color: "var(--hub-text)", borderRadius: "4px" }}>
                  IMPOR CSV
                </button>
              </div>
            </div>
          ) : filteredQuestions.length === 0 ? (
            <div className="hub-data-state">
              <span>TIDAK ADA SOAL YANG SESUAI</span>
              <p style={{ marginTop: "0.5rem", color: "var(--hub-muted)", fontSize: "0.8rem" }}>
                Tidak ada soal yang cocok dengan filter atau kata kunci pencarian.
              </p>
              <button
                type="button"
                onClick={resetFilters}
                style={{ marginTop: "1rem", padding: "0.5rem 1rem", border: "1px solid var(--hub-line)", background: "transparent", color: "var(--hub-text)", cursor: "pointer", borderRadius: "4px" }}
              >
                Reset Filter
              </button>
            </div>
          ) : (
            <div className="hub-question-list" style={{ display: "grid", gap: "0.75rem", padding: "1rem" }}>
              {filteredQuestions.map((q, index) => {
                const isRevealed = Boolean(revealedAnswers[q.id]);
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
                    {/* Header */}
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
                        <span style={{ fontFamily: "var(--font-geist-mono), monospace", fontSize: "0.65rem", color: "var(--hub-accent)", fontWeight: 600 }}>
                          #{String(index + 1).padStart(2, "0")}
                        </span>
                        {q.block && (
                          <span style={{ fontSize: "0.62rem", padding: "0.15rem 0.4rem", border: "1px solid var(--hub-line)", borderRadius: "4px", color: "var(--hub-muted)" }}>
                            {q.block}
                          </span>
                        )}
                        {q.topic && (
                          <span style={{ fontSize: "0.62rem", padding: "0.15rem 0.4rem", border: "1px solid var(--hub-line)", borderRadius: "4px", color: "var(--hub-muted)" }}>
                            {q.topic}
                          </span>
                        )}
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                        <button
                          type="button"
                          onClick={() => toggleRevealAnswer(q.id)}
                          aria-label="Toggle answer key"
                          title={isRevealed ? "Sembunyikan Kunci" : "Tampilkan Kunci"}
                          style={{
                            background: "transparent",
                            border: "1px solid var(--hub-line)",
                            borderRadius: "4px",
                            color: isRevealed ? "#4ade80" : "var(--hub-muted)",
                            cursor: "pointer",
                            padding: "0.3rem 0.5rem",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.25rem",
                            fontSize: "0.62rem",
                            fontFamily: "var(--font-geist-mono), monospace",
                          }}
                        >
                          {isRevealed ? <EyeOff size={12} /> : <Eye size={12} />}
                          {isRevealed ? "KUNCI TERBUKA" : "LIHAT KUNCI"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleBookmark(q)}
                          aria-label="Toggle bookmark"
                          title={q.is_bookmarked ? "Bookmarked" : "Bookmark"}
                          style={{ background: "transparent", border: "none", color: q.is_bookmarked ? "#fbbf24" : "var(--hub-muted)", cursor: "pointer", padding: "0.3rem" }}
                        >
                          <Star size={15} fill={q.is_bookmarked ? "#fbbf24" : "none"} />
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditForm(q)}
                          aria-label="Edit question"
                          style={{ background: "transparent", border: "1px solid var(--hub-line)", borderRadius: "4px", color: "var(--hub-muted)", cursor: "pointer", padding: "0.3rem" }}
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(q)}
                          aria-label="Delete question"
                          style={{ background: "transparent", border: "1px solid var(--hub-line)", borderRadius: "4px", color: "var(--hub-muted)", cursor: "pointer", padding: "0.3rem" }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    {/* Question Stem */}
                    <p style={{ margin: 0, fontSize: "0.88rem", lineHeight: 1.5, color: "var(--hub-text)", whiteSpace: "pre-wrap" }}>
                      {q.question_text}
                    </p>

                    {/* Options (A–E) - Correct Answer HIDDEN unless toggled */}
                    <div style={{ display: "grid", gap: "0.35rem" }}>
                      {VALID_OPTIONS.map((opt) => {
                        const isCorrect = q.correct_answer === opt;
                        const text = q.options?.[opt] || "—";
                        const highlight = isRevealed && isCorrect;

                        return (
                          <div
                            key={opt}
                            style={{
                              display: "flex",
                              alignItems: "flex-start",
                              gap: "0.6rem",
                              padding: "0.4rem 0.6rem",
                              borderRadius: "4px",
                              border: highlight ? "1px solid rgba(34, 197, 94, 0.4)" : "1px solid var(--hub-line)",
                              background: highlight ? "rgba(34, 197, 94, 0.08)" : "var(--hub-panel-raised)",
                              fontSize: "0.8rem",
                            }}
                          >
                            <strong style={{ fontFamily: "var(--font-geist-mono), monospace", fontSize: "0.72rem", color: highlight ? "#4ade80" : "var(--hub-muted)", minWidth: "1.2rem" }}>
                              {opt}.
                            </strong>
                            <span style={{ flex: 1, whiteSpace: "pre-wrap" }}>{text}</span>
                            {highlight && (
                              <span style={{ fontSize: "0.58rem", color: "#4ade80", fontFamily: "var(--font-geist-mono), monospace", textTransform: "uppercase" }}>
                                [KUNCI JAWABAN]
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Explanation - shown when key is revealed */}
                    {isRevealed && q.explanation && (
                      <div style={{ marginTop: "0.2rem", padding: "0.6rem", background: "var(--hub-panel-raised)", borderRadius: "5px", fontSize: "0.8rem", color: "var(--hub-muted)", lineHeight: 1.45, whiteSpace: "pre-wrap", borderLeft: "2px solid var(--hub-accent)" }}>
                        <b style={{ color: "var(--hub-text)", display: "block", marginBottom: "0.2rem" }}>Pembahasan:</b>
                        {q.explanation}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 3: MISTAKE REVIEW                                                 */}
      {/* ===================================================================== */}
      {activeTab === "mistakes" && (
        <div className="hub-mistakes-tab" style={{ padding: "1rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.75rem" }}>
            <div>
              <span style={{ fontSize: "0.62rem", color: "var(--hub-muted)", fontFamily: "var(--font-geist-mono), monospace" }}>
                NOTEBOOK / EVALUASI
              </span>
              <h3 style={{ margin: "0.2rem 0", fontSize: "1.25rem", color: "var(--hub-text)" }}>
                Soal yang Pernah Dijawab Salah
              </h3>
              <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--hub-muted)" }}>
                Daftar soal yang perlu dipelajari ulang berdasarkan riwayat jawaban salah Anda.
              </p>
            </div>

            {mistakes.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  const mistakeQuestionsList = mistakes.map((m) => m.question);
                  startPractice(mistakeQuestionsList);
                  setActiveTab("practice");
                }}
                className="hub-primary-action"
                style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}
              >
                <Play size={13} fill="currentColor" /> LATIHAN ULANG SEMUA SOAL SALAH ({mistakes.length})
              </button>
            )}
          </div>

          {loadingMistakes ? (
            <div className="hub-data-state">MEMUAT CATATAN KESALAHAN…</div>
          ) : mistakes.length === 0 ? (
            <div className="hub-data-state">
              <span>BELUM ADA CATATAN KESALAHAN</span>
              <p style={{ marginTop: "0.5rem", color: "var(--hub-muted)", fontSize: "0.8rem" }}>
                Tidak ada soal yang pernah dijawab salah, atau Anda belum memulai sesi latihan.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab("practice")}
                className="hub-primary-action"
                style={{ marginTop: "1rem" }}
              >
                MULAI LATIHAN SEKARANG
              </button>
            </div>
          ) : (
            <div style={{ display: "grid", gap: "0.75rem" }}>
              {mistakes.map(({ question: q, mistakeCount, lastAttempt }) => (
                <article
                  key={q.id}
                  style={{
                    border: "1px solid rgba(239, 68, 68, 0.3)",
                    borderRadius: "8px",
                    background: "var(--hub-panel)",
                    padding: "1rem",
                    display: "grid",
                    gap: "0.6rem",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span style={{ fontSize: "0.62rem", padding: "0.15rem 0.45rem", background: "rgba(239, 68, 68, 0.15)", color: "#f87171", borderRadius: "4px", fontFamily: "var(--font-geist-mono), monospace" }}>
                        SALAH {mistakeCount}x
                      </span>
                      {q.block && <span style={{ fontSize: "0.62rem", border: "1px solid var(--hub-line)", padding: "0.15rem 0.4rem", borderRadius: "4px", color: "var(--hub-muted)" }}>{q.block}</span>}
                      {q.topic && <span style={{ fontSize: "0.62rem", border: "1px solid var(--hub-line)", padding: "0.15rem 0.4rem", borderRadius: "4px", color: "var(--hub-muted)" }}>{q.topic}</span>}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        startPractice([q]);
                        setActiveTab("practice");
                      }}
                      className="hub-primary-action"
                      style={{ fontSize: "0.68rem", padding: "0.3rem 0.65rem", display: "inline-flex", alignItems: "center", gap: "0.3rem" }}
                    >
                      <Play size={11} fill="currentColor" /> Latih Soal Ini
                    </button>
                  </div>

                  <p style={{ margin: "0.2rem 0", fontSize: "0.88rem", color: "var(--hub-text)", lineHeight: 1.5 }}>
                    {q.question_text}
                  </p>

                  <div style={{ padding: "0.5rem 0.75rem", background: "var(--hub-panel-raised)", borderRadius: "6px", fontSize: "0.78rem" }}>
                    <p style={{ margin: "0 0 0.3rem", color: "#4ade80" }}>
                      Kunci Jawaban: <b>{q.correct_answer}. {q.options?.[q.correct_answer]}</b>
                    </p>
                    {lastAttempt && (
                      <p style={{ margin: 0, color: "var(--hub-muted)", fontSize: "0.72rem" }}>
                        Jawaban terakhir Anda: <b>{lastAttempt.selected_answer}</b> ({lastAttempt.is_correct ? "Benar" : "Salah"})
                      </p>
                    )}
                  </div>

                  {q.explanation && (
                    <div style={{ fontSize: "0.78rem", color: "var(--hub-muted)", lineHeight: 1.45 }}>
                      <b>Pembahasan:</b> {q.explanation}
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 4: CSV IMPORT                                                     */}
      {/* ===================================================================== */}
      {activeTab === "import" && (
        <div className="hub-import-tab" style={{ padding: "1rem", maxWidth: "48rem", margin: "0 auto", display: "grid", gap: "1rem" }}>
          <div style={{ border: "1px solid var(--hub-line)", borderRadius: "8px", background: "var(--hub-panel)", padding: "1.25rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.75rem" }}>
              <div>
                <span style={{ fontSize: "0.62rem", color: "var(--hub-muted)", fontFamily: "var(--font-geist-mono), monospace" }}>
                  BULK IMPORT / CSV
                </span>
                <h3 style={{ margin: "0.25rem 0", fontSize: "1.25rem", color: "var(--hub-text)" }}>
                  Impor Soal dari File CSV
                </h3>
                <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--hub-muted)" }}>
                  Format kolom: <code>question,option_a,option_b,option_c,option_d,option_e,answer,explanation,block,topic</code>
                </p>
              </div>

              <button
                type="button"
                onClick={handleDownloadTemplate}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  padding: "0.45rem 0.75rem",
                  border: "1px solid var(--hub-line)",
                  borderRadius: "5px",
                  background: "var(--hub-panel-raised)",
                  color: "var(--hub-text)",
                  fontSize: "0.72rem",
                  cursor: "pointer",
                }}
              >
                <Download size={13} /> UNDUH TEMPLATE CSV
              </button>
            </div>

            {/* File Upload Input */}
            <div
              style={{
                marginTop: "1.25rem",
                border: "2px dashed var(--hub-line)",
                borderRadius: "8px",
                padding: "1.5rem",
                textAlign: "center",
                background: "var(--hub-panel-raised)",
              }}
            >
              <Upload size={24} color="var(--hub-muted)" style={{ margin: "0 auto 0.5rem" }} />
              <label style={{ display: "inline-block", cursor: "pointer" }}>
                <span className="hub-primary-action" style={{ display: "inline-block", padding: "0.5rem 1rem", borderRadius: "5px" }}>
                  PILIH FILE CSV
                </span>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleCsvFileChange}
                  style={{ display: "none" }}
                />
              </label>
              {importFile && (
                <p style={{ margin: "0.5rem 0 0", fontSize: "0.8rem", color: "var(--hub-text)" }}>
                  File terpilih: <b>{importFile.name}</b> ({(importFile.size / 1024).toFixed(1)} KB)
                </p>
              )}
            </div>

            {importMessage && (
              <p className={importMessage.includes("failed") ? "hub-data-error" : "hub-data-state"} style={{ marginTop: "1rem" }}>
                {importMessage}
              </p>
            )}

            {/* Validation & Preview Screen */}
            {importPreview && (
              <div style={{ marginTop: "1.25rem", borderTop: "1px solid var(--hub-line)", paddingTop: "1rem" }}>
                {/* Status Pills */}
                <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "1rem" }}>
                  <span style={{ fontSize: "0.75rem", color: "#4ade80", background: "rgba(34, 197, 94, 0.15)", padding: "0.3rem 0.6rem", borderRadius: "4px" }}>
                    ✓ {importPreview.valid.length} Baris Valid
                  </span>
                  {importPreview.errors.length > 0 && (
                    <span style={{ fontSize: "0.75rem", color: "#f87171", background: "rgba(239, 68, 68, 0.15)", padding: "0.3rem 0.6rem", borderRadius: "4px" }}>
                      ✗ {importPreview.errors.length} Baris Bermasalah
                    </span>
                  )}
                </div>

                {/* Errors display */}
                {importPreview.errors.length > 0 && (
                  <div style={{ marginBottom: "1rem", padding: "0.75rem", background: "rgba(239, 68, 68, 0.08)", border: "1px solid rgba(239, 68, 68, 0.3)", borderRadius: "6px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", color: "#f87171", fontSize: "0.75rem", fontWeight: 600, marginBottom: "0.4rem" }}>
                      <AlertTriangle size={14} /> Ditemukan Error Validasi:
                    </div>
                    <ul style={{ margin: 0, paddingLeft: "1.2rem", fontSize: "0.75rem", color: "#f87171", lineHeight: 1.45 }}>
                      {importPreview.errors.slice(0, 10).map((err, i) => (
                        <li key={i}>
                          <b>Baris {err.rowNumber}:</b> {err.reason}
                        </li>
                      ))}
                      {importPreview.errors.length > 10 && (
                        <li>...dan {importPreview.errors.length - 10} baris error lainnya.</li>
                      )}
                    </ul>
                  </div>
                )}

                {/* Valid Questions Preview Table */}
                {importPreview.valid.length > 0 && (
                  <div>
                    <h4 style={{ margin: "0 0 0.5rem", fontSize: "0.85rem", color: "var(--hub-text)" }}>
                      Preview Soal yang Akan Diimpor (Contoh 3 Soal Pertama):
                    </h4>
                    <div style={{ display: "grid", gap: "0.5rem" }}>
                      {importPreview.valid.slice(0, 3).map((item, idx) => (
                        <div key={idx} style={{ padding: "0.6rem", background: "var(--hub-panel-raised)", borderRadius: "5px", fontSize: "0.78rem" }}>
                          <p style={{ margin: "0 0 0.25rem", color: "var(--hub-text)", fontWeight: 500 }}>
                            {idx + 1}. {item.question_text}
                          </p>
                          <span style={{ color: "#4ade80", fontSize: "0.7rem", fontFamily: "var(--font-geist-mono), monospace" }}>
                            Kunci: {item.correct_answer} &nbsp;·&nbsp; Blok: {item.block || "—"} &nbsp;·&nbsp; Topik: {item.topic || "—"}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div style={{ marginTop: "1rem", display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
                      <button
                        type="button"
                        onClick={() => { setImportFile(null); setImportPreview(null); }}
                        style={{ padding: "0.5rem 1rem", border: "1px solid var(--hub-line)", background: "transparent", color: "var(--hub-muted)", cursor: "pointer", borderRadius: "4px" }}
                      >
                        BATALKAN
                      </button>
                      <button
                        type="button"
                        onClick={handleExecuteImport}
                        disabled={importing}
                        className="hub-primary-action"
                        style={{ padding: "0.55rem 1.25rem" }}
                      >
                        {importing ? "MENGIMPOR…" : `IMPOR ${importPreview.valid.length} SOAL VALID`}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* QUESTION FORM MODAL (ADD / EDIT)                                      */}
      {/* ===================================================================== */}
      {formOpen && (
        <div className="hub-crud-modal-backdrop" onMouseDown={closeForm}>
          <form
            className="hub-crud-form hub-crud-modal"
            onSubmit={handleSave}
            role="dialog"
            aria-modal="true"
            aria-label={editingId ? "Edit Soal" : "Tambah Soal"}
            onMouseDown={(e) => e.stopPropagation()}
            style={{ maxWidth: "42rem", width: "95%" }}
          >
            <div className="hub-crud-form-head">
              <span>{editingId ? "EDIT SOAL" : "TAMBAH SOAL BARU"}</span>
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
                <span>PERTANYAAN / KASUS KLINIS *</span>
                <textarea
                  rows={3}
                  required
                  placeholder="Tuliskan teks pertanyaan atau skenario klinis..."
                  value={form.question_text}
                  onChange={(e) => setForm({ ...form, question_text: e.target.value })}
                />
              </label>

              {/* Block & Topic (NO DIFFICULTY) */}
              <label>
                <span>BLOK KEDOKTERAN (OPSIONAL)</span>
                <input
                  type="text"
                  placeholder="e.g. Blok 1, Blok 5"
                  value={form.block}
                  onChange={(e) => setForm({ ...form, block: e.target.value })}
                />
              </label>

              <label>
                <span>TOPIK (OPSIONAL)</span>
                <input
                  type="text"
                  placeholder="e.g. Kardiovaskular, Farmakologi"
                  value={form.topic}
                  onChange={(e) => setForm({ ...form, topic: e.target.value })}
                />
              </label>

              {/* 5 Options A-E and Correct Answer */}
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
                    OPSI JAWABAN (A–E) & KUNCI JAWABAN *
                  </span>
                  <span style={{ fontSize: "0.58rem", color: "var(--hub-muted)" }}>
                    Pilih radio button di samping opsi yang benar.
                  </span>
                </div>

                {VALID_OPTIONS.map((opt) => (
                  <div key={opt} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "0.35rem", cursor: "pointer", minWidth: "3.2rem" }}>
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
                      placeholder={`Teks pilihan ${opt}...`}
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
                <span>PEMBAHASAN (OPSIONAL)</span>
                <textarea
                  rows={3}
                  placeholder="Penjelasan rasional klinis atau poin pembelajaran..."
                  value={form.explanation}
                  onChange={(e) => setForm({ ...form, explanation: e.target.value })}
                />
              </label>

              {/* Tags */}
              <label className="hub-field-wide">
                <span>TAGS (PISAH DENGAN KOMA, OPSIONAL)</span>
                <input
                  type="text"
                  placeholder="e.g. cardio, ekg, aritmia"
                  value={form.tags}
                  onChange={(e) => setForm({ ...form, tags: e.target.value })}
                />
              </label>

              {/* Bookmark */}
              <label
                className="hub-field-wide"
                style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}
              >
                <input
                  type="checkbox"
                  checked={form.is_bookmarked}
                  onChange={(e) => setForm({ ...form, is_bookmarked: e.target.checked })}
                />
                <span style={{ fontSize: "0.75rem" }}>Tandai sebagai bookmark</span>
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
                BATAL
              </button>
              <button type="submit" disabled={submitting} className="hub-primary-action">
                {submitting ? "MENYIMPAN…" : editingId ? "UPDATE SOAL" : "SIMPAN SOAL"}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
