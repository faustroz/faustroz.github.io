"use client";

import { useEffect, useMemo, useState } from "react";
import { generateEcg } from "@/lib/hub/ecg-rhythms.mjs";
import {
  beatAtTime, classifyMechanism, explainMechanism, heartState, MECHANISM_DEFAULTS, MECHANISM_LIMITS,
  MECHANISM_PRESETS, mechanismParams, mechanismState,
} from "@/lib/hub/ecg-mechanism.mjs";
import EcgLeadCanvas from "@/components/hub/EcgLeadCanvas";

const WINDOW_SEC = 4;
const PX_PER_MM = 8;
const SLOW_MOTION = 0.3;
const LEAD_CHOICES = ["II", "V1", "V6", "I", "aVF"];

const SLIDERS = [
  { key: "rate", label: "RATE", unit: "/min" },
  { key: "pr", label: "PR", unit: " ms" },
  { key: "qrsWidth", label: "QRS", unit: " ms" },
  { key: "qtc", label: "QTc", unit: " ms" },
  { key: "axis", label: "AXIS", unit: "°" },
];

const cls = (...parts) => parts.filter(Boolean).join(" ");

/** Schematic conduction system. Parts light up as the impulse reaches them. */
function HeartDiagram({ heart }) {
  const atria = heart.atria ? "is-on" : "";
  const vent = (side) => (heart.repol ? "is-repol" : side ? "is-on" : "");
  return (
    <svg className="hub-ecg-heart" viewBox="0 0 200 230" role="img" aria-label={`Conduction diagram: ${heart.label}`}>
      <ellipse className={cls("hub-ecg-heart-part", vent(heart.rv))} cx="66" cy="158" rx="42" ry="58" />
      <ellipse className={cls("hub-ecg-heart-part", vent(heart.lv))} cx="136" cy="158" rx="48" ry="62" />
      <ellipse className={cls("hub-ecg-heart-part", atria)} cx="66" cy="56" rx="40" ry="32" />
      <ellipse className={cls("hub-ecg-heart-part", atria)} cx="134" cy="56" rx="40" ry="32" />
      <line className={cls("hub-ecg-heart-wire", heart.his && "is-on")} x1="100" y1="106" x2="100" y2="130" />
      <line className={cls("hub-ecg-heart-wire", heart.stage === "purkinje" && "is-on")} x1="100" y1="130" x2="64" y2="206" />
      <line className={cls("hub-ecg-heart-wire", heart.stage === "purkinje" && "is-on")} x1="100" y1="130" x2="140" y2="210" />
      <circle className={cls("hub-ecg-heart-node", heart.sa && "is-on")} cx="42" cy="34" r="7" />
      <circle className={cls("hub-ecg-heart-node", heart.av && "is-on", heart.blocked && "is-blocked")} cx="100" cy="98" r="7" />
      <text x="42" y="22" textAnchor="middle">SA</text>
      <text x="116" y="94">AV</text>
      <text x="66" y="160" textAnchor="middle">RV</text>
      <text x="136" y="160" textAnchor="middle">LV</text>
      <text x="66" y="60" textAnchor="middle">RA</text>
      <text x="134" y="60" textAnchor="middle">LA</text>
    </svg>
  );
}

function Slider({ item, value, onChange }) {
  const [min, max] = MECHANISM_LIMITS[item.key];
  return (
    <label className="hub-ecg-slider">
      <span>{item.label} <b>{value}{item.unit}</b></span>
      <input type="range" min={min} max={max} step="1" value={value} onChange={(event) => onChange(Number(event.target.value))} aria-label={`${item.label} (${item.unit.trim() || "value"})`} />
    </label>
  );
}

function Choice({ label, value, options, onChange }) {
  return (
    <div className="hub-pocus-presets" role="group" aria-label={label}>
      <span className="hub-ecg-choice-label">{label}</span>
      {options.map(([id, text]) => (
        <button key={id} type="button" className="hub-pocus-preset" aria-pressed={value === id} onClick={() => onChange(id)}>{text}</button>
      ))}
    </div>
  );
}

export default function EcgMechanismLab() {
  const [state, setState] = useState(MECHANISM_DEFAULTS);
  const [lead, setLead] = useState("II");
  const [cursor, setCursor] = useState(0.2);
  const [playing, setPlaying] = useState(false);

  const gen = useMemo(() => generateEcg(mechanismParams(state), 10, 7), [state]);
  const verdict = useMemo(() => classifyMechanism(state), [state]);
  const lines = useMemo(() => explainMechanism(state), [state]);
  const { beat, tMs } = beatAtTime(gen, cursor);
  const heart = heartState(state, beat, tMs);

  useEffect(() => {
    if (!playing) return undefined;
    const id = setInterval(() => setCursor((value) => (value + 0.06 * SLOW_MOTION) % WINDOW_SEC), 60);
    return () => clearInterval(id);
  }, [playing]);

  const patch = (values) => setState((current) => ({ ...current, ...values }));
  const setBundle = (bundle) => setState((current) => ({
    ...current,
    bundle,
    qrsWidth: bundle === "none" ? (current.qrsWidth >= 120 ? 90 : current.qrsWidth) : Math.max(current.qrsWidth, 130),
  }));

  return (
    <div className="hub-ecg-mechanism">
      <div className="hub-pocus-presets" role="group" aria-label="Presets">
        {MECHANISM_PRESETS.map((preset) => (
          <button key={preset.id} type="button" className="hub-pocus-preset" onClick={() => setState(mechanismState(preset.state))}>{preset.label}</button>
        ))}
      </div>

      <div className="hub-ecg-dash">
        <section className="hub-ecg-sheet" aria-label="Mechanism strip">
          <div className="hub-ecg-sheet-head">
            <span className="hub-ecg-tag">LEAD {lead} · 25 MM/S · 10 MM/MV</span>
            <span className="hub-ecg-tag hub-ecg-verdict" aria-live="polite">{verdict.label.toUpperCase()}</span>
          </div>
          <div className="hub-ecg-rate-scroll">
            <EcgLeadCanvas gen={gen} lead={lead} widthMm={WINDOW_SEC * 25} heightMm={24} pxPerMm={PX_PER_MM} startSec={0} cursorSec={cursor} ariaLabel={`Lead ${lead} for the settings chosen`} />
          </div>
          <div className="hub-pocus-presets" role="group" aria-label="Lead">
            {LEAD_CHOICES.map((name) => (
              <button key={name} type="button" className="hub-pocus-preset" aria-pressed={lead === name} onClick={() => setLead(name)}>{name}</button>
            ))}
            <button type="button" className="hub-pocus-preset" aria-pressed={playing} onClick={() => setPlaying((value) => !value)}>{playing ? "PAUSE" : "PLAY SLOW-MO"}</button>
          </div>
          <label className="hub-ecg-pan">
            <span>TIME {cursor.toFixed(2)}S</span>
            <input type="range" min="0" max={WINDOW_SEC} step="0.01" value={cursor} onChange={(event) => { setPlaying(false); setCursor(Number(event.target.value)); }} aria-label="Scrub the beat" />
          </label>
          {verdict.extras.length > 0 && <p className="hub-ecg-analysis-note">ALSO: {verdict.extras.join(" · ")}</p>}
        </section>

        <section className="hub-ecg-side" aria-label="Conduction">
          <span className="hub-ecg-tag">{heart.label.toUpperCase()}</span>
          <HeartDiagram heart={heart} />
          <p className="hub-ecg-analysis-note">The red dashed line on the strip is the moment shown here. Press play, or scrub, to follow one beat through the heart.</p>
        </section>
      </div>

      <section className="hub-ecg-quizbar hub-ecg-controls" aria-label="Physiology controls">
        {SLIDERS.map((item) => <Slider key={item.key} item={item} value={state[item.key]} onChange={(value) => patch({ [item.key]: value })} />)}
        <Choice label="AV CONDUCTION" value={state.conduction} onChange={(value) => patch({ conduction: value })} options={[["normal", "NORMAL"], ["mobitz1", "WENCKEBACH"], ["mobitz2", "MOBITZ II"]]} />
        <Choice label="BUNDLE" value={state.bundle} onChange={setBundle} options={[["none", "NONE"], ["RBBB", "RBBB"], ["LBBB", "LBBB"]]} />
        <Choice label="ST" value={state.st} onChange={(value) => patch({ st: value })} options={[["none", "ISOELECTRIC"], ["anterior", "ANTERIOR ↑"], ["inferior", "INFERIOR ↑"]]} />
      </section>

      <section className="hub-ecg-side hub-ecg-why" aria-label="Why it looks like this">
        <span className="hub-ecg-tag">WHY IT LOOKS LIKE THIS</span>
        <div className="hub-ecg-analysis">
          {lines.map((line) => (
            <div key={line.key} className={cls("hub-ecg-why-row", line.abnormal && "is-abnormal")}>
              <strong>{line.title}</strong>
              <span>{line.text}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
