"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { generateEcg, makeRng } from "@/lib/hub/ecg-rhythms.mjs";
import { analyzeEcg, ECG_REFERENCE } from "@/lib/hub/ecg-analysis.mjs";
import { ECG_CASES, ECG_CATEGORIES, DIFFICULTY_LABELS, getCaseById, casesByDifficulty } from "@/lib/hub/ecg-cases.mjs";
import { computeSheetLayout, drawEcgSheet } from "@/lib/hub/ecg-paper.mjs";

const DURATION_SEC = 10;
const MISTAKES_KEY = "hub-ecg-mistakes";

function loadMistakes() {
  if (typeof window === "undefined" || !window.localStorage) return {};
  try {
    const raw = window.localStorage.getItem(MISTAKES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveMistakes(mistakes) {
  if (typeof window === "undefined" || !window.localStorage) return;
  try { window.localStorage.setItem(MISTAKES_KEY, JSON.stringify(mistakes)); } catch { /* ignore */ }
}

function shuffledOptions(caseDef, seed) {
  const ids = [caseDef.id, ...caseDef.distractors];
  const rng = makeRng(seed);
  const list = [...ids];
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list.map((id) => getCaseById(id)).filter(Boolean);
}

function EcgCanvas({ gen, settings, panSec, cursorSec, onPanDrag, onLayout }) {
  const canvasRef = useRef(null);
  const dragRef = useRef(null);
  const stateRef = useRef({ gen, settings, panSec, cursorSec, onPanDrag });
  stateRef.current = { gen, settings, panSec, cursorSec, onPanDrag };

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const { width, height } = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
    }
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    const layout = computeSheetLayout({ width, height, paperSpeed: settings.paperSpeed, gain: settings.gain, zoom: settings.zoom });
    if (onLayout) onLayout(layout);
    drawEcgSheet(context, { gen, layout, panSec, cursorSec });
  }, [gen, settings, panSec, cursorSec, onLayout]);

  useEffect(() => { render(); }, [render]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || typeof window.ResizeObserver !== "function") return undefined;
    const observer = new ResizeObserver(() => render());
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [render]);

  const onPointerDown = useCallback((event) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { x: event.clientX, pan: stateRef.current.panSec };
  }, []);

  const onPointerMove = useCallback((event) => {
    if (!dragRef.current) return;
    const canvas = event.currentTarget;
    const layout = computeSheetLayout({ width: canvas.clientWidth, height: canvas.clientHeight, paperSpeed: stateRef.current.settings.paperSpeed, gain: stateRef.current.settings.gain, zoom: stateRef.current.settings.zoom });
    const dx = event.clientX - dragRef.current.x;
    stateRef.current.onPanDrag(dragRef.current.pan - dx / layout.pxPerSec);
  }, []);

  const stopDrag = useCallback(() => { dragRef.current = null; }, []);

  return <canvas ref={canvasRef} className="hub-ecg-canvas" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={stopDrag} onPointerCancel={stopDrag} role="img" aria-label="Synthetic 12-lead ECG printout" />;
}

function AnalysisPanel({ analysis }) {
  return (
    <div className="hub-ecg-analysis">
      {analysis.fields.map((field) => (
        <div key={field.key} className={"hub-ecg-analysis-row" + (field.abnormal ? " is-abnormal" : "")}>
          <span className="hub-ecg-analysis-label">{field.label}</span>
          <span className="hub-ecg-analysis-value">{field.value}</span>
          <span className="hub-ecg-analysis-ref">{field.abnormal ? `ref ${field.ref}` : ""}</span>
        </div>
      ))}
      <p className="hub-ecg-analysis-note">Reference: HR {ECG_REFERENCE.rate[2]} · PR {ECG_REFERENCE.pr[2]} · QRS {ECG_REFERENCE.qrs[2]} · QTc {ECG_REFERENCE.qtc[2]} · axis {ECG_REFERENCE.axis[2]}</p>
    </div>
  );
}

function CasePicker({ activeId, onSelect }) {
  return (
    <div className="hub-ecg-cases" role="group" aria-label="ECG case library">
      {ECG_CATEGORIES.map((category) => (
        <div key={category} className="hub-ecg-case-group">
          <span className="hub-pocus-label">{category.toUpperCase()}</span>
          <div className="hub-ecg-case-list">
            {ECG_CASES.filter((entry) => entry.category === category).map((entry) => (
              <button key={entry.id} type="button" className={"hub-pocus-preset" + (activeId === entry.id ? " is-active" : "")} aria-pressed={activeId === entry.id} onClick={() => onSelect(entry.id)}>
                {entry.diagnosis} <em>{DIFFICULTY_LABELS[entry.difficulty]}</em>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function EcgLab() {
  const [mode, setMode] = useState("learn");
  const [caseId, setCaseId] = useState("nsr");
  const [paperSpeed, setPaperSpeed] = useState(25);
  const [gain, setGain] = useState(10);
  const [zoom, setZoom] = useState(1);
  const [panSec, setPanSec] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [difficulty, setDifficulty] = useState("all");
  const [quizSeed, setQuizSeed] = useState(1);
  const [quizPick, setQuizPick] = useState(null);
  const [mistakes, setMistakes] = useState({});
  const [visibleSeconds, setVisibleSeconds] = useState(10);

  useEffect(() => { setMistakes(loadMistakes()); }, []);

  const activeCase = getCaseById(caseId);
  const gen = useMemo(() => (activeCase ? generateEcg(activeCase.params, DURATION_SEC, 7) : null), [activeCase]);
  const analysis = useMemo(() => (gen && activeCase ? analyzeEcg(gen, activeCase) : null), [gen, activeCase]);

  const quizCase = useMemo(() => casesByDifficulty(difficulty)[quizSeed % Math.max(1, casesByDifficulty(difficulty).length)] || ECG_CASES[0], [difficulty, quizSeed]);
  const quizGen = useMemo(() => generateEcg(quizCase.params, DURATION_SEC, 11), [quizCase]);
  const quizOptions = useMemo(() => shuffledOptions(quizCase, quizSeed * 31 + 7), [quizCase, quizSeed]);

  const maxPan = Math.max(0, DURATION_SEC - visibleSeconds);

  const panClamped = useCallback((value) => Math.min(Math.max(0, value), maxPan), [maxPan]);

  const [cursorSec, setCursorSec] = useState(null);

  useEffect(() => {
    if (!playing) {
      setCursorSec(null);
      return undefined;
    }
    let acc = 0;
    let last = performance.now();
    const id = setInterval(() => {
      const now = performance.now();
      acc = (acc + (now - last) / 1000) % DURATION_SEC;
      last = now;
      setCursorSec(acc);
    }, 90);
    return () => clearInterval(id);
  }, [playing]);

  const togglePlay = useCallback(() => setPlaying((value) => !value), []);

  const selectCase = useCallback((id) => {
    setCaseId(id);
    setPanSec(0);
    setPlaying(false);
  }, []);

  const startQuiz = useCallback((diff) => {
    setDifficulty(diff);
    setQuizSeed((value) => value + 1);
    setQuizPick(null);
    setMode("quiz");
  }, []);

  const answerQuiz = useCallback((pickedId) => {
    if (quizPick) return;
    setQuizPick(pickedId);
    if (pickedId !== quizCase.id) {
      setMistakes((current) => {
        const next = { ...current, [quizCase.id]: (current[quizCase.id] || 0) + 1 };
        saveMistakes(next);
        return next;
      });
    }
  }, [quizCase, quizPick]);

  const nextQuiz = useCallback(() => {
    setQuizSeed((value) => value + 1);
    setQuizPick(null);
  }, []);

  const clearMistakes = useCallback(() => {
    setMistakes({});
    saveMistakes({});
  }, []);

  const mistakeCases = Object.entries(mistakes).sort((a, b) => b[1] - a[1]);
  const quizAnswered = quizPick !== null;

  return (
    <div className="hub-ecg-lab">
      <div className="hub-ecg-toolbar">
        <div className="hub-pocus-presets" role="group" aria-label="Lab modes">
          <button type="button" className="hub-pocus-preset" aria-pressed={mode === "learn"} onClick={() => setMode("learn")}>LEARN</button>
          <button type="button" className="hub-pocus-preset" aria-pressed={mode === "quiz"} onClick={() => startQuiz(difficulty)}>QUIZ</button>
          <button type="button" className="hub-pocus-preset" aria-pressed={mode === "review"} onClick={() => setMode("review")}>REVIEW {mistakeCases.length ? `(${mistakeCases.length})` : ""}</button>
        </div>
        <div className="hub-pocus-presets" role="group" aria-label="Viewer controls">
          <button type="button" className="hub-pocus-preset" aria-pressed={playing} onClick={togglePlay}>{playing ? "PAUSE" : "PLAY"}</button>
          {[25, 50].map((speed) => (
            <button key={speed} type="button" className="hub-pocus-preset" aria-pressed={paperSpeed === speed} onClick={() => setPaperSpeed(speed)}>{speed} MM/S</button>
          ))}
          {[5, 10, 20].map((value) => (
            <button key={value} type="button" className="hub-pocus-preset" aria-pressed={gain === value} onClick={() => setGain(value)}>{value} MM/MV</button>
          ))}
          <button type="button" className="hub-pocus-preset" onClick={() => setZoom((value) => Math.max(1, Math.round((value - 0.5) * 2) / 2))}>−</button>
          <span className="hub-ecg-zoom">{zoom.toFixed(1)}×</span>
          <button type="button" className="hub-pocus-preset" onClick={() => setZoom((value) => Math.min(3, value + 0.5))}>+</button>
        </div>
      </div>

      {mode === "learn" && (
        <>
          <div className="hub-ecg-dash">
            <section className="hub-ecg-sheet" aria-label="12-lead ECG paper">
              <div className="hub-ecg-sheet-head">
                <span className="hub-ecg-tag">12-LEAD · SYNTHETIC EDUCATIONAL ECG</span>
                <span className="hub-ecg-tag">{activeCase ? activeCase.diagnosis.toUpperCase() : ""}</span>
              </div>
              {gen && <EcgCanvas gen={gen} settings={{ paperSpeed, gain, zoom }} panSec={panSec} cursorSec={cursorSec} onPanDrag={(value) => setPanSec(panClamped(value))} onLayout={(layout) => setVisibleSeconds(layout.totalSeconds)} />}
              <label className="hub-ecg-pan">
                <span>PAN {(panSec).toFixed(1)}S</span>
                <input type="range" min="0" max={maxPan.toFixed(1)} step="0.1" value={panSec} onChange={(event) => setPanSec(Number(event.target.value))} aria-label="Pan through the recording" />
              </label>
            </section>
            <section className="hub-ecg-side" aria-label="ECG analysis">
              <span className="hub-ecg-tag">MEASUREMENTS</span>
              {analysis && <AnalysisPanel analysis={analysis} />}
              {activeCase && <p className="hub-ecg-teaching">{activeCase.teaching}</p>}
            </section>
          </div>
          <CasePicker activeId={caseId} onSelect={selectCase} />
        </>
      )}

      {mode === "quiz" && (
        <>
          <div className="hub-ecg-dash">
            <section className="hub-ecg-sheet" aria-label="Quiz tracing">
              <div className="hub-ecg-sheet-head">
                <span className="hub-ecg-tag">NAME THIS RHYTHM · {DIFFICULTY_LABELS[quizCase.difficulty].toUpperCase()}</span>
                <span className="hub-ecg-tag">SYNTHETIC EDUCATIONAL ECG</span>
              </div>
              <EcgCanvas gen={quizGen} settings={{ paperSpeed, gain, zoom }} panSec={panSec} cursorSec={null} onPanDrag={(value) => setPanSec(panClamped(value))} onLayout={(layout) => setVisibleSeconds(layout.totalSeconds)} />
            </section>
            <section className="hub-ecg-side" aria-label="Quiz measurements">
              <span className="hub-ecg-tag">{quizAnswered ? (quizPick === quizCase.id ? "CORRECT" : "INCORRECT") : "MEASUREMENTS"}</span>
              {quizAnswered ? (
                <>
                  <AnalysisPanel analysis={analyzeEcg(quizGen, quizCase)} />
                  <p className="hub-ecg-teaching">{quizCase.teaching}</p>
                </>
              ) : (
                <p className="hub-ecg-teaching">Pick a diagnosis below. Measurements and the explanation appear after you answer.</p>
              )}
            </section>
          </div>
          <section className="hub-ecg-quizbar" aria-label="Quiz controls">
            <div className="hub-pocus-presets" role="group" aria-label="Quiz difficulty">
              {["all", 1, 2, 3].map((level) => (
                <button key={String(level)} type="button" className="hub-pocus-preset" aria-pressed={difficulty === level} onClick={() => startQuiz(level)}>{level === "all" ? "ALL" : DIFFICULTY_LABELS[level].toUpperCase()}</button>
              ))}
            </div>
            <div className="hub-ecg-quiz-options" role="group" aria-label="Diagnosis options">
              {quizOptions.map((option) => (
                <button key={option.id} type="button" className={"hub-pocus-preset" + (quizAnswered && option.id === quizCase.id ? " is-active" : "") + (quizAnswered && option.id === quizPick && option.id !== quizCase.id ? " is-wrong" : "")} disabled={quizAnswered} onClick={() => answerQuiz(option.id)}>{option.diagnosis}</button>
              ))}
            </div>
            {quizAnswered && <button type="button" className="hub-pocus-preset" onClick={nextQuiz}>NEXT →</button>}
          </section>
        </>
      )}

      {mode === "review" && (
        <section className="hub-ecg-side hub-ecg-review" aria-label="Mistake review">
          <span className="hub-ecg-tag">MISTAKE REVIEW</span>
          {mistakeCases.length === 0 ? (
            <p className="hub-ecg-teaching">No recorded mistakes yet. Take a quiz — missed diagnoses are tracked here on this device.</p>
          ) : (
            <div className="hub-ecg-case-list">
              {mistakeCases.map(([id, count]) => {
                const entry = getCaseById(id);
                if (!entry) return null;
                return (
                  <button key={id} type="button" className="hub-pocus-preset" onClick={() => { selectCase(id); setMode("learn"); }}>
                    {entry.diagnosis} <em>missed {count}×</em>
                  </button>
                );
              })}
              <button type="button" className="hub-pocus-preset" onClick={clearMistakes}>CLEAR</button>
            </div>
          )}
        </section>
      )}

      <p className="hub-pocus-sim-note">SYNTHETIC EDUCATIONAL ECG — WAVEFORMS ARE GENERATED, NOT PATIENT DATA · NOT FOR CLINICAL USE</p>
    </div>
  );
}
