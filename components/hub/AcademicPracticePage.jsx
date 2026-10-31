"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, CircleAlert, RotateCcw } from "lucide-react";
import { requireSupabase } from "@/lib/supabase/client";
import { createPracticeRun, readPracticeRun, writePracticeRun } from "@/lib/hub/academic-practice.mjs";
import { createQuestionRepository, VALID_OPTIONS } from "@/lib/hub/question-bank.mjs";
import { buildSessionSnapshot } from "@/lib/hub/academic-performance.mjs";

const percent = (part, total) => total ? Math.round((part / total) * 100) : 0;
const isEssay = (question) => question?.question_type === "essay";

export default function AcademicPracticePage() {
  const router = useRouter();
  const [run, setRun] = useState(null);
  const [ready, setReady] = useState(false);
  const [savingAttempt, setSavingAttempt] = useState(false);
  const [attemptMessage, setAttemptMessage] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [zoomImage, setZoomImage] = useState(false);
  const [essayAssessment, setEssayAssessment] = useState("");
  const [essayAttemptId, setEssayAttemptId] = useState("");
  const submitLock = useRef(false);
  const questionStartedAt = useRef(Date.now());
  const finishLock = useRef(false);

  useEffect(() => { setRun(readPracticeRun(window.sessionStorage)); setReady(true); }, []);
  useEffect(() => { if (ready && run) writePracticeRun(window.sessionStorage, run); }, [ready, run]);
  const question = useMemo(() => run?.questions?.[run.index] || null, [run]);
  const essay = isEssay(question);
  const isCorrect = Boolean(run?.submitted && question && !essay && run.selectedAnswer === question.shuffledCorrectAnswer);
  const response = run?.responses?.[run.index];

  useEffect(() => {
    setEssayAttemptId(response?.attemptId || "");
    setEssayAssessment(response?.selfAssessed === true ? "yes" : response?.selfAssessed === false ? "no" : "");
  }, [run?.index, response?.attemptId, response?.selfAssessed]);

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
    nextResponses[run.index] = { ...nextResponses[run.index], selectedAnswer: run.selectedAnswer, essayAnswer: run.essayAnswer, submitted: true, isCorrect: essay ? null : correct, selfAssessed: essay ? (essayAssessment === "" ? null : essayAssessment === "yes") : null, timeSpentSeconds };
    const nextRun = {
      ...run, submitted: true, lastAnswerCorrect: essay ? null : correct, responses: nextResponses,
      stats: { ...run.stats, correct: run.stats.correct + (correct ? 1 : 0), wrong: run.stats.wrong + (!essay && !correct ? 1 : 0), essaysToReview: run.stats.essaysToReview + (essay ? 1 : 0), incorrectQuestions: correct || essay ? run.stats.incorrectQuestions : [...run.stats.incorrectQuestions, question] },
    };
    setRun(nextRun); setAttemptMessage(""); setSavingAttempt(true);
    try {
      const repository = createQuestionRepository(requireSupabase());
      if (essay) {
        const attempt = await repository.recordEssayAttempt({ question_id: question.id, exam_session_id: run.sessionId || null, response_text: run.essayAnswer, reference_answer: question.reference_answer, time_spent_seconds: timeSpentSeconds });
        setEssayAttemptId(attempt.id);
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
  }, [essay, essayAssessment, question, run]);

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
    submitLock.current = false; setAttemptMessage(""); setEssayAssessment("");
    setEssayAttemptId("");
    if (run.index + 1 >= run.questions.length) { void finishRun(run); return; }
    const nextIndex = run.index + 1;
    const nextResponse = run.responses[nextIndex] || { selectedAnswer: "", essayAnswer: "", submitted: false, isCorrect: null, selfAssessed: null };
    setRun({ ...run, index: nextIndex, selectedAnswer: nextResponse.selectedAnswer || "", essayAnswer: nextResponse.essayAnswer || "", submitted: nextResponse.submitted || false, lastAnswerCorrect: nextResponse.isCorrect });
  };

  const skipQuestion = () => {
    if (!run || run.submitted) return;
    submitLock.current = false;
    setAttemptMessage("");
    setEssayAssessment("");
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
    <p>Sesi tersimpan sementara di tab browser ini. Mulai latihan baru dari Question Bank.</p>
    <Link className="academic-practice__button academic-practice__button--primary" href="/academic">Kembali ke Question Bank</Link>
  </div></main>;

  if (run.finished) {
    const answeredMcq = run.stats.correct + run.stats.wrong;
    const unanswered = run.responses.filter((item) => !item.submitted).length;
    return <main className="academic-practice academic-practice--result">
      <header className="academic-practice__topbar"><button className="academic-practice__icon-button" onClick={() => router.back()} aria-label="Keluar ke Question Bank"><ArrowLeft size={18} /></button><div><p className="academic-practice__eyebrow">PRACTICE MODE</p><span className="academic-practice__topbar-title">Hasil sesi</span></div><span className="academic-practice__topbar-spacer" /></header>
      <section className="academic-practice__result-content">
        <p className="academic-practice__eyebrow">SESI SELESAI</p>
        <p className="academic-practice__result-summary">{run.questions.length} soal dalam sesi</p>
        <h1>{answeredMcq ? percent(run.stats.correct, answeredMcq) : "—"}{answeredMcq > 0 && <small>%</small>}</h1>
        <p className="academic-practice__result-summary">{run.stats.correct} MCQ benar <span>·</span> {run.stats.wrong} salah <span>·</span> {unanswered} belum dijawab</p>
        <p className="academic-practice__result-summary">{run.stats.essaysToReview} essay untuk ditinjau sendiri</p>
        {run.historyError && <div className="academic-practice__feedback is-wrong" role="alert"><p>Riwayat sesi belum tersimpan.</p><button type="button" className="academic-practice__text-button" onClick={async () => setRun(await persistCompletion(run))}>Coba simpan riwayat lagi</button></div>}
        {run.historySaved && <p className="academic-practice__save-state" role="status">Riwayat sesi tersimpan</p>}
        {answeredMcq > 0 && <div className="academic-practice__result-bar" role="progressbar" aria-valuenow={percent(run.stats.correct, answeredMcq)} aria-valuemin="0" aria-valuemax="100"><span style={{ width: percent(run.stats.correct, answeredMcq) + "%" }} /></div>}
        <details className="academic-practice__review">
          <summary>Review {run.questions.length} soal</summary>
          <div>{run.questions.map((item, index) => {
            const itemResponse = run.responses[index];
            const itemIsEssay = isEssay(item);
            return <article key={item.id}>
              <p><strong>{String(index + 1).padStart(2, "0")} · {item.exam_type || "MCQ"} · {itemIsEssay ? "ESSAY" : "MCQ"}</strong></p>
              <p>{item.question_text}</p>
              {itemIsEssay ? <><p><small>Jawaban Anda:</small><br />{itemResponse?.essayAnswer || "Belum dijawab"}</p><p><small>Reference answer:</small><br />{item.reference_answer}</p></> : <p>{itemResponse?.submitted ? (itemResponse.isCorrect ? "Benar" : "Salah") + " · Jawaban Anda: " + (itemResponse.selectedAnswer || "—") + " · Kunci: " + item.shuffledCorrectAnswer : "Belum dijawab"}</p>}
            </article>;
          })}</div>
        </details>
        <div className="academic-practice__result-actions">
          {run.stats.incorrectQuestions.length > 0 && <button className="academic-practice__button academic-practice__button--primary" onClick={() => startNewRun(run.stats.incorrectQuestions)}><RotateCcw size={16} /> Ulangi soal salah <span>{run.stats.incorrectQuestions.length}</span></button>}
          <button className="academic-practice__button" onClick={() => startNewRun(run.questions)}><RotateCcw size={16} /> Latihan lagi</button>
          <button className="academic-practice__text-button" onClick={() => router.back()}><ArrowLeft size={15} /> Kembali ke Question Bank</button>
        </div>
      </section>
    </main>;
  }

  const progress = Math.round(((run.index + (run.submitted ? 1 : 0)) / run.questions.length) * 100);
  const metadata = [question.exam_type, question.block || run.block, question.subject, question.topic || run.topic, question.subtopic].filter(Boolean);

  return <main className="academic-practice">
    <header className="academic-practice__topbar"><button className="academic-practice__icon-button" onClick={() => router.back()} aria-label="Keluar ke Question Bank"><ArrowLeft size={18} /></button><div><p className="academic-practice__eyebrow">{run.reviewKind === "mistakes" ? "REVIEW MISTAKES" : "PRACTICE MODE"}</p><span className="academic-practice__topbar-title">{String(run.index + 1).padStart(2, "0")} <i>/</i> {String(run.questions.length).padStart(2, "0")}</span></div><div className="academic-practice__score"><span className="is-correct">{run.stats.correct} benar</span><span className="is-wrong">{run.stats.wrong} salah</span></div></header>
    <div className="academic-practice__progress" role="progressbar" aria-valuenow={progress} aria-valuemin="0" aria-valuemax="100"><span style={{ width: progress + "%" }} /></div>
    <section className="academic-practice__content" key={question.id}>
      <div className="academic-practice__metadata">{metadata.map((item) => <span key={item}>{item}</span>)}<span>{essay ? "ESSAY" : "MCQ"}</span></div>
      <h1 className="academic-practice__question">{question.question_text}</h1>
      {/* eslint-disable-next-line @next/next/no-img-element -- Supabase signed URLs are private and created client-side per session. */}
      {imageUrl && <button className="academic-practice__image-button" type="button" onClick={() => setZoomImage(true)} aria-label="Perbesar gambar soal"><img className="academic-practice__question-image" src={imageUrl} alt="Gambar soal" /></button>}
      {essay ? <div className="academic-practice__essay">
        <label htmlFor="practice-essay-answer">Jawaban Anda</label>
        <textarea id="practice-essay-answer" rows={8} value={run.essayAnswer} disabled={run.submitted} onChange={(event) => updateAnswer("essayAnswer", event.target.value)} placeholder="Tuliskan jawaban singkat atau uraian..." />
        {run.submitted && <div className="academic-practice__feedback"><p className="academic-practice__feedback-title">Essay dikirim · tinjau mandiri</p><p><strong>Jawaban Anda</strong><br />{response?.essayAnswer}</p><p><strong>Reference answer</strong><br />{question.reference_answer}</p>{question.explanation && <p className="academic-practice__explanation">{question.explanation}</p>}
          <label className="academic-practice__self-assess">Self-assessment<select aria-label="Self-assessment essay" value={essayAssessment} disabled={!essayAttemptId || savingAttempt} onChange={async (event) => {
            const value = event.target.value;
            setEssayAssessment(value);
            if (!essayAttemptId || value === "") return;
            try {
              await createQuestionRepository(requireSupabase()).updateEssaySelfAssessment(essayAttemptId, value === "yes");
              const responses = [...run.responses]; responses[run.index] = { ...responses[run.index], selfAssessed: value === "yes" };
              setRun({ ...run, responses }); setAttemptMessage("Self-assessment tersimpan");
            } catch { setAttemptMessage("Self-assessment gagal disimpan."); }
          }}><option value="">Pilih setelah review</option><option value="yes">Sudah memahami</option><option value="no">Perlu ditinjau lagi</option></select></label>
          {attemptMessage && <span className="academic-practice__save-state" aria-live="polite">{savingAttempt ? "Menyimpan jawaban…" : attemptMessage}</span>}</div>}
      </div> : <div className="academic-practice__options" role="radiogroup" aria-label="Pilihan jawaban">
        {VALID_OPTIONS.map((option) => {
          const selected = run.selectedAnswer === option;
          const correctOption = option === question.shuffledCorrectAnswer;
          const wrongSelected = run.submitted && selected && !correctOption;
          const classes = ["academic-practice__option"];
          if (selected && !run.submitted) classes.push("is-selected");
          if (run.submitted && correctOption) classes.push("is-correct");
          if (wrongSelected) classes.push("is-wrong");
          return <button key={option} type="button" role="radio" aria-checked={selected} disabled={run.submitted} className={classes.join(" ")} onClick={() => updateAnswer("selectedAnswer", option)}><span className="academic-practice__option-letter">{option}</span><span className="academic-practice__option-text">{question.shuffledOptions[option]}</span>{run.submitted && correctOption && <Check size={17} aria-label="Jawaban benar" />}{wrongSelected && <CircleAlert size={17} aria-label="Jawaban Anda salah" />}</button>;
        })}
        {run.submitted && <div className={"academic-practice__feedback " + (isCorrect ? "is-correct" : "is-wrong")}><p className="academic-practice__feedback-title">{isCorrect ? "Jawaban benar" : "Belum tepat"}</p>{!isCorrect && <p><span>Jawaban yang benar:</span> <strong>{question.shuffledCorrectAnswer}. {question.shuffledOptions[question.shuffledCorrectAnswer]}</strong></p>}{question.explanation && <p className="academic-practice__explanation">{question.explanation}</p>}</div>}
      </div>}
      <div className="academic-practice__actions">{!run.submitted ? <><button className="academic-practice__text-button" onClick={skipQuestion}>Lewati soal</button><button className="academic-practice__button academic-practice__button--primary" disabled={savingAttempt || (essay ? !run.essayAnswer.trim() : !run.selectedAnswer)} onClick={submitAnswer}>{essay ? "Kirim jawaban" : "Periksa jawaban"} <ArrowRight size={16} /></button></> : <button className="academic-practice__button academic-practice__button--primary" disabled={savingAttempt} onClick={nextQuestion}>NEXT QUESTION <ArrowRight size={16} /></button>}</div>
    </section>
    {zoomImage && imageUrl && <div className="academic-practice__image-overlay" role="dialog" aria-modal="true" aria-label="Gambar soal" onClick={() => setZoomImage(false)}>
      <button type="button" onClick={() => setZoomImage(false)} aria-label="Tutup gambar">×</button>
      {/* eslint-disable-next-line @next/next/no-img-element -- private question image is served from a user-scoped signed URL. */}
      <img src={imageUrl} alt="Gambar soal ukuran penuh" />
    </div>}
  </main>;
}
