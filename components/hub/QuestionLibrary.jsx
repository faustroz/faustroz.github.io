"use client";
/* eslint-disable @next/next/no-img-element -- private signed question images and local preview blobs are not static assets. */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Download,
  FileJson,
  Eye,
  EyeOff,
  FileSpreadsheet,
  Filter,
  Image as ImageIcon,
  MoreHorizontal,
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
  createPracticeRun,
  PRACTICE_RUN_STORAGE_KEY,
  readPracticeFilters,
  writePracticeFilters,
  writePracticeRun,
} from "@/lib/hub/academic-practice.mjs";
import {
  carryQuestionMetadata,
  createQuestionRepository,
  extractFilterOptions,
  extractPracticeTopics,
  filterQuestions,
  generateCsvTemplate,
  generateQuestionCsv,
  createQuestionBackup,
  reviewQuestionQuality,
  validateQuestionBackup,
  VALID_OPTIONS,
  validateCsvRows,
} from "@/lib/hub/question-bank.mjs";
import { buildAcademicPerformance } from "@/lib/hub/academic-performance.mjs";
import ImageOcclusionWorkspace from "@/components/hub/ImageOcclusionWorkspace";

const DEFAULT_FORM = Object.freeze({
  exam_type: "",
  question_type: "mcq",
  question_text: "",
  subject: "",
  block: "",
  topic: "",
  subtopic: "",
  difficulty: "medium",
  options: { A: "", B: "", C: "", D: "", E: "" },
  correct_answer: "A",
  explanation: "",
  reference_answer: "",
  image_path: "",
  image_file: null,
  tags: "",
  is_bookmarked: false,
});

export default function QuestionLibrary() {
  const router = useRouter();
  // Top-level bank sub-navigation: "practice" | "library" | "mistakes" | "import"
  const [activeTab, setActiveTab] = useState("practice");

  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notification, setNotification] = useState("");
  const [examCategories, setExamCategories] = useState([]);
  const [subjectCategories, setSubjectCategories] = useState([]);
  const [blockCategories, setBlockCategories] = useState([]);
  const [examTypeFilter, setExamTypeFilter] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");
  const [formatFilter, setFormatFilter] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [practiceExamType, setPracticeExamType] = useState("");
  const [practiceSubject, setPracticeSubject] = useState("");
  const [practiceFormat, setPracticeFormat] = useState("");
  const [selectedQuestionIds, setSelectedQuestionIds] = useState([]);
  const [imagePreview, setImagePreview] = useState("");
  const [categoryManagerKind, setCategoryManagerKind] = useState("");
  const [categoryRows, setCategoryRows] = useState([]);

  // Library filters
  const [search, setSearch] = useState("");
  const [blockFilter, setBlockFilter] = useState("");
  const [topicFilter, setTopicFilter] = useState("");
  const [bookmarkedOnly, setBookmarkedOnly] = useState(false);

  // Library question form modal
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [questionDrafts, setQuestionDrafts] = useState([]);
  const questionFormRef = useRef(null);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Hidden/revealed answers in library cards
  const [revealedAnswers, setRevealedAnswers] = useState({});

  // ---------------------------------------------------------------------------
  // BULK DELETE BY TOPIC MODAL STATE
  // ---------------------------------------------------------------------------
  const [topicDeleteOpen, setTopicDeleteOpen] = useState(false);
  const [deletingTopic, setDeletingTopic] = useState(false);
  const [deleteTopicError, setDeleteTopicError] = useState("");

  // ---------------------------------------------------------------------------
  // PRACTICE MODE STATE
  // ---------------------------------------------------------------------------
  const [practiceBlock, setPracticeBlock] = useState("");
  const [practiceTopic, setPracticeTopic] = useState("");
  const [practiceActive, setPracticeActive] = useState(false);
  const [practiceQuestions, setPracticeQuestions] = useState([]);
  const [practiceIndex, setPracticeIndex] = useState(0);
  const practiceQuestionStartedAt = useRef(Date.now());
  const [practiceSelectedAnswer, setPracticeSelectedAnswer] = useState("");
  const [practiceSubmitted, setPracticeSubmitted] = useState(false);
  const [practiceStats, setPracticeStats] = useState({ correct: 0, wrong: 0, incorrectQuestions: [] });
  const [practiceFinished, setPracticeFinished] = useState(false);

  // ---------------------------------------------------------------------------
  // MISTAKES REVIEW STATE
  // ---------------------------------------------------------------------------
  const [mistakes, setMistakes] = useState([]);
  const [loadingMistakes, setLoadingMistakes] = useState(false);
  const [performanceData, setPerformanceData] = useState(null);
  const [loadingPerformance, setLoadingPerformance] = useState(false);
  const [performanceError, setPerformanceError] = useState("");
  const [expandedSessionId, setExpandedSessionId] = useState("");
  const [restoringBackup, setRestoringBackup] = useState(false);

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
      const client = requireSupabase();
      const withImages = await Promise.all(data.map(async (question) => {
        if (!question.image_path) return question;
        const { data: signed, error: signError } = await client.storage.from("academic-question-images").createSignedUrl(question.image_path, 3600);
        return { ...question, image_url: signError ? "" : signed?.signedUrl || "" };
      }));
      setQuestions(withImages);
      const [examRows, subjectRows, blockRows] = await Promise.all([repository.listCategories("exam_type"), repository.listCategories("subject"), repository.listCategories("block")]);
      setExamCategories(examRows.map((row) => row.name));
      setSubjectCategories(subjectRows.map((row) => row.name));
      setBlockCategories(blockRows.map((row) => row.name));
    } catch (err) {
      setError(err.message || "Failed to load question bank.");
    } finally {
      setLoading(false);
    }
  }, [repository]);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  useEffect(() => {
    const savedFilters = readPracticeFilters(window.sessionStorage);
    if (!savedFilters) return;
    setPracticeExamType(savedFilters.examType);
    setPracticeBlock(savedFilters.block);
    setPracticeSubject(savedFilters.subject);
    setPracticeTopic(savedFilters.topic);
    setPracticeFormat(savedFilters.questionType);
  }, []);

  const loadMistakes = useCallback(async () => {
    if (!repository) return;
    setLoadingMistakes(true);
    try {
      const mistakeData = await repository.listMistakes();
      setMistakes(mistakeData);
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

  const loadPerformance = useCallback(async () => {
    if (!repository) return;
    setLoadingPerformance(true);
    setPerformanceError("");
    try {
      setPerformanceData(buildAcademicPerformance(await repository.listLearningData()));
    } catch (loadError) {
      setPerformanceError(loadError.message || "Riwayat belajar gagal dimuat.");
    } finally { setLoadingPerformance(false); }
  }, [repository]);

  useEffect(() => { if (activeTab === "practice") loadPerformance(); }, [activeTab, loadPerformance]);

  const filterOptions = useMemo(() => extractFilterOptions(questions), [questions]);
  const practiceAvailableTopics = useMemo(() => extractPracticeTopics(questions, {
    examType: practiceExamType,
    block: practiceBlock,
    subject: practiceSubject,
  }), [questions, practiceExamType, practiceBlock, practiceSubject]);

  useEffect(() => {
    if (!loading && practiceTopic && !practiceAvailableTopics.includes(practiceTopic)) setPracticeTopic("");
  }, [loading, practiceAvailableTopics, practiceTopic]);

  const availableBlocks = useMemo(() => [...new Set([...blockCategories, ...filterOptions.blocks])].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })), [blockCategories, filterOptions.blocks]);

  const filteredQuestions = useMemo(() => {
    return filterQuestions(questions, {
      search,
      examType: examTypeFilter,
      subject: subjectFilter,
      questionType: formatFilter,
      tag: tagFilter,
      block: blockFilter,
      topic: topicFilter,
      bookmarkedOnly,
    });
  }, [questions, search, examTypeFilter, subjectFilter, formatFilter, tagFilter, blockFilter, topicFilter, bookmarkedOnly]);

  const hasActiveFilters = Boolean(search || examTypeFilter || subjectFilter || formatFilter || tagFilter || blockFilter || topicFilter || bookmarkedOnly);
  const activeFilterCount = [examTypeFilter, blockFilter, subjectFilter, topicFilter, formatFilter, tagFilter, bookmarkedOnly].filter(Boolean).length;

  const resetFilters = () => {
    setSearch("");
    setExamTypeFilter("");
    setSubjectFilter("");
    setFormatFilter("");
    setTagFilter("");
    setBlockFilter("");
    setTopicFilter("");
    setBookmarkedOnly(false);
  };

  // Questions matching current block & topic for bulk delete
  const matchingTopicQuestions = useMemo(() => {
    if (!topicFilter) return [];
    return questions.filter((q) => {
      if (q.topic !== topicFilter) return false;
      if (blockFilter && q.block !== blockFilter) return false;
      return true;
    });
  }, [questions, blockFilter, topicFilter]);

  // ---------------------------------------------------------------------------
  // PRACTICE HANDLERS
  // ---------------------------------------------------------------------------
  const matchingPracticeQuestions = useMemo(() => {
    return questions.filter((q) => {
      if (practiceExamType && q.exam_type !== practiceExamType) return false;
      if (practiceBlock && q.block !== practiceBlock) return false;
      if (practiceSubject && q.subject !== practiceSubject) return false;
      if (practiceTopic && q.topic !== practiceTopic) return false;
      if (practiceFormat && (q.question_type || "mcq") !== practiceFormat) return false;
      return true;
    });
  }, [questions, practiceExamType, practiceBlock, practiceSubject, practiceTopic, practiceFormat]);

  const startPractice = async (targetQuestions = null, reviewKind = "") => {
    if (!repository) { setNotification("Supabase belum terhubung. Sesi latihan tidak dapat dicatat."); return; }
    const filteredPool = targetQuestions || matchingPracticeQuestions;
    const pool = filteredPool;
    if (!pool.length) return;
    const startedAt = new Date().toISOString();
    const selection = { examType: practiceExamType, subject: practiceSubject, block: practiceBlock, topic: practiceTopic, questionType: practiceFormat, reviewKind, startedAt };
    const session = createPracticeRun(pool, selection);
    if (!session) return;
    try {
      const savedSession = await repository.createSession({
        title: reviewKind === "mistakes" ? "Review Mistakes" : reviewKind === "due" ? "Spaced Review" : "Practice Session",
        session_kind: reviewKind || "practice",
        total_questions: pool.length,
        duration_minutes: null,
        filters: { examType: selection.examType, block: selection.block, subject: selection.subject, topic: selection.topic, questionType: selection.questionType },
        question_ids: pool.map((question) => question.id),
        answers: {},
        status: "in_progress",
        started_at: startedAt,
      });
      session.sessionId = savedSession.id;
    } catch (sessionError) {
      setNotification(sessionError.message || "Sesi latihan tidak dapat disimpan ke riwayat.");
      return;
    }
    if (!session || !writePracticeRun(window.sessionStorage, session)) {
      if (session?.sessionId) repository.abandonSession(session.sessionId).catch(() => {});
      setNotification("Sesi latihan tidak dapat disiapkan. Periksa penyimpanan browser lalu coba lagi.");
      return;
    }
    if (!writePracticeFilters(window.sessionStorage, { examType: practiceExamType, block: practiceBlock, subject: practiceSubject, topic: practiceTopic, questionType: practiceFormat })) {
      window.sessionStorage.removeItem(PRACTICE_RUN_STORAGE_KEY);
      if (session.sessionId) repository.abandonSession(session.sessionId).catch(() => {});
      setNotification("Pilihan latihan tidak dapat disimpan. Periksa penyimpanan browser lalu coba lagi.");
      return;
    }
    router.push("/academic/practice");
  };

  const currentQuestion = practiceQuestions[practiceIndex] || null;

  useEffect(() => {
    practiceQuestionStartedAt.current = Date.now();
  }, [practiceIndex, practiceActive]);

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
          correct_answer: currentQuestion.shuffledCorrectAnswer,
          correct_answer_text: currentQuestion.shuffledOptions?.[currentQuestion.shuffledCorrectAnswer],
          is_correct: isCorrect,
          time_spent_seconds: Math.max(0, Math.round((Date.now() - practiceQuestionStartedAt.current) / 1000)),
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
  // LIBRARY CRUD & BULK DELETE HANDLERS
  // ---------------------------------------------------------------------------
  const openCreateForm = () => {
    setEditingId(null);
    setForm(DEFAULT_FORM);
    setQuestionDrafts([]);
    setFormError("");
    setImagePreview("");
    setFormOpen(true);
  };

  const openEditForm = (question) => {
    setEditingId(question.id);
    setForm({
      question_text: question.question_text || "",
      exam_type: question.exam_type || "",
      question_type: question.question_type || "mcq",
      subject: question.subject || "",
      block: question.block || "",
      topic: question.topic || "",
      subtopic: question.subtopic || "",
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
      reference_answer: question.reference_answer || "",
      image_path: question.image_path || "",
      image_file: null,
      tags: (question.tags || []).join(", "),
      is_bookmarked: Boolean(question.is_bookmarked),
    });
    setQuestionDrafts([]);
    setImagePreview(question.image_url || "");
    setFormError("");
    setFormOpen(true);
  };

  const closeForm = () => {
    if (submitting) return;
    setFormOpen(false);
    setEditingId(null);
    setForm(DEFAULT_FORM);
    setQuestionDrafts([]);
    setImagePreview("");
    setFormError("");
  };

  const queueCurrentQuestion = () => {
    if (!questionFormRef.current?.reportValidity()) return;
    if (!form.question_text.trim()) {
      setFormError("Teks pertanyaan wajib diisi.");
      return;
    }
    setQuestionDrafts((drafts) => [...drafts, { ...form, options: { ...form.options } }]);
    if (questionFormRef.current?.elements.namedItem("question_image")) questionFormRef.current.elements.namedItem("question_image").value = "";
    setForm({ ...DEFAULT_FORM, ...carryQuestionMetadata(form) });
    setImagePreview("");
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
      const client = requireSupabase();
      if (editingId) {
        const imageFile = form.image_file;
        let uploadedImagePath = null;
        let imagePath = form.image_path || null;
        if (imageFile) {
          const { data: authData, error: authError } = await client.auth.getUser();
          if (authError || !authData.user) throw new Error("Sesi login tidak valid. Silakan masuk kembali.");
          const extension = ({ "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" })[imageFile.type];
          uploadedImagePath = `${authData.user.id}/${crypto.randomUUID()}.${extension}`;
          const { error: uploadError } = await client.storage.from("academic-question-images").upload(uploadedImagePath, imageFile, { contentType: imageFile.type, upsert: false });
          if (uploadError) throw new Error(`Upload gambar gagal: ${uploadError.message}`);
          imagePath = uploadedImagePath;
        }
        const payload = { ...form, image_path: imagePath };
        delete payload.image_file;
        const previousImagePath = questions.find((item) => item.id === editingId)?.image_path;
        let updated;
        try {
          updated = await repository.update(editingId, payload);
        } catch (error) {
          if (uploadedImagePath) await client.storage.from("academic-question-images").remove([uploadedImagePath]);
          throw error;
        }
        if (previousImagePath && previousImagePath !== imagePath) await client.storage.from("academic-question-images").remove([previousImagePath]);
        const signed = imagePath ? await client.storage.from("academic-question-images").createSignedUrl(imagePath, 3600) : null;
        setQuestions((prev) => prev.map((q) => (q.id === editingId ? { ...updated, image_url: signed?.data?.signedUrl || "" } : q)));
      } else {
        const batch = [...questionDrafts, { ...form, options: { ...form.options } }];
        const quality = reviewQuestionQuality(batch, questions);
        if (quality.errors.length) {
          setFormError(quality.errors.map((item) => `Soal ${item.rowNumber}: ${item.reason}`).join(" "));
          return;
        }
        const duplicateRows = new Set(quality.warnings.map((item) => item.rowNumber - 1));
        if (duplicateRows.size && !window.confirm(`${duplicateRows.size} soal tampak duplikat berdasarkan format, metadata, dan teks. Lewati duplikat dan simpan sisanya?`)) return;
        if (duplicateRows.size === batch.length) {
          setFormError("Semua soal terdeteksi sebagai duplikat. Tidak ada data yang disimpan.");
          return;
        }
        let savedDraftCount = 0;
        let batchIndex = 0;
        for (const item of batch) {
          const currentIndex = batchIndex++;
          if (duplicateRows.has(currentIndex)) { savedDraftCount += 1; continue; }
          const validatedItem = quality.valid[currentIndex];
          let uploadedImagePath = null;
          try {
            let imagePath = validatedItem.image_path || null;
            const imageFile = item.image_file;
            if (imageFile) {
              if (!/^image\/(jpeg|png|webp|gif)$/.test(imageFile.type) || imageFile.size > 5 * 1024 * 1024) throw new Error("Gambar harus JPG, PNG, WebP, atau GIF dengan ukuran maksimal 5 MB.");
              const { data: authData, error: authError } = await client.auth.getUser();
              if (authError || !authData.user) throw new Error("Sesi login tidak valid. Silakan masuk kembali.");
              const extension = ({ "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" })[imageFile.type];
              uploadedImagePath = `${authData.user.id}/${crypto.randomUUID()}.${extension}`;
              const { error: uploadError } = await client.storage.from("academic-question-images").upload(uploadedImagePath, imageFile, { contentType: imageFile.type, upsert: false });
              if (uploadError) throw new Error(`Upload gambar gagal: ${uploadError.message}`);
              imagePath = uploadedImagePath;
            }
            const payload = { ...item, ...validatedItem, image_path: imagePath };
            delete payload.image_file;
            const [created] = await repository.createBatch([payload]);
            if (!created) { savedDraftCount += 1; continue; }
            const signed = imagePath ? await client.storage.from("academic-question-images").createSignedUrl(imagePath, 3600) : null;
            setQuestions((prev) => [{ ...created, image_url: signed?.data?.signedUrl || "" }, ...prev]);
            savedDraftCount += 1;
          } catch (error) {
            if (uploadedImagePath) await client.storage.from("academic-question-images").remove([uploadedImagePath]);
            setQuestionDrafts((drafts) => drafts.slice(savedDraftCount));
            throw new Error(`Soal ${savedDraftCount + 1} gagal disimpan: ${error.message || "Kesalahan tidak diketahui"} Soal yang sudah berhasil tetap tersimpan; coba simpan lagi untuk melanjutkan.`);
          }
        }
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
      setNotification("1 soal berhasil dipindahkan ke Trash.");
      setTimeout(() => setNotification(""), 4000);
    } catch (err) {
      setError(err.message || "Failed to delete question.");
    }
  };

  const handleExecuteDeleteTopic = async () => {
    if (!repository || !topicFilter || deletingTopic) return;
    setDeletingTopic(true);
    setDeleteTopicError("");

    try {
      const result = await repository.removeByTopic({
        block: blockFilter || undefined,
        topic: topicFilter,
      });

      const deletedCount = result.deletedCount;
      const deletedIdsSet = new Set(result.deletedIds);

      // Remove deleted questions from active questions state
      setQuestions((prev) => prev.filter((q) => !deletedIdsSet.has(q.id)));

      setTopicDeleteOpen(false);
      setNotification(`Berhasil memindahkan ${deletedCount} soal di topik "${topicFilter}" ke Trash.`);
      setTimeout(() => setNotification(""), 5000);
    } catch (err) {
      setDeleteTopicError(err.message || "Gagal menghapus soal di topik ini.");
    } finally {
      setDeletingTopic(false);
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
      const validation = validateCsvRows(text, { examTypes: examCategories, subjects: subjectCategories, existingQuestions: questions });
      setImportPreview(validation);
    } catch (parseErr) {
      setImportPreview({
        valid: [],
        errors: [{ rowNumber: 1, reason: parseErr.message || "Failed to read CSV file." }],
      });
    }
  };

  const handleAddCategory = async (kind) => {
    const categoryName = kind === "exam_type" ? "Exam Type" : kind === "subject" ? "Subject" : "Blok";
    const value = window.prompt(`Nama ${categoryName} baru:`)?.trim();
    if (!value) return;
    try {
      await repository.addCategory(kind, value);
      const rows = await repository.listCategories(kind);
      setCategoryRows(rows);
      if (kind === "exam_type") setExamCategories(rows.map((row) => row.name));
      else if (kind === "subject") setSubjectCategories(rows.map((row) => row.name));
      else setBlockCategories(rows.map((row) => row.name));
      setNotification(`${categoryName} disimpan.`);
    } catch (categoryError) { setError(categoryError.message || "Kategori gagal disimpan."); }
  };

  const openCategoryManager = async (kind) => {
    try {
      setCategoryRows(await repository.listCategories(kind));
      setCategoryManagerKind(kind);
    } catch (categoryError) { setError(categoryError.message || "Kategori gagal dimuat."); }
  };

  const renameCategory = async (row) => {
    const name = window.prompt("Nama kategori baru:", row.name)?.trim();
    if (!name || name === row.name) return;
    try {
      await repository.updateCategory(row.id, name);
      setCategoryRows(await repository.listCategories(categoryManagerKind));
      if (row.kind === "exam_type") setExamCategories((prev) => [...new Set([...prev.filter((item) => item !== row.name), name])]);
      else if (row.kind === "subject") setSubjectCategories((prev) => [...new Set([...prev.filter((item) => item !== row.name), name])]);
      else setBlockCategories((prev) => [...new Set([...prev.filter((item) => item !== row.name), name])]);
    } catch (categoryError) { setError(categoryError.message || "Kategori gagal diubah."); }
  };

  const deleteCategory = async (row) => {
    if (!window.confirm("Hapus kategori dari daftar? Metadata soal yang sudah tersimpan tidak akan diubah.")) return;
    try {
      await repository.removeCategory(row.id);
      setCategoryRows((prev) => prev.filter((item) => item.id !== row.id));
      if (row.kind === "exam_type") setExamCategories((prev) => prev.filter((item) => item !== row.name));
      else if (row.kind === "subject") setSubjectCategories((prev) => prev.filter((item) => item !== row.name));
      else setBlockCategories((prev) => prev.filter((item) => item !== row.name));
    } catch (categoryError) { setError(categoryError.message || "Kategori gagal dihapus."); }
  };

  const handleExecuteImport = async () => {
    if (!repository || !importPreview || !importPreview.valid.length || importing) return;
    setImporting(true);
    setImportMessage("");

    if (importPreview.warnings?.length && !window.confirm(`${importPreview.warnings.length} baris terdeteksi mirip/duplikat. Baris duplikat akan dilewati. Lanjutkan impor baris lainnya?`)) {
      setImporting(false);
      return;
    }

    try {
      const inserted = await repository.createBatch(importPreview.valid);
      setQuestions((prev) => [...inserted, ...prev]);
      setImportMessage(`Berhasil mengimpor ${inserted.length} soal ke Question Bank. ${importPreview.valid.length - inserted.length} duplikat dilewati.`);
      setImportFile(null);
      setImportPreview(null);
    } catch (importErr) {
      setImportMessage(`Gagal mengimpor: ${importErr.message}`);
    } finally {
      setImporting(false);
    }
  };

  const handleDownloadTemplate = (questionType) => {
    const csvContent = generateCsvTemplate(questionType);
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `medical_questions_${questionType}_template.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  const handleExportCsv = () => {
    const blob = new Blob([generateQuestionCsv(questions)], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "4allx-question-bank.csv";
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  const handleExportJson = () => {
    const backup = createQuestionBackup(questions, new Date().toISOString(), { examTypes: examCategories, subjects: subjectCategories, blocks: blockCategories });
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a"); link.href = url; link.download = "4allx-question-bank-backup.json"; link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  const handleJsonBackupChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setImportFile(file); setImportMessage("");
    try {
      const backup = JSON.parse(await file.text());
      setImportPreview({ ...validateQuestionBackup(backup, questions), source: "json" });
    } catch (error) {
      setImportPreview({ valid: [], warnings: [], errors: [{ rowNumber: 1, reason: error.message || "File backup JSON tidak valid." }], source: "json" });
    }
  };

  const handleExecuteJsonRestore = async () => {
    if (!repository || !importPreview?.valid?.length || restoringBackup) return;
    if (importPreview.warnings?.length && !window.confirm(`${importPreview.warnings.length} soal duplikat akan dilewati. Lanjutkan pemulihan?`)) return;
    setRestoringBackup(true); setImportMessage("");
    try {
      for (const [kind, names] of [["exam_type", importPreview.categories?.examTypes || []], ["subject", importPreview.categories?.subjects || []], ["block", importPreview.categories?.blocks || []]]) {
        for (const name of names) await repository.addCategory(kind, name);
      }
      if (importPreview.categories) {
        const [examRows, subjectRows, blockRows] = await Promise.all([repository.listCategories("exam_type"), repository.listCategories("subject"), repository.listCategories("block")]);
        setExamCategories(examRows.map((row) => row.name)); setSubjectCategories(subjectRows.map((row) => row.name)); setBlockCategories(blockRows.map((row) => row.name));
      }
      const inserted = await repository.createBatch(importPreview.valid);
      setQuestions((previous) => [...inserted, ...previous]);
      setImportMessage(`Pemulihan selesai: ${inserted.length} soal ditambahkan, ${importPreview.valid.length - inserted.length} duplikat dilewati. Referensi path gambar disimpan; file privat tidak ikut disalin.`);
      setImportPreview(null); setImportFile(null);
    } catch (error) { setImportMessage(`Pemulihan gagal: ${error.message}`); }
    finally { setRestoringBackup(false); }
  };

  return (
    <section className="hub-crud-panel hub-question-bank-workspace" aria-label="Question Bank Workspace">
      {/* Top Heading & Responsive Tab Bar */}
      <header className="hub-crud-heading" style={{ flexWrap: "wrap", gap: "0.75rem", padding: "1rem" }}>
        <div style={{ flex: "1 1 18rem", minWidth: 0 }}>
          <span style={{ fontSize: "0.62rem", color: "var(--hub-muted)", fontFamily: "var(--font-geist-mono), monospace" }}>
            ACADEMIC / QUESTION BANK
          </span>
          <h2 style={{ fontSize: "clamp(1.35rem, 4vw, 1.75rem)", margin: "0.2rem 0", color: "var(--hub-text)", wordBreak: "break-word" }}>
            Question Library & Practice
          </h2>
          <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--hub-muted)", lineHeight: 1.45 }}>
            Latihan soal MCQ dan Essay, catatan kesalahan, serta impor CSV.
          </p>
        </div>

        {/* Workspace Mode Subtabs (Mobile scrollable without horizontal overflow) */}
        <div
          className="hub-question-tabs"
          role="tablist"
          aria-label="Question bank modes"
          style={{
            display: "flex",
            gap: "0.35rem",
            padding: "0.25rem",
            border: "1px solid var(--hub-line)",
            borderRadius: "7px",
            maxWidth: "100%",
            overflowX: "auto",
            scrollbarWidth: "none",
            WebkitOverflowScrolling: "touch",
          }}
        >
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
              font: "0.7rem 'IBM Plex Mono', var(--font-geist-mono), monospace",
              cursor: "pointer",
              whiteSpace: "nowrap",
              flexShrink: 0,
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
              font: "0.7rem 'IBM Plex Mono', var(--font-geist-mono), monospace",
              cursor: "pointer",
              whiteSpace: "nowrap",
              flexShrink: 0,
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
              font: "0.7rem 'IBM Plex Mono', var(--font-geist-mono), monospace",
              cursor: "pointer",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            MISTAKES
          </button>
          <button type="button" role="tab" aria-selected={activeTab === "image-occlusion"} className={`hub-question-mode-tab${activeTab === "image-occlusion" ? " is-active" : ""}`} onClick={() => setActiveTab("image-occlusion")}>IMAGE OCCLUSION</button>
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
              font: "0.7rem 'IBM Plex Mono', var(--font-geist-mono), monospace",
              cursor: "pointer",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            CSV IMPORT
          </button>
        </div>
      </header>

      {/* Notifications and Alerts */}
      {notification && (
        <div style={{ margin: "0.5rem 1rem", padding: "0.65rem 0.9rem", background: "rgba(34, 197, 94, 0.12)", border: "1px solid rgba(34, 197, 94, 0.4)", borderRadius: "6px", color: "#4ade80", fontSize: "0.82rem" }} role="status">
          ✓ {notification}
        </div>
      )}
      {error && <p className="hub-data-error" role="alert" style={{ margin: "0.5rem 1rem" }}>{error}</p>}

      {activeTab === "image-occlusion" && <ImageOcclusionWorkspace />}

      {/* ===================================================================== */}
      {/* TAB 1: PRACTICE MODE                                                  */}
      {/* ===================================================================== */}
      {activeTab === "practice" && (
        <div className="hub-practice-container" style={{ padding: "0.75rem clamp(0.5rem, 3vw, 1.25rem)" }}>
          <section className="hub-learning-summary" aria-label="Analitik dan riwayat latihan" style={{ maxWidth: "62rem", margin: "0 auto 1rem", borderBottom: "1px solid var(--hub-line)", padding: "0.5rem 0 1rem" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem", flexWrap: "wrap" }}>
              <div><h3 style={{ margin: 0, fontSize: "1rem", color: "var(--hub-text)" }}>Performa &amp; riwayat latihan</h3><p style={{ margin: "0.25rem 0 0", color: "var(--hub-muted)", fontSize: "0.78rem" }}>Akurasi dihitung dari attempt MCQ yang dinilai; essay tidak dimasukkan.</p></div>
              <button type="button" className="hub-question-tool-button" onClick={loadPerformance} disabled={loadingPerformance} style={{ minHeight: "40px" }}>{loadingPerformance ? "Memuat…" : "Muat ulang"}</button>
            </div>
            {performanceError && <p className="hub-data-error" role="alert">{performanceError}</p>}
            {loadingPerformance && !performanceData ? <p className="hub-data-state">Memuat riwayat latihan…</p> : performanceData && <>
              <div className="hub-learning-stat-grid">
                {[
                  ["MCQ DIKERJAKAN", performanceData.totals.mcqGraded],
                  ["BENAR / SALAH", `${performanceData.totals.correct} / ${performanceData.totals.wrong}`],
                  ["AKURASI MCQ", performanceData.totals.accuracy === null ? "—" : `${performanceData.totals.accuracy}%`],
                  ["SESI TERCATAT", performanceData.sessions.length],
                  ["PERUBAHAN SESI", performanceData.accuracyChange === null ? "Belum cukup data" : `${performanceData.accuracyChange > 0 ? "+" : ""}${performanceData.accuracyChange} poin`],
                ].map(([label, value]) => <div className="hub-learning-stat" key={label}><span>{label}</span><strong>{value}</strong></div>)}
              </div>
              {performanceData.weakAreas.length > 0 && <p style={{ margin: "0.7rem 0 0", fontSize: "0.78rem", color: "var(--hub-muted)" }}><strong style={{ color: "var(--hub-text)" }}>Area untuk ditinjau:</strong> {performanceData.weakAreas.map((area) => `${area.category} ${area.name} (${area.accuracy}%, ${area.graded} soal)`).join(" · ")}</p>}
              {performanceData.totals.mcqGraded === 0 && <p style={{ margin: "0.7rem 0 0", fontSize: "0.78rem", color: "var(--hub-muted)" }}>Belum ada attempt MCQ yang dapat dihitung. Mulai latihan untuk membangun ringkasan berbasis data.</p>}
              {(performanceData.byBlock.length > 0 || performanceData.bySubject.length > 0) && <details style={{ marginTop: "0.65rem" }}><summary style={{ cursor: "pointer", color: "var(--hub-muted)", fontSize: "0.78rem" }}>Rincian per blok &amp; subject</summary><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 13rem), 1fr))", gap: "1rem", marginTop: "0.55rem" }}>{[["Blok", performanceData.byBlock], ["Subject", performanceData.bySubject]].map(([title, groups]) => <div key={title}><strong style={{ color: "var(--hub-text)", fontSize: "0.76rem" }}>{title}</strong>{groups.map((group) => <p key={group.name} style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem", margin: "0.35rem 0", color: "var(--hub-muted)", fontSize: "0.75rem" }}><span>{group.name} · {group.graded} MCQ</span><b style={{ color: "var(--hub-text)", flexShrink: 0 }}>{group.accuracy}%</b></p>)}</div>)}</div></details>}
              <details style={{ marginTop: "0.75rem" }}>
                <summary style={{ cursor: "pointer", color: "var(--hub-text)", fontSize: "0.82rem" }}>Riwayat sesi ({performanceData.sessions.length})</summary>
                {performanceData.sessions.length ? <div style={{ marginTop: "0.5rem", borderTop: "1px solid var(--hub-line)" }}>{performanceData.sessions.slice(0, 12).map((session) => {
                  const snapshot = Array.isArray(session.answers) ? session.answers : [];
                  const correct = snapshot.filter((answer) => answer.status === "correct").length;
                  const wrong = snapshot.filter((answer) => answer.status === "wrong").length;
                  const unanswered = snapshot.filter((answer) => answer.status === "unanswered").length;
                  return <article key={session.id} style={{ padding: "0.7rem 0", borderBottom: "1px solid var(--hub-line)" }}>
                    <button type="button" onClick={() => setExpandedSessionId((id) => id === session.id ? "" : session.id)} aria-expanded={expandedSessionId === session.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.75rem", width: "100%", textAlign: "left", border: 0, padding: 0, background: "transparent", color: "var(--hub-text)", cursor: "pointer" }}>
                      <span style={{ minWidth: 0 }}><strong>{session.title || "Practice Session"}</strong><small style={{ display: "block", color: "var(--hub-muted)", marginTop: "0.2rem" }}>{new Date(session.started_at || session.created_at).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })} · {session.total_questions} soal · {[session.filters?.examType, session.filters?.block, session.filters?.subject].filter(Boolean).join(" / ") || "Semua filter"}</small></span>
                      <span style={{ flexShrink: 0, textAlign: "right", fontSize: "0.76rem", color: "var(--hub-muted)" }}>{session.status === "completed" ? (session.accuracy_percent == null ? "Essay / belum ada nilai MCQ" : `${session.accuracy_percent}% MCQ`) : session.status === "in_progress" ? "Belum selesai" : "Ditinggalkan"}<small style={{ display: "block", marginTop: "0.2rem" }}>{session.status === "completed" ? `${correct} benar · ${wrong} salah · ${unanswered} kosong` : ""}</small></span>
                    </button>
                    {expandedSessionId === session.id && <div style={{ marginTop: "0.65rem", paddingTop: "0.6rem", borderTop: "1px solid var(--hub-line)" }}>
                      {snapshot.length ? snapshot.map((answer, index) => <div key={`${session.id}-${answer.questionId}-${index}`} style={{ padding: "0.5rem 0", borderBottom: "1px solid var(--hub-line)", fontSize: "0.78rem" }}><strong>{String(index + 1).padStart(2, "0")} · {answer.status === "correct" ? "Benar" : answer.status === "wrong" ? "Salah" : answer.status === "essay" ? "Essay · tinjau sendiri" : "Belum dijawab"}</strong><p style={{ margin: "0.25rem 0", whiteSpace: "pre-wrap", color: "var(--hub-text)" }}>{answer.questionText}</p>{answer.questionType === "essay" ? <p style={{ margin: 0, color: "var(--hub-muted)", whiteSpace: "pre-wrap" }}>Jawaban: {answer.essayAnswer || "—"}<br />Referensi: {answer.referenceAnswer || "—"}</p> : <p style={{ margin: 0, color: "var(--hub-muted)" }}>Jawaban Anda: {answer.selectedAnswer || "—"} · Kunci: {answer.correctAnswer || "—"}</p>}{answer.timeSpentSeconds != null && <small style={{ display: "block", marginTop: "0.2rem", color: "var(--hub-muted)" }}>Waktu soal: {answer.timeSpentSeconds} detik</small>}</div>) : <p style={{ margin: 0, color: "var(--hub-muted)", fontSize: "0.78rem" }}>Sesi lama atau belum selesai belum memiliki snapshot jawaban.</p>}
                    </div>}
                  </article>;
                })}</div> : <p style={{ margin: "0.6rem 0 0", color: "var(--hub-muted)", fontSize: "0.78rem" }}>Riwayat akan muncul setelah sesi latihan diselesaikan.</p>}
              </details>
            </>}
          </section>
          {!practiceActive ? (
            /* Practice Setup Screen */
            <div style={{ maxWidth: "62rem", margin: "0 auto", display: "grid", gap: "1rem" }}>
              <div style={{ border: "1px solid var(--hub-line)", padding: "1.25rem", borderRadius: "8px", background: "var(--hub-panel)" }}>
                <span style={{ fontSize: "0.62rem", color: "var(--hub-muted)", fontFamily: "var(--font-geist-mono), monospace" }}>
                  SETUP PRACTICE SESSION
                </span>
                <h3 style={{ margin: "0.4rem 0 0.2rem", fontSize: "1.25rem", color: "var(--hub-text)" }}>
                  Pilih Soal Latihan
                </h3>
                <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--hub-muted)", lineHeight: 1.45 }}>
                  Pilih kombinasi ujian dan materi. Soal dan opsi MCQ diacak sekali saat sesi dimulai.
                </p>

                <div style={{ display: "grid", gap: "0.75rem", marginTop: "1rem" }}>
                  <label style={{ display: "grid", gap: "0.3rem" }}>
                    <span style={{ fontSize: "0.62rem", color: "var(--hub-muted)", fontFamily: "var(--font-geist-mono), monospace" }}>EXAM TYPE</span>
                    <select aria-label="Exam Type latihan" value={practiceExamType} onChange={(e) => setPracticeExamType(e.target.value)} style={{ padding: "0.65rem 0.75rem", border: "1px solid var(--hub-line)", background: "var(--hub-panel-raised)", color: "var(--hub-text)", borderRadius: "6px", fontSize: "16px", minHeight: "44px" }}>
                      <option value="">Semua jenis ujian</option>{examCategories.map((name) => <option key={name} value={name}>{name}</option>)}
                    </select>
                  </label>
                  <label style={{ display: "grid", gap: "0.3rem" }}>
                    <span style={{ fontSize: "0.62rem", color: "var(--hub-muted)", fontFamily: "var(--font-geist-mono), monospace" }}>
                      BLOK KEDOKTERAN
                    </span>
                    <select
                      value={practiceBlock}
                      onChange={(e) => setPracticeBlock(e.target.value)}
                      style={{ padding: "0.65rem 0.75rem", border: "1px solid var(--hub-line)", background: "var(--hub-panel-raised)", color: "var(--hub-text)", borderRadius: "6px", fontSize: "16px", minHeight: "44px" }}
                    >
                      <option value="">Semua Blok ({questions.length} soal)</option>
                      {availableBlocks.map((b) => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </label>
                  <label style={{ display: "grid", gap: "0.3rem" }}>
                    <span style={{ fontSize: "0.62rem", color: "var(--hub-muted)", fontFamily: "var(--font-geist-mono), monospace" }}>SUBJECT</span>
                    <select aria-label="Subject latihan" value={practiceSubject} onChange={(e) => setPracticeSubject(e.target.value)} style={{ padding: "0.65rem 0.75rem", border: "1px solid var(--hub-line)", background: "var(--hub-panel-raised)", color: "var(--hub-text)", borderRadius: "6px", fontSize: "16px", minHeight: "44px" }}>
                      <option value="">Semua subject</option>{subjectCategories.map((name) => <option key={name} value={name}>{name}</option>)}
                    </select>
                  </label>
                  <label style={{ display: "grid", gap: "0.3rem" }}>
                    <span style={{ fontSize: "0.62rem", color: "var(--hub-muted)", fontFamily: "var(--font-geist-mono), monospace" }}>FORMAT SOAL</span>
                    <select aria-label="Format soal latihan" value={practiceFormat} onChange={(e) => setPracticeFormat(e.target.value)} style={{ padding: "0.65rem 0.75rem", border: "1px solid var(--hub-line)", background: "var(--hub-panel-raised)", color: "var(--hub-text)", borderRadius: "6px", fontSize: "16px", minHeight: "44px" }}>
                      <option value="">MCQ + Essay</option><option value="mcq">Hanya MCQ</option><option value="essay">Hanya Essay</option>
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
                        style={{ padding: "0.65rem 0.75rem", border: "1px solid var(--hub-line)", background: "var(--hub-panel-raised)", color: "var(--hub-text)", borderRadius: "6px", fontSize: "16px", minHeight: "44px" }}
                      >
                        <option value="">Semua Topik</option>
                        {practiceAvailableTopics.length === 0 && <option value="" disabled>Topik belum tersedia untuk pilihan ini</option>}
                        {practiceAvailableTopics.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </label>
                  )}
                </div>

                <div style={{ marginTop: "1.25rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}>
                  <span style={{ fontSize: "0.75rem", color: "var(--hub-muted)", fontFamily: "var(--font-geist-mono), monospace" }}>
                    {matchingPracticeQuestions.length} SOAL TERSEDIA
                  </span>

                  <button
                    type="button"
                    onClick={() => startPractice()}
                    disabled={!matchingPracticeQuestions.length}
                    className="hub-primary-action"
                    style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "0.4rem", padding: "0.75rem 1.25rem", minHeight: "44px", width: "100%", maxWidth: "14rem" }}
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

              <div style={{ margin: "1.25rem 0", padding: "1.25rem 1rem", background: "var(--hub-panel-raised)", borderRadius: "8px", border: "1px solid var(--hub-line)" }}>
                <strong style={{ display: "block", fontSize: "2.6rem", color: "var(--hub-accent)", fontFamily: "var(--font-geist-mono), monospace" }}>
                  {practiceQuestions.length ? Math.round((practiceStats.correct / practiceQuestions.length) * 100) : 0}%
                </strong>
                <p style={{ margin: "0.4rem 0 0", fontSize: "0.85rem", color: "var(--hub-muted)" }}>
                  {practiceStats.correct} Benar &nbsp;·&nbsp; {practiceStats.wrong} Salah &nbsp;·&nbsp; Total {practiceQuestions.length} Soal
                </p>
              </div>

              <div style={{ display: "grid", gap: "0.6rem" }}>
                {practiceStats.wrong > 0 && (
                  <button
                    type="button"
                    onClick={retryPracticeIncorrect}
                    className="hub-primary-action"
                    style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "0.4rem", minHeight: "44px" }}
                  >
                    <RotateCcw size={13} /> ULANGI SOAL SALAH ({practiceStats.wrong})
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setPracticeActive(false)}
                  style={{ minHeight: "44px", border: "1px solid var(--hub-line)", background: "transparent", color: "var(--hub-text)", cursor: "pointer", borderRadius: "4px" }}
                >
                  SESI LATIHAN BARU
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("mistakes")}
                  style={{ minHeight: "44px", border: "1px solid var(--hub-line)", background: "transparent", color: "var(--hub-muted)", cursor: "pointer", borderRadius: "4px" }}
                >
                  BUKA CATATAN KESALAHAN
                </button>
              </div>
            </div>
          ) : (
            /* Active Question Runner (Mobile-Optimized) */
            <div style={{ maxWidth: "42rem", margin: "0 auto", display: "grid", gap: "0.85rem" }}>
              {/* Progress & Quick Stats */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--hub-line)", paddingBottom: "0.6rem", flexWrap: "wrap", gap: "0.5rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
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
                  <span style={{ fontSize: "0.7rem", fontFamily: "var(--font-geist-mono), monospace", color: "#4ade80" }}>
                    ✓ {practiceStats.correct}
                  </span>
                  <span style={{ fontSize: "0.7rem", fontFamily: "var(--font-geist-mono), monospace", color: "#f87171" }}>
                    ✗ {practiceStats.wrong}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPracticeActive(false)}
                    style={{ background: "transparent", border: "none", color: "var(--hub-muted)", fontSize: "0.72rem", cursor: "pointer", padding: "0.3rem" }}
                  >
                    Keluar
                  </button>
                </div>
              </div>

              {/* Question Stem */}
              <div style={{ background: "var(--hub-panel)", border: "1px solid var(--hub-line)", padding: "1.1rem", borderRadius: "8px", overflowWrap: "anywhere" }}>
                <p style={{ margin: 0, fontSize: "clamp(0.92rem, 3vw, 1.05rem)", lineHeight: 1.55, color: "var(--hub-text)", whiteSpace: "pre-wrap" }}>
                  {currentQuestion?.question_text}
                </p>
              </div>

              {/* Shuffled Options (Large Touch Targets for Mobile) */}
              <div style={{ display: "grid", gap: "0.6rem" }}>
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
                        alignItems: "center",
                        gap: "0.75rem",
                        padding: "0.85rem 1rem",
                        minHeight: "48px",
                        borderRadius: "7px",
                        border: optionBorder,
                        background: optionBg,
                        color: optionColor,
                        cursor: practiceSubmitted ? "default" : "pointer",
                        textAlign: "left",
                        width: "100%",
                        touchAction: "manipulation",
                      }}
                    >
                      <strong
                        style={{
                          fontFamily: "var(--font-geist-mono), monospace",
                          fontSize: "0.95rem",
                          minWidth: "1.5rem",
                          color: isCorrect && practiceSubmitted ? "#4ade80" : isSelected && !practiceSubmitted ? "var(--hub-accent)" : "var(--hub-muted)",
                        }}
                      >
                        {opt}.
                      </strong>
                      <span style={{ flex: 1, fontSize: "clamp(0.85rem, 2.5vw, 0.92rem)", lineHeight: 1.45, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
                        {optText}
                      </span>
                      {practiceSubmitted && isCorrect && (
                        <CheckCircle2 size={18} color="#4ade80" style={{ flexShrink: 0 }} />
                      )}
                      {practiceSubmitted && isSelected && !isCorrect && (
                        <XCircle size={18} color="#f87171" style={{ flexShrink: 0 }} />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Action Button: Submit or Next */}
              <div style={{ marginTop: "0.4rem" }}>
                {!practiceSubmitted ? (
                  <button
                    type="button"
                    onClick={handlePracticeSubmit}
                    disabled={!practiceSelectedAnswer}
                    className="hub-primary-action"
                    style={{ width: "100%", minHeight: "48px", fontSize: "0.88rem", display: "flex", justifyContent: "center", alignItems: "center" }}
                  >
                    SUBMIT JAWABAN
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handlePracticeNext}
                    className="hub-primary-action"
                    style={{ width: "100%", minHeight: "48px", fontSize: "0.88rem", display: "inline-flex", justifyContent: "center", alignItems: "center", gap: "0.5rem" }}
                  >
                    {practiceIndex + 1 < practiceQuestions.length ? "SOAL BERIKUTNYA" : "SELESAI & LIHAT HASIL"}
                    <ArrowRight size={15} />
                  </button>
                )}
              </div>

              {/* Immediate Explanation Display */}
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
                  <p style={{ margin: "0 0 0.5rem", fontSize: "0.85rem", color: "var(--hub-text)", lineHeight: 1.45 }}>
                    Kunci Jawaban yang Benar: <b>{currentQuestion.shuffledCorrectAnswer}. {currentQuestion.shuffledOptions[currentQuestion.shuffledCorrectAnswer]}</b>
                  </p>
                  {currentQuestion.explanation ? (
                    <div style={{ fontSize: "0.82rem", color: "var(--hub-muted)", lineHeight: 1.5, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
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
          <div className="hub-question-toolbar" aria-label="Question library toolbar">
            <label className="hub-question-search">
              <Search size={15} aria-hidden="true" />
              <input type="search" aria-label="Cari soal" placeholder="Cari soal atau metadata…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </label>
            <button type="button" className="hub-question-tool-button" aria-expanded={filterPanelOpen} aria-controls="question-filter-panel" onClick={() => setFilterPanelOpen((open) => !open)}>
              <Filter size={15} aria-hidden="true" /> Filter{activeFilterCount > 0 && <span className="hub-question-filter-count">{activeFilterCount}</span>}
            </button>
            <button type="button" className="hub-primary-action hub-question-add-button" onClick={openCreateForm}><Plus size={15} aria-hidden="true" /> Tambah soal</button>
            <details className="hub-question-more" open={moreMenuOpen} onToggle={(event) => setMoreMenuOpen(event.currentTarget.open)}>
              <summary aria-label="Aksi lainnya" title="Aksi lainnya"><MoreHorizontal size={19} aria-hidden="true" /></summary>
              <div className="hub-question-more-menu" aria-label="Aksi Question Bank lainnya">
                <button type="button" onClick={() => { handleExportCsv(); setMoreMenuOpen(false); }} disabled={!questions.length}><Download size={14} /> Export CSV</button>
                <button type="button" onClick={() => { handleExportJson(); setMoreMenuOpen(false); }} disabled={!questions.length}><FileJson size={14} /> Backup JSON</button>
                <button type="button" onClick={() => { handleAddCategory("exam_type"); setMoreMenuOpen(false); }}>Tambah Exam Type</button>
                <button type="button" onClick={() => { handleAddCategory("subject"); setMoreMenuOpen(false); }}>Tambah Subject</button>
                <button type="button" onClick={() => { handleAddCategory("block"); setMoreMenuOpen(false); }}>Tambah Blok</button>
                <button type="button" onClick={() => { openCategoryManager("exam_type"); setMoreMenuOpen(false); }}>Kelola Exam Types</button>
                <button type="button" onClick={() => { openCategoryManager("subject"); setMoreMenuOpen(false); }}>Kelola Subjects</button>
                <button type="button" onClick={() => { openCategoryManager("block"); setMoreMenuOpen(false); }}>Kelola Blok</button>
              </div>
            </details>
          </div>

          <div id="question-filter-panel" className="hub-question-filter-panel" hidden={!filterPanelOpen}>
            <div className="hub-question-filter-grid">
              <label><span>EXAM TYPE</span><select aria-label="Filter exam type" value={examTypeFilter} onChange={(e) => setExamTypeFilter(e.target.value)}><option value="">Semua jenis ujian</option>{examCategories.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
              <label><span>BLOCK</span><select aria-label="Filter block" value={blockFilter} onChange={(e) => setBlockFilter(e.target.value)}><option value="">Semua block</option>{availableBlocks.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
              <label><span>SUBJECT</span><select aria-label="Filter subject" value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)}><option value="">Semua subject</option>{subjectCategories.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
              <label><span>TOPIC</span><select aria-label="Filter topic" value={topicFilter} onChange={(e) => setTopicFilter(e.target.value)}><option value="">Semua topic</option>{filterOptions.topics.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
              <label><span>FORMAT</span><select aria-label="Filter format" value={formatFilter} onChange={(e) => setFormatFilter(e.target.value)}><option value="">MCQ + Essay</option><option value="mcq">MCQ</option><option value="essay">Essay</option></select></label>
              <label><span>TAG</span><select aria-label="Filter tag" value={tagFilter} onChange={(e) => setTagFilter(e.target.value)}><option value="">Semua tag</option>{filterOptions.tags.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
            </div>
            <div className="hub-question-filter-footer">
              <label className="hub-question-bookmark-filter"><input type="checkbox" checked={bookmarkedOnly} onChange={(event) => setBookmarkedOnly(event.target.checked)} /> <Star size={14} fill={bookmarkedOnly ? "currentColor" : "none"} /> Bookmark only</label>
              {topicFilter && <button type="button" className="hub-danger-action" onClick={() => setTopicDeleteOpen(true)} disabled={!matchingTopicQuestions.length}><Trash2 size={13} /> Hapus semua di topic ({matchingTopicQuestions.length})</button>}
              <span className="hub-question-result-count">{filteredQuestions.length} / {questions.length} soal</span>
              {selectedQuestionIds.length > 0 && <button type="button" className="hub-question-tool-button" onClick={() => startPractice(questions.filter((q) => selectedQuestionIds.includes(q.id)))}><Play size={13} /> Latihan {selectedQuestionIds.length} terpilih</button>}
              {hasActiveFilters && <button type="button" className="hub-question-reset" onClick={resetFilters}><RotateCcw size={13} /> Reset filter</button>}
            </div>
          </div>

          {/* Question List */}
          {loading ? (
            <div className="hub-data-state">MEMUAT DAFTAR SOAL…</div>
          ) : questions.length === 0 ? (
            <div className="hub-data-state hub-question-empty-state">
              <div className="hub-question-empty-copy">
                <span>BELUM ADA SOAL DI BANK</span>
                <p>Bank soal masih kosong. Tambahkan soal manual atau mulai dari file CSV.</p>
              </div>
              <div className="hub-question-empty-actions">
                <button type="button" onClick={openCreateForm} className="hub-primary-action">
                  <Plus size={16} aria-hidden="true" /> Tambah soal pertama
                </button>
                <button type="button" onClick={() => setActiveTab("import")} className="hub-question-tool-button">
                  <FileSpreadsheet size={15} aria-hidden="true" /> Impor CSV
                </button>
              </div>
            </div>
          ) : filteredQuestions.length === 0 ? (
            <div className="hub-data-state hub-question-empty-state">
              <div className="hub-question-empty-copy">
                <span>TIDAK ADA SOAL YANG SESUAI</span>
                <p>Tidak ada soal yang cocok dengan filter atau kata kunci pencarian.</p>
              </div>
              <div className="hub-question-empty-actions">
                <button type="button" onClick={resetFilters} className="hub-question-tool-button">Reset filter</button>
              </div>
            </div>
          ) : (
            <div className="hub-question-list" style={{ display: "grid", gap: "0.75rem", padding: "0.75rem clamp(0.5rem, 3vw, 1rem)" }}>
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
                      overflowWrap: "anywhere",
                    }}
                  >
                    {/* Header */}
                    <div
                      className="hub-question-card-head"
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
                      <div className="hub-question-metadata">
                        <span className="hub-question-index">
                          #{String(index + 1).padStart(2, "0")}
                        </span>
                        <label className="hub-question-select">
                          <input type="checkbox" aria-label={"Pilih soal " + (index + 1)} checked={selectedQuestionIds.includes(q.id)} onChange={(event) => setSelectedQuestionIds((prev) => event.target.checked ? [...prev, q.id] : prev.filter((id) => id !== q.id))} /> Pilih
                        </label>
                        <span>{q.exam_type || "Tanpa exam type"} · {(q.question_type || "mcq").toUpperCase()}</span>
                        {q.subject && <span>{q.subject}</span>}
                        {(q.block || q.topic) && <span>{[q.block, q.topic].filter(Boolean).join(" / ")}</span>}
                        {q.image_path && <span className="hub-question-image-marker" aria-label="Memiliki gambar soal" title="Memiliki gambar soal"><ImageIcon size={13} aria-hidden="true" /></span>}
                      </div>

                      <div className="hub-question-card-actions">
                        <button
                          type="button"
                          onClick={() => toggleRevealAnswer(q.id)}
                          className="hub-question-icon-button"
                          aria-label={isRevealed ? "Sembunyikan kunci jawaban" : q.question_type === "essay" ? "Lihat reference answer" : "Lihat kunci jawaban"}
                          title={isRevealed ? "Sembunyikan jawaban" : "Tampilkan jawaban"}
                          style={{ color: isRevealed ? "#4ade80" : undefined }}
                        >
                          {isRevealed ? <EyeOff size={12} /> : <Eye size={12} />}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleBookmark(q)}
                          className="hub-question-icon-button"
                          aria-label={q.is_bookmarked ? "Hapus bookmark" : "Bookmark soal"}
                          title={q.is_bookmarked ? "Bookmarked" : "Bookmark"}
                          style={{ color: q.is_bookmarked ? "#fbbf24" : undefined }}
                        >
                          <Star size={15} fill={q.is_bookmarked ? "#fbbf24" : "none"} />
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditForm(q)}
                          aria-label="Edit question"
                          className="hub-question-icon-button"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(q)}
                          aria-label="Delete question"
                          className="hub-question-icon-button"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    {q.image_url && <button type="button" onClick={() => setImagePreview(q.image_url)} aria-label="Lihat gambar soal" style={{ padding: 0, border: 0, background: "transparent", width: "fit-content" }}><img src={q.image_url} alt="Gambar soal" style={{ display: "block", maxWidth: "min(100%, 32rem)", maxHeight: "18rem", objectFit: "contain", borderRadius: "6px" }} /></button>}
                    {/* Question Stem */}
                    <p style={{ margin: 0, fontSize: "0.9rem", lineHeight: 1.5, color: "var(--hub-text)", whiteSpace: "pre-wrap" }}>
                      {q.question_text}
                    </p>

                    {/* Options (A–E) */}
                    {(q.question_type || "mcq") === "mcq" && <div style={{ display: "grid", gap: "0.35rem" }}>
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
                              padding: "0.45rem 0.65rem",
                              borderRadius: "4px",
                              border: highlight ? "1px solid rgba(34, 197, 94, 0.4)" : "1px solid var(--hub-line)",
                              background: highlight ? "rgba(34, 197, 94, 0.08)" : "var(--hub-panel-raised)",
                              fontSize: "0.82rem",
                            }}
                          >
                            <strong style={{ fontFamily: "var(--font-geist-mono), monospace", fontSize: "0.75rem", color: highlight ? "#4ade80" : "var(--hub-muted)", minWidth: "1.2rem" }}>
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
                    </div>}
                    {isRevealed && q.question_type === "essay" && <div><strong>Reference answer</strong><p>{q.reference_answer}</p>{q.explanation && <p>{q.explanation}</p>}</div>}

                    {/* Explanation */}
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
        <div className="hub-mistakes-tab" style={{ padding: "0.75rem clamp(0.5rem, 3vw, 1.25rem)" }}>
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
                  startPractice(mistakes.map((m) => m.question), "mistakes");
                }}
                className="hub-primary-action"
                style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "0.4rem", minHeight: "44px", width: "100%", maxWidth: "18rem" }}
              >
                <Play size={13} fill="currentColor" /> REVIEW SOAL SALAH ({mistakes.length})
              </button>
            )}
          </div>

          {loadingMistakes ? (
            <div className="hub-data-state">MEMUAT CATATAN KESALAHAN…</div>
          ) : mistakes.length === 0 ? (
            <div className="hub-data-state hub-question-empty-state">
              <div className="hub-question-empty-copy">
                <span>REVIEW MISTAKES KOSONG</span>
                <p>Soal dengan jawaban terakhir yang salah akan muncul di sini. Riwayat percobaan tetap tersimpan.</p>
              </div>
              <div className="hub-question-empty-actions">
                <button type="button" onClick={() => setActiveTab("practice")} className="hub-primary-action">
                  <Play size={15} aria-hidden="true" /> Mulai latihan sekarang
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: "grid", gap: "0.75rem" }}>
              {mistakes.map(({ question: q, mistakeCount, lastAttempt, totalAttempts }) => (
                <article
                  key={q.id}
                  style={{
                    border: "1px solid rgba(239, 68, 68, 0.3)",
                    borderRadius: "8px",
                    background: "var(--hub-panel)",
                    padding: "1rem",
                    display: "grid",
                    gap: "0.6rem",
                    overflowWrap: "anywhere",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                      <span style={{ fontSize: "0.62rem", padding: "0.15rem 0.45rem", background: "rgba(239, 68, 68, 0.15)", color: "#f87171", borderRadius: "4px", fontFamily: "var(--font-geist-mono), monospace" }}>
                        PERLU DIKUASAI · {mistakeCount} GAGAL
                      </span>
                      {q.block && <span style={{ fontSize: "0.62rem", border: "1px solid var(--hub-line)", padding: "0.15rem 0.4rem", borderRadius: "4px", color: "var(--hub-muted)" }}>{q.block}</span>}
                      {q.topic && <span style={{ fontSize: "0.62rem", border: "1px solid var(--hub-line)", padding: "0.15rem 0.4rem", borderRadius: "4px", color: "var(--hub-muted)" }}>{q.topic}</span>}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        startPractice([q], "mistakes");
                      }}
                      className="hub-primary-action"
                      style={{ fontSize: "0.72rem", padding: "0.4rem 0.75rem", minHeight: "36px", display: "inline-flex", alignItems: "center", gap: "0.3rem" }}
                    >
                      <Play size={11} fill="currentColor" /> Latih Soal Ini
                    </button>
                  </div>

                  <p style={{ margin: "0.2rem 0", fontSize: "0.9rem", color: "var(--hub-text)", lineHeight: 1.5 }}>
                    {q.question_text}
                  </p>

                  <div style={{ padding: "0.6rem 0.8rem", background: "var(--hub-panel-raised)", borderRadius: "6px", fontSize: "0.8rem" }}>
                    {q.question_type === "essay" ? <p style={{ margin: "0 0 0.3rem", color: "var(--hub-text)" }}><b>Reference answer:</b> {lastAttempt?.reference_answer || q.reference_answer}</p> : <p style={{ margin: "0 0 0.3rem", color: "#4ade80" }}>Kunci Jawaban: <b>{lastAttempt?.correct_answer || q.correct_answer}. {lastAttempt?.correct_answer_text || q.options?.[lastAttempt?.correct_answer || q.correct_answer]}</b></p>}
                    {lastAttempt && (
                      <p style={{ margin: 0, color: "var(--hub-muted)", fontSize: "0.75rem" }}>
                        Jawaban terakhir Anda: <b>{lastAttempt.response_text || lastAttempt.selected_answer}</b> ({lastAttempt.is_correct === null ? (lastAttempt.self_assessed === false ? "Perlu ditinjau" : "Essay") : (lastAttempt.is_correct ? "Benar" : "Salah")})
                      </p>
                    )}
                    {lastAttempt && <p style={{ margin: "0.35rem 0 0", color: "var(--hub-muted)", fontSize: "0.72rem" }}>Attempt terakhir: {new Date(lastAttempt.created_at).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })} · {totalAttempts} attempt</p>}
                  </div>

                  {q.explanation && (
                    <div style={{ fontSize: "0.8rem", color: "var(--hub-muted)", lineHeight: 1.45 }}>
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
        <div className="hub-import-tab" style={{ padding: "0.75rem clamp(0.5rem, 3vw, 1.25rem)", maxWidth: "48rem", margin: "0 auto", display: "grid", gap: "1rem" }}>
          <div className="hub-import-card">
            <div className="hub-import-header">
              <div className="hub-import-intro">
                <span style={{ fontSize: "0.62rem", color: "var(--hub-muted)", fontFamily: "var(--font-geist-mono), monospace" }}>
                  BULK IMPORT / CSV
                </span>
                <h3 style={{ margin: "0.25rem 0", fontSize: "1.25rem", color: "var(--hub-text)" }}>
                  Impor Soal dari File CSV
                </h3>
                <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--hub-muted)", lineHeight: 1.4 }}>
                  Impor metadata ujian dengan soal MCQ atau Essay. Gunakan template untuk struktur kolom lengkap.
                </p>
              </div>

              <div className="hub-csv-template-actions" aria-label="Unduh template CSV">
                <button type="button" onClick={() => handleDownloadTemplate("mcq")} className="hub-csv-template-button">
                  <Download size={14} /> Template MCQ
                </button>
                <button type="button" onClick={() => handleDownloadTemplate("essay")} className="hub-csv-template-button">
                  <Download size={14} /> Template Essay
                </button>
              </div>
            </div>

            <div className="hub-csv-upload-area">
              <Upload size={19} aria-hidden="true" />
              <div className="hub-csv-upload-copy"><strong>Pilih file CSV</strong><span>Gunakan file .csv dengan header sesuai template.</span></div>
              <label className="hub-csv-file-label">
                <span>Pilih file</span>
                <input
                  type="file"
                  aria-label="Pilih file CSV"
                  accept=".csv,text/csv"
                  onChange={handleCsvFileChange}
                  className="hub-csv-file-input"
                />
              </label>
              {importFile && (
                <p style={{ margin: "0.5rem 0 0", fontSize: "0.8rem", color: "var(--hub-text)", wordBreak: "break-word" }}>
                  File terpilih: <b>{importFile.name}</b> ({(importFile.size / 1024).toFixed(1)} KB)
                </p>
              )}
            </div>

            <label className="hub-csv-file-label" style={{ width: "fit-content", maxWidth: "100%" }}>
              <span><FileJson size={14} /> Pulihkan backup JSON</span>
              <input type="file" aria-label="Pulihkan backup JSON" accept=".json,application/json" onChange={handleJsonBackupChange} className="hub-csv-file-input" />
            </label>
            <p style={{ margin: 0, color: "var(--hub-muted)", fontSize: "0.75rem", lineHeight: 1.45 }}>
              Backup JSON mencakup data soal dan metadata. Path gambar privat dipertahankan, tetapi file gambar tidak ikut diekspor.
            </p>

            {importMessage && (
              <p className={importMessage.includes("Gagal") ? "hub-data-error" : "hub-data-state"} style={{ marginTop: "1rem" }}>
                {importMessage}
              </p>
            )}

            {/* Validation & Preview Screen */}
            {importPreview && (
              <div className="hub-csv-preview">
                <div className="hub-csv-preview-summary" aria-live="polite">
                  <span style={{ fontSize: "0.75rem", color: "#4ade80", background: "rgba(34, 197, 94, 0.15)", padding: "0.35rem 0.65rem", borderRadius: "4px" }}>
                    ✓ {importPreview.valid.length} Baris Valid
                  </span>
                  <span style={{ fontSize: "0.75rem", color: importPreview.errors.length ? "#f87171" : "var(--hub-muted)", background: importPreview.errors.length ? "rgba(239, 68, 68, 0.15)" : "var(--hub-panel-raised)", padding: "0.35rem 0.65rem", borderRadius: "4px" }}>
                    {importPreview.errors.length ? `✗ ${importPreview.errors.length} Baris Tidak Valid` : "Tidak ada baris invalid"}
                  </span>
                </div>

                {/* Error details */}
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

                {importPreview.warnings?.length > 0 && <div role="status" style={{ marginBottom: "1rem", color: "var(--hub-muted)", fontSize: "0.78rem" }}>
                  <strong>{importPreview.warnings.length} baris mirip/duplikat</strong> — item yang sudah ada akan dilewati saat penyimpanan.
                  <ul style={{ margin: "0.3rem 0 0", paddingLeft: "1.2rem" }}>{importPreview.warnings.slice(0, 10).map((warning) => <li key={`duplicate-${warning.rowNumber}`}>{importPreview.source === "json" ? `Item ${warning.rowNumber}` : `Baris ${warning.rowNumber}`}: {warning.reason}</li>)}</ul>
                </div>}

                {/* Valid Preview Table (Responsive scroll) */}
                {importPreview.valid.length > 0 && (
                  <div>
                    <h4 style={{ margin: "0 0 0.5rem", fontSize: "0.85rem", color: "var(--hub-text)" }}>
                      Preview Soal yang Akan Diimpor (Contoh 3 Soal Pertama):
                    </h4>
                    <div style={{ display: "grid", gap: "0.5rem" }}>
                      {importPreview.valid.slice(0, 3).map((item, idx) => (
                        <div key={idx} style={{ padding: "0.6rem 0.8rem", background: "var(--hub-panel-raised)", borderRadius: "5px", fontSize: "0.8rem", overflowWrap: "anywhere" }}>
                          <p style={{ margin: "0 0 0.25rem", color: "var(--hub-text)", fontWeight: 500 }}>
                            {idx + 1}. {item.question_text}
                          </p>
                          <span style={{ color: "#4ade80", fontSize: "0.72rem", fontFamily: "var(--font-geist-mono), monospace" }}>
                            Kunci: {item.correct_answer} &nbsp;·&nbsp; Blok: {item.block || "—"} &nbsp;·&nbsp; Topik: {item.topic || "—"}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="hub-csv-preview-actions">
                      <button
                        type="button"
                        onClick={() => { setImportFile(null); setImportPreview(null); }}
                        style={{ padding: "0.6rem 1rem", minHeight: "44px", border: "1px solid var(--hub-line)", background: "transparent", color: "var(--hub-muted)", cursor: "pointer", borderRadius: "4px" }}
                      >
                        BATALKAN
                      </button>
                      <button
                        type="button"
                        onClick={importPreview.source === "json" ? handleExecuteJsonRestore : handleExecuteImport}
                        disabled={importing || restoringBackup}
                        className="hub-primary-action"
                        style={{ padding: "0.6rem 1.4rem", minHeight: "44px" }}
                      >
                        {importing || restoringBackup ? "MENYIMPAN…" : importPreview.source === "json" ? `PULIHKAN ${importPreview.valid.length} SOAL` : `IMPOR ${importPreview.valid.length} SOAL VALID`}
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
      {/* BULK DELETE BY TOPIC CONFIRMATION MODAL                               */}
      {/* ===================================================================== */}
      {topicDeleteOpen && (
        <div className="hub-crud-modal-backdrop" onMouseDown={() => !deletingTopic && setTopicDeleteOpen(false)}>
          <div
            className="hub-crud-form hub-crud-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Konfirmasi Hapus Soal di Topik"
            onMouseDown={(e) => e.stopPropagation()}
            style={{ maxWidth: "32rem", width: "95%", padding: "1.25rem" }}
          >
            <div className="hub-crud-form-head" style={{ marginBottom: "0.75rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "#f87171" }}>
                <AlertTriangle size={16} />
                <span style={{ fontWeight: 600, fontSize: "0.85rem" }}>KONFIRMASI HAPUS TOPIK</span>
              </div>
              <button
                type="button"
                onClick={() => setTopicDeleteOpen(false)}
                disabled={deletingTopic}
                aria-label="Tutup"
                style={{ background: "transparent", border: "none", color: "var(--hub-muted)", cursor: "pointer" }}
              >
                <X size={16} />
              </button>
            </div>

            {deleteTopicError && (
              <p className="hub-data-error" style={{ marginBottom: "0.75rem" }}>
                {deleteTopicError}
              </p>
            )}

            <div style={{ fontSize: "0.88rem", lineHeight: 1.5, color: "var(--hub-text)", marginBottom: "1.25rem" }}>
              <p style={{ margin: "0 0 0.5rem" }}>
                Apakah Anda yakin ingin menghapus semua <b>{matchingTopicQuestions.length} soal</b> pada topik:
              </p>
              <div style={{ padding: "0.6rem 0.8rem", background: "var(--hub-panel-raised)", borderRadius: "6px", border: "1px solid var(--hub-line)", marginBottom: "0.6rem" }}>
                <div style={{ fontSize: "0.75rem", color: "var(--hub-muted)" }}>TOPIK:</div>
                <strong style={{ fontSize: "0.95rem", color: "var(--hub-text)" }}>{topicFilter}</strong>
                {blockFilter && (
                  <div style={{ fontSize: "0.75rem", color: "var(--hub-muted)", marginTop: "0.25rem" }}>
                    Blok: <b>{blockFilter}</b>
                  </div>
                )}
              </div>
              <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--hub-muted)" }}>
                Soal-soal ini akan dipindahkan ke Trash dan tetap dapat dipulihkan dalam 30 hari.
              </p>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.6rem", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => setTopicDeleteOpen(false)}
                disabled={deletingTopic}
                style={{ padding: "0.6rem 1rem", minHeight: "44px", border: "1px solid var(--hub-line)", background: "transparent", color: "var(--hub-muted)", borderRadius: "4px", cursor: "pointer" }}
              >
                BATALKAN
              </button>
              <button
                type="button"
                onClick={handleExecuteDeleteTopic}
                disabled={deletingTopic || matchingTopicQuestions.length === 0}
                className="hub-danger-action"
                style={{ padding: "0.6rem 1.25rem", minHeight: "44px", display: "inline-flex", alignItems: "center", gap: "0.4rem" }}
              >
                <Trash2 size={13} />
                {deletingTopic ? "MENGHAPUS…" : `YA, HAPUS ${matchingTopicQuestions.length} SOAL`}
              </button>
            </div>
          </div>
        </div>
      )}

      {categoryManagerKind && <div className="hub-crud-modal-backdrop" onMouseDown={() => setCategoryManagerKind("")}>
        <section className="hub-crud-form hub-crud-modal" role="dialog" aria-modal="true" aria-label={`Kelola ${categoryManagerKind === "subject" ? "subjects" : categoryManagerKind === "block" ? "blok" : "exam types"}`} onMouseDown={(event) => event.stopPropagation()} style={{ maxWidth: "32rem", width: "95%", maxHeight: "min(80dvh, 36rem)", overflowY: "auto" }}>
          <div className="hub-crud-form-head"><span>{`KELOLA ${categoryManagerKind === "subject" ? "SUBJECT" : categoryManagerKind === "block" ? "BLOK" : "EXAM TYPE"}`}</span><button type="button" aria-label="Tutup" onClick={() => setCategoryManagerKind("")}><X /></button></div>
          <div style={{ display: "grid", gap: "0.5rem", padding: "1rem" }}>
            <p style={{ margin: 0, color: "var(--hub-muted)", fontSize: "0.8rem" }}>Ubah atau hapus kategori pribadi. Metadata pada soal yang sudah tersimpan tidak ikut dihapus.</p>
            {categoryRows.length === 0 && <p style={{ color: "var(--hub-muted)", fontSize: "0.8rem" }}>Belum ada kategori tambahan tersimpan.</p>}
            {categoryRows.map((row) => <div key={row.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem", padding: "0.55rem 0", borderBottom: "1px solid var(--hub-line)" }}>
              <span>{row.name}</span><div style={{ display: "flex", gap: "0.4rem" }}><button type="button" onClick={() => renameCategory(row)} aria-label={"Ubah " + row.name}><Pencil size={14} /></button><button type="button" onClick={() => deleteCategory(row)} aria-label={"Hapus " + row.name}><Trash2 size={14} /></button></div>
            </div>)}
            <button type="button" className="hub-primary-action" onClick={() => handleAddCategory(categoryManagerKind)}>{`+ TAMBAH ${categoryManagerKind === "subject" ? "SUBJECT" : categoryManagerKind === "block" ? "BLOK" : "EXAM TYPE"}`}</button>
          </div>
        </section>
      </div>}

      {/* ===================================================================== */}
      {/* QUESTION FORM MODAL (ADD / EDIT) (Mobile-Optimized)                   */}
      {/* ===================================================================== */}
      {formOpen && (
        <div className="hub-crud-modal-backdrop" onMouseDown={closeForm}>
          <form
            ref={questionFormRef}
            className={`hub-crud-form hub-crud-modal hub-question-form${editingId ? "" : " hub-question-form--create"}`}
            onSubmit={handleSave}
            role="dialog"
            aria-modal="true"
            aria-label={editingId ? "Edit Soal" : "Tambah Soal"}
            onMouseDown={(e) => e.stopPropagation()}
            style={{ maxWidth: "42rem", width: "95%", maxHeight: "min(90dvh, 52rem)", overflowY: "auto" }}
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

            {!editingId && questionDrafts.length > 0 && <section className="hub-question-draft-queue" aria-label="Soal yang siap disimpan">
              <div><strong>{questionDrafts.length} soal siap disimpan</strong><span>Soal berikutnya masih bisa ditambahkan sebelum disimpan.</span></div>
              <ol>{questionDrafts.map((draft, index) => <li key={`draft-${index}`}>
                <span><b>{String(index + 1).padStart(2, "0")}</b><span><strong>{draft.question_text.trim().slice(0, 84) || "Soal tanpa judul"}</strong><small>{draft.exam_type || "Tanpa exam type"} · {(draft.question_type || "mcq").toUpperCase()}</small></span></span>
                <button type="button" aria-label={`Hapus soal ke-${index + 1} dari antrean`} onClick={() => setQuestionDrafts((drafts) => drafts.filter((_, draftIndex) => draftIndex !== index))}><X size={14} /></button>
              </li>)}</ol>
            </section>}

            <div className="hub-form-grid" style={{ padding: "1rem" }}>
              <label>
                <span>EXAM TYPE</span>
                <select value={form.exam_type} onChange={(e) => setForm({ ...form, exam_type: e.target.value })} style={{ fontSize: "16px" }}>
                  <option value="">Tanpa exam type</option>
                  {form.exam_type && !examCategories.includes(form.exam_type) && <option value={form.exam_type}>Tersimpan · {form.exam_type}</option>}
                  {examCategories.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
                {!examCategories.length && <small style={{ color: "var(--hub-muted)" }}>Belum ada pilihan. Tambahkan melalui menu Aksi lainnya.</small>}
              </label>
              {/* Block & topic */}
              <label>
                <span>BLOK KEDOKTERAN *</span>
                <select required value={form.block} onChange={(e) => setForm({ ...form, block: e.target.value })} style={{ fontSize: "16px" }}>
                  <option value="">Pilih blok</option>
                  {form.block && !availableBlocks.includes(form.block) && <option value={form.block}>Tersimpan · {form.block}</option>}
                  {availableBlocks.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
                {!availableBlocks.length && <small style={{ color: "var(--hub-muted)" }}>Belum ada pilihan. Tambahkan melalui menu Aksi lainnya.</small>}
              </label>

              <label>
                <span>SUBJECT</span>
                <select value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} style={{ fontSize: "16px" }}>
                  <option value="">Tanpa subject</option>
                  {form.subject && !subjectCategories.includes(form.subject) && <option value={form.subject}>Tersimpan · {form.subject}</option>}
                  {subjectCategories.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
                {!subjectCategories.length && <small style={{ color: "var(--hub-muted)" }}>Belum ada pilihan. Tambahkan melalui menu Aksi lainnya.</small>}
              </label>

              <label>
                <span>TOPIK (OPSIONAL)</span>
                <input
                  type="text"
                  placeholder="Nama topic (opsional)"
                  value={form.topic}
                  onChange={(e) => setForm({ ...form, topic: e.target.value })}
                  style={{ fontSize: "16px" }}
                />
              </label>
              <label>
                <span>SUBTOPIK (OPSIONAL)</span>
                <input type="text" value={form.subtopic} onChange={(e) => setForm({ ...form, subtopic: e.target.value })} style={{ fontSize: "16px" }} />
              </label>
              <label>
                <span>QUESTION FORMAT *</span>
                <select value={form.question_type} onChange={(e) => setForm({ ...form, question_type: e.target.value })} style={{ fontSize: "16px" }}>
                  <option value="mcq">Multiple choice (MCQ)</option><option value="essay">Essay / short answer</option>
                </select>
              </label>
              <label className="hub-field-wide">
                <span>PERTANYAAN / KASUS KLINIS *</span>
                <textarea rows={3} required placeholder="Tuliskan teks pertanyaan atau skenario klinis..." value={form.question_text} onChange={(e) => setForm({ ...form, question_text: e.target.value })} style={{ fontSize: "16px" }} />
              </label>

              <label className="hub-field-wide">
                <span>GAMBAR SOAL (JPG, PNG, WEBP, GIF · MAKS 5 MB)</span>
                <input type="file" name="question_image" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (!/^image\/(jpeg|png|webp|gif)$/.test(file.type) || file.size > 5 * 1024 * 1024) { setFormError("Gambar harus JPG, PNG, WebP, atau GIF dengan ukuran maksimal 5 MB."); e.target.value = ""; return; }
                  setFormError("");
                  setForm({ ...form, image_file: file });
                  setImagePreview(URL.createObjectURL(file));
                }} style={{ fontSize: "16px" }} />
                {imagePreview && <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem", flexWrap: "wrap", marginTop: "0.5rem" }}>
                  <img src={imagePreview} alt="Preview gambar soal" style={{ maxWidth: "100%", maxHeight: "13rem", objectFit: "contain", borderRadius: "6px" }} />
                  <button type="button" onClick={async (e) => {
                    e.currentTarget.form.elements.namedItem("question_image").value = "";
                    setForm({ ...form, image_path: "", image_file: null }); setImagePreview("");
                  }} style={{ minHeight: "42px" }}>HAPUS GAMBAR</button>
                </div>}
              </label>

              {form.question_type === "essay" && <label className="hub-field-wide">
                <span>REFERENCE ANSWER *</span>
                <textarea rows={4} required value={form.reference_answer} onChange={(e) => setForm({ ...form, reference_answer: e.target.value })} placeholder="Jawaban rujukan untuk ditinjau setelah menjawab..." style={{ fontSize: "16px" }} />
              </label>}

              {/* 5 Options A-E and Correct Answer */}
              {form.question_type === "mcq" && <div
                className="hub-field-wide"
                style={{
                  display: "grid",
                  gap: "0.6rem",
                  marginTop: "0.5rem",
                  borderTop: "1px solid var(--hub-line)",
                  paddingTop: "0.75rem",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.25rem" }}>
                  <span style={{ fontSize: "0.62rem", color: "var(--hub-muted)", fontFamily: "var(--font-geist-mono), monospace" }}>
                    OPSI JAWABAN (A–E) & KUNCI JAWABAN *
                  </span>
                  <span style={{ fontSize: "0.62rem", color: "var(--hub-muted)" }}>
                    Pilih radio button di samping opsi yang benar.
                  </span>
                </div>

                {VALID_OPTIONS.map((opt) => (
                  <div key={opt} style={{ display: "flex", alignItems: "center", gap: "0.6rem", minHeight: "44px" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "0.35rem", cursor: "pointer", minWidth: "3.2rem" }}>
                      <input
                        type="radio"
                        name="correct_answer"
                        value={opt}
                        checked={form.correct_answer === opt}
                        onChange={() => setForm({ ...form, correct_answer: opt })}
                        style={{ width: "18px", height: "18px" }}
                      />
                      <strong style={{ fontFamily: "var(--font-geist-mono), monospace", fontSize: "0.85rem" }}>
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
                      style={{ flex: 1, fontSize: "16px", minHeight: "42px" }}
                    />
                  </div>
                ))}
              </div>}

              {/* Explanation */}
              <label className="hub-field-wide" style={{ marginTop: "0.5rem" }}>
                <span>PEMBAHASAN (OPSIONAL)</span>
                <textarea
                  rows={3}
                  placeholder="Penjelasan rasional klinis atau poin pembelajaran..."
                  value={form.explanation}
                  onChange={(e) => setForm({ ...form, explanation: e.target.value })}
                  style={{ fontSize: "16px" }}
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
                  style={{ fontSize: "16px" }}
                />
              </label>

              {/* Bookmark */}
              <label
                className="hub-field-wide"
                style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", minHeight: "44px" }}
              >
                <input
                  type="checkbox"
                  checked={form.is_bookmarked}
                  onChange={(e) => setForm({ ...form, is_bookmarked: e.target.checked })}
                  style={{ width: "18px", height: "18px" }}
                />
                <span style={{ fontSize: "0.82rem" }}>Tandai sebagai bookmark</span>
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
                flexWrap: "wrap",
              }}
            >
              <button type="button" onClick={closeForm} disabled={submitting} style={{ minHeight: "44px", padding: "0.5rem 1rem" }}>
                BATAL
              </button>
              {!editingId && <button type="button" onClick={queueCurrentQuestion} disabled={submitting} className="hub-question-tool-button" style={{ minHeight: "44px", padding: "0.5rem 1rem" }}>
                <Plus size={15} aria-hidden="true" /> TAMBAH SOAL
              </button>}
              <button type="submit" disabled={submitting} className="hub-primary-action" style={{ minHeight: "44px", padding: "0.5rem 1.4rem" }}>
                {submitting ? "MENYIMPAN…" : editingId ? "UPDATE SOAL" : questionDrafts.length ? `SIMPAN SEMUA (${questionDrafts.length + 1})` : "SIMPAN SOAL"}
              </button>
            </div>
          </form>
        </div>
      )}
      {imagePreview && !formOpen && <div className="academic-practice__image-overlay" role="dialog" aria-modal="true" aria-label="Gambar soal" onClick={() => setImagePreview("")}>
        <button type="button" onClick={() => setImagePreview("")} aria-label="Tutup gambar">×</button>
        <img src={imagePreview} alt="Gambar soal ukuran penuh" />
      </div>}
    </section>
  );
}
