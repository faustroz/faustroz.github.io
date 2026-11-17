"use client";

import { useMemo, useRef, useState } from "react";
import { generateEcg } from "@/lib/hub/ecg-rhythms.mjs";
import { mechanismParams } from "@/lib/hub/ecg-mechanism.mjs";
import {
  AXIS_CATEGORIES, axisCategory, axisRule, buildAxisQuestion, LIMB_AXES, LIMB_LEADS, leadDeflection, normalizeAngle, polarity,
} from "@/lib/hub/ecg-axis.mjs";
import { playQuizSound, signalAnswer } from "@/lib/hub/quiz-feedback.mjs";
import EcgLeadCanvas from "@/components/hub/EcgLeadCanvas";

const R = 100;
const point = (deg, radius) => [Math.cos((deg * Math.PI) / 180) * radius, Math.sin((deg * Math.PI) / 180) * radius];
const categoryLabel = (id) => AXIS_CATEGORIES.find((entry) => entry.id === id);

function sector(from, to, radius) {
  const [x1, y1] = point(from, radius);
  const [x2, y2] = point(to, radius);
  return `M0 0 L${x1.toFixed(1)} ${y1.toFixed(1)} A${radius} ${radius} 0 0 1 ${x2.toFixed(1)} ${y2.toFixed(1)} Z`;
}

/** Hexaxial reference system. Drag the vector (or use the slider) to set the QRS axis. */
function HexaxialDial({ angle, onChange, readOnly = false }) {
  const svgRef = useRef(null);
  const dragging = useRef(false);

  const update = (event) => {
    const rect = svgRef.current.getBoundingClientRect();
    const dx = event.clientX - (rect.left + rect.width / 2);
    const dy = event.clientY - (rect.top + rect.height / 2);
    onChange(normalizeAngle((Math.atan2(dy, dx) * 180) / Math.PI));
  };

  const [tipX, tipY] = point(angle, R * 0.88);
  return (
    <svg
      ref={svgRef}
      className={"hub-ecg-dial" + (readOnly ? "" : " is-interactive")}
      viewBox="-135 -135 270 270"
      role="img"
      aria-label={`Hexaxial reference system, QRS vector at ${angle} degrees`}
      onPointerDown={readOnly ? undefined : (event) => { dragging.current = true; event.currentTarget.setPointerCapture(event.pointerId); update(event); }}
      onPointerMove={readOnly ? undefined : (event) => { if (dragging.current) update(event); }}
      onPointerUp={() => { dragging.current = false; }}
      onPointerCancel={() => { dragging.current = false; }}
    >
      <path className="hub-ecg-dial-normal" d={sector(-30, 90, R)} />
      <circle className="hub-ecg-dial-ring" cx="0" cy="0" r={R} />
      {LIMB_LEADS.map((lead) => {
        const deg = LIMB_AXES[lead];
        const [px, py] = point(deg, R);
        const [nx, ny] = point(deg + 180, R);
        const [lx, ly] = point(deg, R + 15);
        return (
          <g key={lead}>
            <line className="hub-ecg-dial-axis" x1={nx} y1={ny} x2={px} y2={py} />
            <text className="hub-ecg-dial-lead" x={lx} y={ly} textAnchor="middle" dominantBaseline="middle">{lead}</text>
          </g>
        );
      })}
      {[-90, 0, 90, 180].map((deg) => {
        const [x, y] = point(deg, R + 28);
        return <text key={deg} className="hub-ecg-dial-deg" x={x} y={y} textAnchor="middle" dominantBaseline="middle">{deg === 180 ? "±180°" : `${deg}°`}</text>;
      })}
      <line className="hub-ecg-dial-vector" x1="0" y1="0" x2={tipX} y2={tipY} />
      <circle className="hub-ecg-dial-tip" cx={tipX} cy={tipY} r="7" />
    </svg>
  );
}

function LimbLeads({ angle }) {
  const gen = useMemo(() => generateEcg(mechanismParams({ axis: angle }), 4, 7), [angle]);
  return (
    <div className="hub-ecg-limb-grid" role="group" aria-label="Limb leads">
      {LIMB_LEADS.map((lead) => (
        <div key={lead} className="hub-ecg-rate-scroll">
          <EcgLeadCanvas gen={gen} lead={lead} widthMm={36} heightMm={26} pxPerMm={4} startSec={0.15} baselineFrac={0.52} label={lead} ariaLabel={`Lead ${lead}`} />
        </div>
      ))}
    </div>
  );
}

function ExploreAxis() {
  const [angle, setAngle] = useState(40);
  const category = categoryLabel(axisCategory(angle));
  return (
    <>
      <div className="hub-ecg-dash">
      <section className="hub-ecg-sheet" aria-label="Axis explorer">
        <div className="hub-ecg-sheet-head">
          <span className="hub-ecg-tag">DRAG THE VECTOR · WATCH THE LEADS</span>
          <span className="hub-ecg-tag hub-ecg-verdict">{angle}° · {category.label.toUpperCase()}</span>
        </div>
        <HexaxialDial angle={angle} onChange={setAngle} />
        <label className="hub-ecg-pan">
          <span>AXIS {angle}°</span>
          <input type="range" min="-180" max="180" step="1" value={angle} onChange={(event) => setAngle(Number(event.target.value))} aria-label="QRS axis in degrees" />
        </label>
      </section>
      <section className="hub-ecg-side" aria-label="Axis reasoning">
        <span className="hub-ecg-tag">HOW EACH LEAD SEES IT</span>
        <div className="hub-ecg-analysis">
          {LIMB_LEADS.map((lead) => {
            const value = leadDeflection(angle, lead);
            return (
              <div key={lead} className="hub-ecg-analysis-row">
                <span className="hub-ecg-analysis-label">Lead {lead} ({LIMB_AXES[lead]}°)</span>
                <span className="hub-ecg-analysis-value">{polarity(value)} {Math.round(Math.abs(value) * 100)}%</span>
                <span className="hub-ecg-analysis-ref">{polarity(value) === "±" ? "equiphasic" : value > 0 ? "toward" : "away"}</span>
              </div>
            );
          })}
        </div>
        <p className="hub-ecg-teaching">{axisRule(angle)}</p>
        <p className="hub-ecg-analysis-note">A lead sees positive when the wave of depolarisation travels toward its positive end, negative when it travels away, and equiphasic when it is at right angles. The axis is perpendicular to the most equiphasic lead.</p>
      </section>
      </div>
      <section className="hub-ecg-sheet" aria-label="Limb leads">
        <span className="hub-ecg-tag">LIMB LEADS · 25 MM/S · 10 MM/MV</span>
        <LimbLeads angle={angle} />
      </section>
    </>
  );
}

function QuizAxis() {
  const [seed, setSeed] = useState(1);
  const [pick, setPick] = useState(null);
  const [feedback, setFeedback] = useState("");
  const [score, setScore] = useState({ right: 0, total: 0 });
  const question = useMemo(() => buildAxisQuestion(seed), [seed]);
  const answered = pick !== null;

  const answer = (id) => {
    if (answered) return;
    const isCorrect = id === question.category;
    setPick(id);
    setFeedback(signalAnswer(isCorrect));
    setScore((current) => ({ right: current.right + (isCorrect ? 1 : 0), total: current.total + 1 }));
  };
  const next = () => { playQuizSound("next"); setSeed((value) => value + 1); setPick(null); setFeedback(""); };

  return (
    <>
      <section className="hub-ecg-sheet" aria-label="Axis quiz leads">
        <div className="hub-ecg-sheet-head">
          <span className="hub-ecg-tag">FIND THE AXIS FROM THE LIMB LEADS</span>
          <span className="hub-ecg-tag">SCORE {score.right}/{score.total}</span>
        </div>
        <LimbLeads angle={question.angle} />
        <div className="hub-ecg-quiz-options" role="group" aria-label="Axis options">
          {AXIS_CATEGORIES.map((entry) => (
            <button
              key={entry.id}
              type="button"
              className={"hub-pocus-preset"
                + (answered && entry.id === question.category ? " is-active" : "")
                + (answered && entry.id === pick && entry.id !== question.category ? " is-wrong" : "")
                + (answered && entry.id === pick ? ` ${feedback}` : "")}
              disabled={answered}
              onClick={() => answer(entry.id)}
            >
              {entry.label} <em>{entry.range}</em>
            </button>
          ))}
        </div>
        {answered && <button type="button" className="hub-pocus-preset" onClick={next}>NEXT →</button>}
      </section>
      <section className="hub-ecg-side" aria-label="Axis quiz feedback">
        <span key={`${seed}-${pick ?? "none"}`} className={"hub-ecg-tag hub-ecg-verdict" + (answered ? ` ${feedback}` : "")} role={answered ? "status" : undefined}>
          {answered ? (pick === question.category ? "CORRECT" : "INCORRECT") : "YOUR TURN"}
        </span>
        {answered ? (
          <>
            <HexaxialDial angle={question.angle} onChange={() => {}} readOnly />
            <p className="hub-ecg-teaching">Axis ≈ {question.angle}°. {question.rule}</p>
          </>
        ) : (
          <p className="hub-ecg-teaching">Check lead I and aVF first: is each mostly up (positive) or down (negative)? If I is up and aVF is down, look at lead II.</p>
        )}
      </section>
    </>
  );
}

export default function EcgAxisLab() {
  const [view, setView] = useState("explore");
  return (
    <div className="hub-ecg-axis">
      <div className="hub-pocus-presets" role="group" aria-label="Axis lab view">
        <button type="button" className="hub-pocus-preset" aria-pressed={view === "explore"} onClick={() => setView("explore")}>EXPLORE</button>
        <button type="button" className="hub-pocus-preset" aria-pressed={view === "quiz"} onClick={() => setView("quiz")}>AXIS QUIZ</button>
      </div>
      {view === "explore" ? <ExploreAxis /> : <QuizAxis />}
    </div>
  );
}
