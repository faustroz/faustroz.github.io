"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, CircleAlert, RotateCcw } from "lucide-react";
import { requireSupabase } from "@/lib/supabase/client";
import {
  createPracticeRun,
  readPracticeRun,
  writePracticeRun,
} from "@/lib/hub/academic-practice.mjs";
import { createQuestionRepository, VALID_OPTIONS } from "@/lib/hub/question-bank.mjs";

const percent = (part, total) => total ? Math.round((part / total) * 100) : 0;

export default function AcademicPracticePage() {
  const router = useRouter();
  const [run, setRun] = useState(null);
  const [ready, setReady] = useState(false);
  const [savingAttempt, setSavingAttempt] = useState(false);
  const [attemptMessage, setAttemptMessage] = useState("");
  const submitLock = useRef(false);

  useEffect(() => {
    setRun(readPracticeRun(window.sessionStorage));
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready && run) writePracticeRun(window.sessionStorage, run);
  }, [ready, run]);

  const question = useMemo(() => run?.questions?.[run.index] || null, [run]);
  const isCorrect = Boolean(run?.submitted && question && run.selectedAnswer === question.shuffledCorrectAnswer);

  const submitAnswer = useCallback(async () => {
    if (!run || !question || !run.selectedAnswer || run.submitted || submitLock.current) return;
    submitLock.current = true;
    const correct = run.selectedAnswer === question.shuffledCorrectAnswer;
    const nextRun = {
      ...run,
      submitted: true,
      lastAnswerCorrect: correct,
      stats: {
        correct: run.stats.correct + (correct ? 1 : 0),
        wrong: run.stats.wrong + (correct ? 0 : 1),
        incorrectQuestions: correct ? run.stats.incorrectQuestions : [...run.stats.incorrectQuestions, question],
      },
    };
    setRun(nextRun);
    setAttemptMessage("");
    setSavingAttempt(true);
    try {
      const repository = createQuestionRepository(requireSupabase());
      await repository.recordAttempt({
        question_id: question.id,
        selected_answer: run.selectedAnswer,
        is_correct: correct,
        time_spent_seconds: 0,
      });
      setAttemptMessage("Jawaban tersimpan");
    } catch (error) {
      console.error("Failed to record academic practice attempt:", error);
      setAttemptMessage("Jawaban tampil, tetapi attempt belum tersimpan.");
    } finally {
      setSavingAttempt(false);
    }
  }, [question, run]);

  const nextQuestion = () => {
    if (!run?.submitted) return;
    submitLock.current = false;
    setAttemptMessage("");
    if (run.index + 1 >= run.questions.length) {
      setRun({ ...run, finished: true });
      return;
    }
    setRun({ ...run, index: run.index + 1, selectedAnswer: "", submitted: false, lastAnswerCorrect: null });
  };

  const startNewRun = (questions) => {
    const nextRun = createPracticeRun(questions, { block: run?.block, topic: run?.topic });
    if (!nextRun) return;
    submitLock.current = false;
    setAttemptMessage("");
    setRun(nextRun);
  };

  if (!ready) return <main className="academic-practice"><div className="academic-practice__loading" aria-label="Memuat sesi latihan" /></main>;

  if (!run || !question) {
    return (
      <main className="academic-practice academic-practice--missing">
        <div className="academic-practice__missing-content">
          <p className="academic-practice__eyebrow">ACADEMIC / QUESTION BANK</p>
          <h1>Sesi latihan tidak ditemukan.</h1>
          <p>Sesi tersimpan sementara di tab browser ini. Mulai latihan baru dari Question Bank.</p>
          <Link className="academic-practice__button academic-practice__button--primary" href="/academic">Kembali ke Question Bank</Link>
        </div>
      </main>
    );
  }

  if (run.finished) {
    const total = run.stats.correct + run.stats.wrong;
    return (
      <main className="academic-practice academic-practice--result">
        <header className="academic-practice__topbar">
          <button className="academic-practice__icon-button" onClick={() => router.back()} aria-label="Keluar ke Question Bank"><ArrowLeft size={18} /></button>
          <div><p className="academic-practice__eyebrow">PRACTICE MODE</p><span className="academic-practice__topbar-title">Hasil sesi</span></div>
          <span className="academic-practice__topbar-spacer" />
        </header>
        <section className="academic-practice__result-content">
          <p className="academic-practice__eyebrow">SESI SELESAI</p>
          <h1>{percent(run.stats.correct, total)}<small>%</small></h1>
          <p className="academic-practice__result-summary">{run.stats.correct} benar <span>·</span> {run.stats.wrong} salah <span>·</span> {total} soal</p>
          <div className="academic-practice__result-bar" role="progressbar" aria-valuenow={percent(run.stats.correct, total)} aria-valuemin="0" aria-valuemax="100"><span style={{ width: `${percent(run.stats.correct, total)}%` }} /></div>
          <div className="academic-practice__result-actions">
            {run.stats.incorrectQuestions.length > 0 && <button className="academic-practice__button academic-practice__button--primary" onClick={() => startNewRun(run.stats.incorrectQuestions)}><RotateCcw size={16} /> Ulangi soal salah <span>{run.stats.incorrectQuestions.length}</span></button>}
            <button className="academic-practice__button" onClick={() => startNewRun(run.questions)}><RotateCcw size={16} /> Latihan lagi</button>
            <button className="academic-practice__text-button" onClick={() => router.back()}><ArrowLeft size={15} /> Kembali ke Question Bank</button>
          </div>
        </section>
      </main>
    );
  }

  const progress = Math.round(((run.index + (run.submitted ? 1 : 0)) / run.questions.length) * 100);
  const block = question.block || run.block;
  const topic = question.topic || run.topic;

  return (
    <main className="academic-practice">
      <header className="academic-practice__topbar">
        <button className="academic-practice__icon-button" onClick={() => router.back()} aria-label="Keluar ke Question Bank"><ArrowLeft size={18} /></button>
        <div><p className="academic-practice__eyebrow">PRACTICE MODE</p><span className="academic-practice__topbar-title">{String(run.index + 1).padStart(2, "0")} <i>/</i> {String(run.questions.length).padStart(2, "0")}</span></div>
        <div className="academic-practice__score"><span className="is-correct">{run.stats.correct} benar</span><span className="is-wrong">{run.stats.wrong} salah</span></div>
      </header>
      <div className="academic-practice__progress" role="progressbar" aria-valuenow={progress} aria-valuemin="0" aria-valuemax="100"><span style={{ width: `${progress}%` }} /></div>

      <section className="academic-practice__content" key={question.id}>
        <div className="academic-practice__metadata">
          {block && <span>{block}</span>}{topic && <span>{topic}</span>}
        </div>
        <h1 className="academic-practice__question">{question.question_text}</h1>
        {/* eslint-disable-next-line @next/next/no-img-element -- Preserve exact owner-managed question asset URLs without server optimization. */}
        {question.image_path && <img className="academic-practice__question-image" src={question.image_path} alt="Ilustrasi soal" />}

        <div className="academic-practice__options" role="radiogroup" aria-label="Pilihan jawaban">
          {VALID_OPTIONS.map((option) => {
            const selected = run.selectedAnswer === option;
            const correctOption = option === question.shuffledCorrectAnswer;
            const wrongSelected = run.submitted && selected && !correctOption;
            const classes = ["academic-practice__option"];
            if (selected && !run.submitted) classes.push("is-selected");
            if (run.submitted && correctOption) classes.push("is-correct");
            if (wrongSelected) classes.push("is-wrong");
            return (
              <button key={option} type="button" role="radio" aria-checked={selected} disabled={run.submitted} className={classes.join(" ")} onClick={() => setRun({ ...run, selectedAnswer: option })}>
                <span className="academic-practice__option-letter">{option}</span><span className="academic-practice__option-text">{question.shuffledOptions[option]}</span>
                {run.submitted && correctOption && <Check size={17} aria-label="Jawaban benar" />}
                {wrongSelected && <CircleAlert size={17} aria-label="Jawaban Anda salah" />}
              </button>
            );
          })}
        </div>

        {run.submitted && <div className={`academic-practice__feedback ${isCorrect ? "is-correct" : "is-wrong"}`}>
          <p className="academic-practice__feedback-title">{isCorrect ? "Jawaban benar" : "Belum tepat"}</p>
          {!isCorrect && <p>Jawaban yang benar: <strong>{question.shuffledCorrectAnswer}. {question.shuffledOptions[question.shuffledCorrectAnswer]}</strong></p>}
          {question.explanation && <p className="academic-practice__explanation">{question.explanation}</p>}
          {attemptMessage && <span className="academic-practice__save-state" aria-live="polite">{savingAttempt ? "Menyimpan attempt…" : attemptMessage}</span>}
        </div>}

        <div className="academic-practice__actions">
          {!run.submitted ? <button className="academic-practice__button academic-practice__button--primary" disabled={!run.selectedAnswer || savingAttempt} onClick={submitAnswer}>Periksa jawaban <ArrowRight size={16} /></button> : <button className="academic-practice__button academic-practice__button--primary" onClick={nextQuestion}>NEXT QUESTION <ArrowRight size={16} /></button>}
        </div>
      </section>
    </main>
  );
}
