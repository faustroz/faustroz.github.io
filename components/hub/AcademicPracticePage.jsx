"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, ChevronDown, CircleAlert, RotateCcw, ZoomIn } from "lucide-react";
import { requireSupabase } from "@/lib/supabase/client";
import { createPracticeRun, getPracticeRunStorage, migratePracticeRun, writePracticeRun } from "@/lib/hub/academic-practice.mjs";
import { createQuestionRepository, VALID_OPTIONS } from "@/lib/hub/question-bank.mjs";
import { buildSessionSnapshot } from "@/lib/hub/academic-performance.mjs";

const percent = (part, total) => total ? Math.round((part / total) * 100) : 0;
const isEssay = (question) => question?.question_type === "essay";
const essayReviewRatings = [["again", "Again"], ["hard", "Hard"], ["good", "Good"], ["easy", "Easy"]];

export default function AcademicPracticePage() {
  const router = useRouter();
  const [run, setRun] = useState(null);
  const [ready, setReady] = useState(false);
  const [savingAttempt, setSavingAttempt] = useState(false);
  const [attemptMessage, setAttemptMessage] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [zoomImage, setZoomImage] = useState(false);
  const [savingEssayRating, setSavingEssayRating] = useState(false);
  const submitLock = useRef(false);
  const essayRatingLock = useRef(false);
  const questionStartedAt = useRef(Date.now());
  const finishLock = useRef(false);

  useEffect(() => { setRun(migratePracticeRun(window)); setReady(true); }, []);
  // Every state change is written straight back, so closing the tab mid-question
  // loses nothing: the run is picked up again from localStorage on return.
  useEffect(() => { if (ready && run) writePracticeRun(getPracticeRunStorage(window), run); }, [ready, run]);
  const question = useMemo(() => run?.questions?.[run.index] || null, [run]);
  const essay = isEssay(question);
  const isCorrect = Boolean(run?.submitted && question && !essay && run.selectedAnswer === question.shuffledCorrectAnswer);
  const response = run?.responses?.[run.index];

  useEffect(() => {
    let active = true;
    setImageUrl("");
    if (question?.image_path) {
      requireSupabase().storage.from("academic-question-images").createSignedUrl(question.image_path, 3600)
        .then(({ data, error }) => { if (active && !error) setImageUrl(data?.signedUrl || ""); })
        .catch(() => { if (active) setImageUrl(""); });
    }
    return () => { active = false; };
  }, [question?.id, question?.image_path]);

  useEffect(() => { questionStartedAt.current = Date.now(); }, [question?.id]);

  const submitAnswer = useCallback(async () => {
    if (!run || !question || run.submitted || submitLock.current) return;
    if (essay ? !run.essayAnswer.trim() : !run.selectedAnswer) return;
    submitLock.current = true;
    const correct = !essay && run.selectedAnswer === question.shuffledCorrectAnswer;
    const timeSpentSeconds = Math.max(0, Math.round((Date.now() - questionStartedAt.current) / 1000));
    const nextResponses = [...run.responses];
    nextResponses[run.index] = { ...nextResponses[run.index], selectedAnswer: run.selectedAnswer, essayAnswer: run.essayAnswer, submitted: true, isCorrect: essay ? null : correct, selfAssessed: null, timeSpentSeconds };
    const nextRun = {
      ...run, submitted: true, lastAnswerCorrect: essay ? null : correct, responses: nextResponses,
      stats: { ...run.stats, correct: run.stats.correct + (correct ? 1 : 0), wrong: run.stats.wrong + (!essay && !correct ? 1 : 0), essaysToReview: run.stats.essaysToReview + (essay ? 1 : 0), incorrectQuestions: correct || essay ? run.stats.incorrectQuestions : [...run.stats.incorrectQuestions, question] },
    };
    setRun(nextRun); setAttemptMessage(""); setSavingAttempt(true);
    try {
      const repository = createQuestionRepository(requireSupabase());
      if (essay) {
        const attempt = await repository.recordEssayAttempt({ question_id: question.id, exam_session_id: run.sessionId || null, response_text: run.essayAnswer, reference_answer: question.reference_answer, time_spent_seconds: timeSpentSeconds });
        nextResponses[run.index] = { ...nextResponses[run.index], attemptId: attempt.id };
        setRun({ ...nextRun, responses: nextResponses });
      }
      else {
        const attempt = await repository.recordAttempt({ question_id: question.id, exam_session_id: run.sessionId || null, selected_answer: run.selectedAnswer, correct_answer: question.shuffledCorrectAnswer, correct_answer_text: question.shuffledOptions?.[question.shuffledCorrectAnswer], is_correct: correct, time_spent_seconds: timeSpentSeconds });
        nextResponses[run.index] = { ...nextResponses[run.index], attemptId: attempt.id };
        setRun({ ...nextRun, responses: nextResponses });
      }
      setAttemptMessage("Jawaban tersimpan");
    } catch (error) {
      console.error("Failed to record academic practice attempt:", error);
      setAttemptMessage("Jawaban tampil, tetapi attempt belum tersimpan.");
    } finally { setSavingAttempt(false); }
  }, [essay, question, run]);

  const rateEssay = useCallback(async (rating) => {
    const attemptId = response?.attemptId;
    if (!attemptId || response?.reviewRating || savingEssayRating || essayRatingLock.current) return;
    essayRatingLock.current = true;
    setSavingEssayRating(true);
    setAttemptMessage("");
    try {
      await createQuestionRepository(requireSupabase()).rateEssayAttemptReview(attemptId, rating);
      setRun((current) => current ? ({
        ...current,
        responses: current.responses.map((item) => item.attemptId === attemptId ? { ...item, reviewRating: rating, selfAssessed: rating === "again" ? false : true } : item),
      }) : current);
      setAttemptMessage(`Rating ${rating.toUpperCase()} tersimpan`);
    } catch (saveError) {
      setAttemptMessage(saveError?.message || "Rating spaced repetition gagal disimpan.");
    } finally {
      essayRatingLock.current = false;
      setSavingEssayRating(false);
    }
  }, [response?.attemptId, response?.reviewRating, savingEssayRating]);

  const persistCompletion = useCallback(async (finishedRun) => {
    if (!finishedRun?.sessionId || finishLock.current) return finishedRun;
    finishLock.current = true;
    const graded = finishedRun.stats.correct + finishedRun.stats.wrong;
    try {
      await createQuestionRepository(requireSupabase()).completeSession(finishedRun.sessionId, {
        score: finishedRun.stats.correct,
        accuracy_percent: graded ? percent(finishedRun.stats.correct, graded) : null,
        time_taken_seconds: Math.max(0, Math.round((Date.now() - new Date(finishedRun.startedAt || Date.now()).getTime()) / 1000)),
        answers: buildSessionSnapshot(finishedRun),
      });
      return { ...finishedRun, historySaved: true, historyError: "" };
    } catch (error) {
      return { ...finishedRun, historySaved: false, historyError: error?.message || "Riwayat sesi belum tersimpan." };
    } finally { finishLock.current = false; }
  }, []);

  const finishRun = useCallback(async (unfinishedRun) => {
    const completed = await persistCompletion({ ...unfinishedRun, finished: true });
    setRun(completed);
    if (completed.historyError) setAttemptMessage("Hasil tersedia, tetapi riwayat sesi belum tersimpan.");
  }, [persistCompletion]);

  const nextQuestion = () => {
    if (!run?.submitted) return;
    submitLock.current = false; setAttemptMessage("");
    if (run.index + 1 >= run.questions.length) { void finishRun(run); return; }
    const nextIndex = run.index + 1;
    const nextResponse = run.responses[nextIndex] || { selectedAnswer: "", essayAnswer: "", submitted: false, isCorrect: null, selfAssessed: null };
    setRun({ ...run, index: nextIndex, selectedAnswer: nextResponse.selectedAnswer || "", essayAnswer: nextResponse.essayAnswer || "", submitted: nextResponse.submitted || false, lastAnswerCorrect: nextResponse.isCorrect });
  };

  const skipQuestion = () => {
    if (!run || run.submitted) return;
    submitLock.current = false;
    setAttemptMessage("");
    if (run.index + 1 >= run.questions.length) { void finishRun(run); return; }
    const nextIndex = run.index + 1;
    const nextResponse = run.responses[nextIndex] || { selectedAnswer: "", essayAnswer: "", submitted: false, isCorrect: null, selfAssessed: null };
    setRun({ ...run, index: nextIndex, selectedAnswer: nextResponse.selectedAnswer || "", essayAnswer: nextResponse.essayAnswer || "", submitted: nextResponse.submitted || false, lastAnswerCorrect: nextResponse.isCorrect });
  };

  const startNewRun = async (questions) => {
    const startedAt = new Date().toISOString();
    const nextRun = createPracticeRun(questions, { examType: run?.examType, block: run?.block, subject: run?.subject, topic: run?.topic, questionType: run?.questionType, reviewKind: run?.reviewKind, startedAt });
    if (!nextRun) return;
    try {
      const saved = await createQuestionRepository(requireSupabase()).createSession({
        title: nextRun.reviewKind === "mistakes" ? "Review Mistakes" : "Practice Session",
        session_kind: nextRun.reviewKind || "practice", total_questions: questions.length, duration_minutes: null,
        filters: { examType: nextRun.examType, block: nextRun.block, subject: nextRun.subject, topic: nextRun.topic, questionType: nextRun.questionType },
        question_ids: questions.map((item) => item.id), answers: {}, status: "in_progress", started_at: startedAt,
      });
      nextRun.sessionId = saved.id;
      submitLock.current = false; finishLock.current = false; setAttemptMessage(""); setRun(nextRun);
    } catch (error) { setAttemptMessage(error?.message || "Sesi baru gagal dicatat."); }
  };

  const updateAnswer = (key, value) => {
    if (!run || run.submitted) return;
    const responses = [...run.responses];
    responses[run.index] = { ...responses[run.index], [key]: value };
    setRun({ ...run, [key]: value, responses });
  };

  if (!ready) return <main className="academic-practice"><div className="academic-practice__loading" aria-label="Memuat sesi latihan" /></main>;
  if (!run || !question) return <main className="academic-practice academic-practice--missing"><div className="academic-practice__missing-content">
    <p className="academic-practice__eyebrow">ACADEMIC / QUESTION BANK</p><h1>Sesi latihan tidak ditemukan.</h1>
    <p>Tidak ada sesi tersimpan di perangkat ini. Mulai latihan baru dari Question Bank.</p>
    <Link className="academic-practice__button academic-practice__button--primary" href="/academic"><ArrowLeft size={16} /> Kembali ke Question Bank</Link>
  </div></main>;

  const exitButton = <div className="academic-practice__topbar-start"><button className="academic-practice__icon-button" onClick={() => router.back()} aria-label="Keluar ke Question Bank"><ArrowLeft size={18} /></button><span className="academic-practice__topbar-label" aria-hidden="true">Question Bank</span></div>;

  if (run.finished) {
    const answeredMcq = run.stats.correct + run.stats.wrong;
    const unanswered = run.responses.filter((item) => !item.submitted).length;
    const accuracy = answeredMcq ? percent(run.stats.correct, answeredMcq) : 0;
    return <main className="academic-practice academic-practice--result">
      <header className="academic-practice__topbar">{exitButton}<div className="academic-practice__topbar-center"><p className="academic-practice__eyebrow">PRACTICE MODE</p><span className="academic-practice__topbar-title">Hasil sesi</span></div><span className="academic-practice__topbar-spacer" /></header>
      <section className="academic-practice__result-content">
        <p className="academic-practice__eyebrow">SESI SELESAI</p>
        <p className="academic-practice__result-summary">{run.questions.length} soal dalam sesi</p>
        <h1>{answeredMcq ? accuracy : "—"}{answeredMcq > 0 && <small>%</small>}</h1>
        <p className="academic-practice__result-caption">{answeredMcq ? `Akurasi dari ${answeredMcq} MCQ yang dijawab.` : "Belum ada MCQ yang dijawab."}</p>
        {answeredMcq > 0 && <div className="academic-practice__result-bar" role="progressbar" aria-valuenow={accuracy} aria-valuemin="0" aria-valuemax="100"><span style={{ width: accuracy + "%" }} /></div>}
        <p className="academic-practice__result-stats">
          <span className="is-correct"><strong>{run.stats.correct}</strong> MCQ benar</span>
          <span className="is-wrong"><strong>{run.stats.wrong}</strong> salah</span>
          <span><strong>{unanswered}</strong> belum dijawab</span>
          <span><strong>{run.stats.essaysToReview}</strong> essay untuk ditinjau sendiri</span>
        </p>
        {run.historyError && <div className="academic-practice__feedback is-wrong" role="alert"><p>Riwayat sesi belum tersimpan.</p><button type="button" className="academic-practice__text-button" onClick={async () => setRun(await persistCompletion(run))}>Coba simpan riwayat lagi</button></div>}
        {run.historySaved && <p className="academic-practice__save-state is-saved" role="status">Riwayat sesi tersimpan</p>}
        <div className="academic-practice__result-actions">
          {run.stats.incorrectQuestions.length > 0 && <button className="academic-practice__button academic-practice__button--primary" onClick={() => startNewRun(run.stats.incorrectQuestions)}><RotateCcw size={16} /> Ulangi soal salah <span>{run.stats.incorrectQuestions.length}</span></button>}
          <button className="academic-practice__button" onClick={() => startNewRun(run.questions)}><RotateCcw size={16} /> Latihan lagi</button>
          <button className="academic-practice__text-button" onClick={() => router.back()}><ArrowLeft size={15} /> Kembali ke Question Bank</button>
        </div>
        <details className="academic-practice__review">
          <summary>Review {run.questions.length} soal <ChevronDown size={18} aria-hidden="true" /></summary>
          <div>{run.questions.map((item, index) => {
            const itemResponse = run.responses[index];
            const itemIsEssay = isEssay(item);
            const state = !itemResponse?.submitted ? "is-pending" : itemIsEssay ? "is-essay" : itemResponse.isCorrect ? "is-correct" : "is-wrong";
            return <article key={item.id} className={state}>
              <p><strong>{String(index + 1).padStart(2, "0")} · {item.exam_type || "MCQ"} · {itemIsEssay ? "ESSAY" : "MCQ"}</strong></p>
              <p>{item.question_text}</p>
              {itemIsEssay ? <><p><small>Jawaban Anda:</small><br />{itemResponse?.essayAnswer || "Belum dijawab"}</p><p><small>Reference answer:</small><br />{item.reference_answer}</p></> : <p className="academic-practice__review-verdict">{itemResponse?.submitted ? (itemResponse.isCorrect ? "Benar" : "Salah") + " · Jawaban Anda: " + (itemResponse.selectedAnswer || "—") + " · Kunci: " + item.shuffledCorrectAnswer : "Belum dijawab"}</p>}
            </article>;
          })}</div>
        </details>
      </section>
    </main>;
  }

  const progress = Math.round(((run.index + (run.submitted ? 1 : 0)) / run.questions.length) * 100);
  const metadata = [question.exam_type, question.block || run.block, question.subject, question.topic || run.topic, question.subtopic].filter(Boolean);
  const saveState = savingAttempt ? "Menyimpan jawaban…" : attemptMessage;

  return <main className="academic-practice">
    <header className="academic-practice__topbar">{exitButton}<div className="academic-practice__topbar-center"><p className="academic-practice__eyebrow">{run.reviewKind === "mistakes" ? "REVIEW MISTAKES" : run.reviewKind === "due" ? "ESSAY SPACED REVIEW" : "PRACTICE MODE"}</p><span className="academic-practice__topbar-title">{String(run.index + 1).padStart(2, "0")} <i>/</i> {String(run.questions.length).padStart(2, "0")}</span></div><div className="academic-practice__score"><span className="is-correct">{run.stats.correct} benar</span><span className="is-wrong">{run.stats.wrong} salah</span></div></header>
    <div className="academic-practice__progress" role="progressbar" aria-valuenow={progress} aria-valuemin="0" aria-valuemax="100"><span style={{ width: progress + "%" }} /></div>
    <section className="academic-practice__content" key={question.id}>
      <div className="academic-practice__metadata">{metadata.map((item) => <span key={item}>{item}</span>)}<span>{essay ? "ESSAY" : "MCQ"}</span></div>
      <h1 className="academic-practice__question">{question.question_text}</h1>
      {/* eslint-disable-next-line @next/next/no-img-element -- Supabase signed URLs are private and created client-side per session. */}
      {imageUrl && <button className="academic-practice__image-button" type="button" onClick={() => setZoomImage(true)} aria-label="Perbesar gambar soal"><img className="academic-practice__question-image" src={imageUrl} alt="Gambar soal" /><span className="academic-practice__image-hint" aria-hidden="true"><ZoomIn size={14} /> Perbesar</span></button>}
      {essay ? <div className="academic-practice__essay">
        {!run.submitted && <><label htmlFor="practice-essay-answer">Jawaban Anda</label>
        <textarea id="practice-essay-answer" rows={8} value={run.essayAnswer} onChange={(event) => updateAnswer("essayAnswer", event.target.value)} placeholder="Tuliskan jawaban singkat atau uraian..." /></>}
        {run.submitted && <div className="academic-practice__feedback academic-practice__feedback--essay"><p className="academic-practice__feedback-title">Essay dikirim · tinjau jawaban dan referensi</p>
          <div className="academic-practice__essay-compare"><div><span>Jawaban Anda</span><p>{response?.essayAnswer}</p></div><div className="is-reference"><span>Reference answer</span><p>{question.reference_answer}</p></div></div>
          {question.explanation && <div className="academic-practice__explanation-block"><span>Pembahasan</span><p className="academic-practice__explanation">{question.explanation}</p></div>}
          <div className="academic-practice__essay-review"><div className="academic-practice__essay-review-head"><span>Seberapa baik Anda mengingat jawaban?</span>{savingEssayRating && <small role="status">Menyimpan rating…</small>}{response?.reviewRating && <small>Rating tersimpan: {response.reviewRating.toUpperCase()}</small>}</div><div role="group" aria-label="Rating spaced repetition essay">{essayReviewRatings.map(([value, label]) => <button type="button" key={value} aria-pressed={response?.reviewRating === value} className={response?.reviewRating === value ? "is-selected" : ""} disabled={!response?.attemptId || savingAttempt || savingEssayRating || Boolean(response?.reviewRating)} onClick={() => rateEssay(value)}>{label}</button>)}</div></div>
        </div>}
      </div> : <div className={"academic-practice__options" + (run.submitted ? " is-submitted" : "")} role="radiogroup" aria-label="Pilihan jawaban">
        {VALID_OPTIONS.map((option) => {
          const selected = run.selectedAnswer === option;
          const correctOption = option === question.shuffledCorrectAnswer;
          const wrongSelected = run.submitted && selected && !correctOption;
          const classes = ["academic-practice__option"];
          if (selected && !run.submitted) classes.push("is-selected");
          if (run.submitted && correctOption) classes.push("is-correct");
          if (wrongSelected) classes.push("is-wrong");
          return <button key={option} type="button" role="radio" aria-checked={selected} disabled={run.submitted} className={classes.join(" ")} onClick={() => updateAnswer("selectedAnswer", option)}><span className="academic-practice__option-letter">{option}</span><span className="academic-practice__option-text">{question.shuffledOptions[option]}</span>{run.submitted && correctOption && <span className="academic-practice__option-tag"><Check size={17} aria-label="Jawaban benar" /><span aria-hidden="true">Kunci</span></span>}{wrongSelected && <span className="academic-practice__option-tag"><CircleAlert size={17} aria-label="Jawaban Anda salah" /><span aria-hidden="true">Jawaban Anda</span></span>}</button>;
        })}
        {run.submitted && <div className={"academic-practice__feedback " + (isCorrect ? "is-correct" : "is-wrong")}><p className="academic-practice__feedback-title">{isCorrect ? "Jawaban benar" : "Belum tepat"}</p>{!isCorrect && <p className="academic-practice__feedback-answer"><span>Jawaban yang benar:</span> <strong>{question.shuffledCorrectAnswer}. {question.shuffledOptions[question.shuffledCorrectAnswer]}</strong></p>}{question.explanation && <div className="academic-practice__explanation-block"><span>Pembahasan</span><p className="academic-practice__explanation">{question.explanation}</p></div>}</div>}
      </div>}
    </section>
    <footer className="academic-practice__actionbar"><div className="academic-practice__actions">{!run.submitted ? <><button className="academic-practice__text-button" onClick={skipQuestion}>Lewati soal</button><button className="academic-practice__button academic-practice__button--primary" disabled={savingAttempt || (essay ? !run.essayAnswer.trim() : !run.selectedAnswer)} onClick={submitAnswer}>{essay ? "Kirim jawaban" : "Periksa jawaban"} <ArrowRight size={16} /></button></> : <><small className="academic-practice__save-state" aria-live="polite">{saveState}</small><button className="academic-practice__button academic-practice__button--primary" disabled={savingAttempt || savingEssayRating} onClick={nextQuestion}>NEXT QUESTION <ArrowRight size={16} /></button></>}</div></footer>
    {zoomImage && imageUrl && <div className="academic-practice__image-overlay" role="dialog" aria-modal="true" aria-label="Gambar soal" onClick={() => setZoomImage(false)}>
      <button type="button" onClick={() => setZoomImage(false)} aria-label="Tutup gambar">×</button>
      {/* eslint-disable-next-line @next/next/no-img-element -- private question image is served from a user-scoped signed URL. */}
      <img src={imageUrl} alt="Gambar soal ukuran penuh" />
    </div>}
  </main>;
}
