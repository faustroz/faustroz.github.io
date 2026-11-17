"use client";

import { useCallback, useMemo, useState } from "react";
import { generateEcg, makeRng } from "@/lib/hub/ecg-rhythms.mjs";
import { analyzeEcg, ECG_REFERENCE } from "@/lib/hub/ecg-analysis.mjs";
import { casesByDifficulty, DIFFICULTY_LABELS, ECG_CASES, getCaseById } from "@/lib/hub/ecg-cases.mjs";
import { buildSystematicSteps } from "@/lib/hub/ecg-steps.mjs";
import { playQuizSound, signalAnswer } from "@/lib/hub/quiz-feedback.mjs";
import EcgCanvas from "@/components/hub/EcgCanvas";

const SETTINGS = { paperSpeed: 25, gain: 10, zoom: 1 };
const DURATION_SEC = 10;

function pickCase(difficulty, seed) {
  const list = casesByDifficulty(difficulty);
  const pool = list.length ? list : ECG_CASES;
  return pool[Math.floor(makeRng(seed * 31 + 5)() * pool.length)];
}

function diagnosisOptions(caseDef, seed) {
  const list = [caseDef.id, ...caseDef.distractors];
  const rng = makeRng(seed * 17 + 3);
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list.map((id) => getCaseById(id)).filter(Boolean).map((entry) => ({ id: entry.id, label: entry.diagnosis }));
}

export default function EcgSystematicQuiz() {
  const [difficulty, setDifficulty] = useState("all");
  const [seed, setSeed] = useState(1);
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState({});
  const [picked, setPicked] = useState(null);
  const [feedback, setFeedback] = useState("");
  const [visible, setVisible] = useState(DURATION_SEC);
  const [panSec, setPanSec] = useState(0);

  const caseDef = useMemo(() => pickCase(difficulty, seed), [difficulty, seed]);
  const gen = useMemo(() => generateEcg(caseDef.params, DURATION_SEC, 11), [caseDef]);
  const steps = useMemo(() => [
    ...buildSystematicSteps(gen, caseDef),
    { id: "dx", title: "DIAGNOSIS", prompt: "Put the findings together. What is the diagnosis?", hint: "Your findings above narrow the list: rate, rhythm, P waves, intervals, axis, ST–T.", options: diagnosisOptions(caseDef, seed), correct: caseDef.id, explain: caseDef.teaching },
  ], [gen, caseDef, seed]);

  const finished = index >= steps.length;
  const step = finished ? null : steps[index];
  const answered = picked !== null;
  const maxPan = Math.max(0, DURATION_SEC - visible);
  const panClamped = useCallback((value) => Math.min(Math.max(0, value), maxPan), [maxPan]);

  const restart = useCallback((nextDifficulty) => {
    setDifficulty(nextDifficulty);
    setSeed((value) => value + 1);
    setIndex(0);
    setResults({});
    setPicked(null);
    setFeedback("");
    setPanSec(0);
  }, []);

  const answer = (optionId) => {
    if (answered || !step) return;
    const isCorrect = optionId === step.correct;
    setPicked(optionId);
    setResults((current) => ({ ...current, [step.id]: isCorrect }));
    setFeedback(signalAnswer(isCorrect));
  };

  const next = () => {
    playQuizSound("next");
    setIndex((value) => value + 1);
    setPicked(null);
    setFeedback("");
  };

  const readingSteps = steps.slice(0, -1);
  const correctCount = readingSteps.filter((entry) => results[entry.id]).length;
  const dxDone = finished && "dx" in results;

  return (
    <div className="hub-ecg-systematic">
      <div className="hub-ecg-dash">
        <section className="hub-ecg-sheet" aria-label="Systematic reading tracing">
          <div className="hub-ecg-sheet-head">
            <span className="hub-ecg-tag">READ IT STEP BY STEP · {DIFFICULTY_LABELS[caseDef.difficulty].toUpperCase()}</span>
            <span className="hub-ecg-tag">SYNTHETIC EDUCATIONAL ECG</span>
          </div>
          <EcgCanvas gen={gen} settings={SETTINGS} panSec={panSec} cursorSec={null} onPanDrag={(value) => setPanSec(panClamped(value))} onLayout={(layout) => setVisible(layout.totalSeconds)} />
        </section>

        <section className="hub-ecg-side" aria-label="Reading steps">
          <ol className="hub-ecg-steps" aria-label="Progress">
            {steps.map((entry, position) => (
              <li key={entry.id} className={["hub-ecg-step-chip", position === index && !finished ? "is-current" : "", entry.id in results ? (results[entry.id] ? "is-right" : "is-wrong") : ""].join(" ").trim()}>
                {entry.title}{entry.id in results ? (results[entry.id] ? " ✓" : " ✗") : ""}
              </li>
            ))}
          </ol>

          {step && (
            <div className="hub-ecg-step" role="group" aria-label={`Step ${index + 1}: ${step.title}`}>
              <span className="hub-ecg-tag">STEP {index + 1} OF {steps.length} · {step.title}</span>
              <p className="hub-ecg-teaching"><strong>{step.prompt}</strong></p>
              <p className="hub-ecg-analysis-note">{step.hint}</p>
              <div className="hub-ecg-step-options">
                {step.options.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    className={"hub-pocus-preset"
                      + (answered && option.id === step.correct ? " is-active" : "")
                      + (answered && option.id === picked && option.id !== step.correct ? " is-wrong" : "")
                      + (answered && option.id === picked ? ` ${feedback}` : "")}
                    disabled={answered}
                    onClick={() => answer(option.id)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              {answered && (
                <>
                  <span key={`${seed}-${step.id}`} className={`hub-ecg-tag hub-ecg-verdict ${feedback}`} role="status">{picked === step.correct ? "CORRECT" : "INCORRECT"}</span>
                  <p className="hub-ecg-teaching">{step.explain}</p>
                  <button type="button" className="hub-pocus-preset" onClick={next}>{index === steps.length - 1 ? "SEE SUMMARY →" : "CONTINUE →"}</button>
                </>
              )}
            </div>
          )}

          {finished && (
            <div className="hub-ecg-step" aria-label="Summary">
              <span className="hub-ecg-tag">SUMMARY · {caseDef.diagnosis.toUpperCase()}</span>
              <p className="hub-ecg-teaching">
                Findings right: <strong>{correctCount}/{readingSteps.length}</strong>. Diagnosis: <strong>{dxDone && results.dx ? "correct" : "missed"}</strong>.
                {correctCount < readingSteps.length ? " Redo the steps you missed before trusting a pattern match." : " A systematic read gets you the diagnosis without guessing."}
              </p>
              <div className="hub-ecg-analysis">
                {analyzeEcg(gen, caseDef).fields.map((field) => (
                  <div key={field.key} className={"hub-ecg-analysis-row" + (field.abnormal ? " is-abnormal" : "")}>
                    <span className="hub-ecg-analysis-label">{field.label}</span>
                    <span className="hub-ecg-analysis-value">{field.value}</span>
                    <span className="hub-ecg-analysis-ref">{field.abnormal ? `ref ${field.ref}` : ""}</span>
                  </div>
                ))}
                <p className="hub-ecg-analysis-note">Reference: HR {ECG_REFERENCE.rate[2]} · PR {ECG_REFERENCE.pr[2]} · QRS {ECG_REFERENCE.qrs[2]}</p>
              </div>
            </div>
          )}
        </section>
      </div>

      <section className="hub-ecg-quizbar" aria-label="Systematic reading controls">
        <div className="hub-pocus-presets" role="group" aria-label="Case difficulty">
          {["all", 1, 2, 3].map((level) => (
            <button key={String(level)} type="button" className="hub-pocus-preset" aria-pressed={difficulty === level} onClick={() => restart(level)}>{level === "all" ? "ALL" : DIFFICULTY_LABELS[level].toUpperCase()}</button>
          ))}
        </div>
        <button type="button" className="hub-pocus-preset" onClick={() => restart(difficulty)}>{finished ? "NEXT CASE →" : "SKIP CASE"}</button>
      </section>
    </div>
  );
}
