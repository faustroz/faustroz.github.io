"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import {
  AUSCULTATION_SYSTEMS,
  HLS_CMDS_SOURCE,
  buildTrainerRound,
  countByType,
  getAuscultationClips,
  scoreTrainerAnswer,
} from "@/lib/hub/auscultation-library.mjs";

function ClipCard({ clip }) {
  return (
    <article className="hub-ausc-clip">
      <div className="hub-ausc-clip-head">
        <span className="hub-ausc-clip-badge">MANIKIN</span>
        <span className={"hub-ausc-clip-finding" + (clip.abnormal ? " is-abnormal" : "")}>{clip.abnormal ? "ABNORMAL" : "NORMAL"}</span>
      </div>
      <h3 className="hub-ausc-clip-title">{clip.typeLabel}</h3>
      <p className="hub-ausc-clip-site" title={clip.locationNote}>{clip.locationLabel} · {clip.locationNote}</p>
      <audio className="hub-ausc-audio" controls preload="none" src={clip.src} aria-label={`Auscultation recording, ${clip.typeLabel} at ${clip.locationLabel}`} />
      <p className="hub-ausc-clip-detail">{clip.teaching}</p>
      <p className="hub-ausc-clip-file">{clip.file}</p>
    </article>
  );
}

function Trainer({ clips }) {
  const [round, setRound] = useState(null);
  const [result, setResult] = useState(null);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const audioRef = useRef(null);

  const nextRound = useCallback(() => {
    setResult(null);
    setRound(buildTrainerRound(clips));
  }, [clips]);

  const answer = useCallback((choiceId) => {
    if (!round || result) return;
    const outcome = scoreTrainerAnswer(round, choiceId);
    setResult(outcome);
    setScore((current) => ({ correct: current.correct + (outcome.correct ? 1 : 0), total: current.total + 1 }));
  }, [round, result]);

  if (!round) {
    return (
      <div className="hub-ausc-trainer">
        <p className="hub-ausc-trainer-intro">Listen first, label second. A recording is drawn at random from the current filter; the answer choices only ever come from the same system.</p>
        <button type="button" className="hub-ausc-preset" onClick={nextRound} disabled={clips.length === 0}>START TRAINER</button>
        {clips.length === 0 ? <p className="hub-ausc-empty">No recordings match the current filter.</p> : null}
      </div>
    );
  }

  return (
    <div className="hub-ausc-trainer">
      <div className="hub-ausc-trainer-head">
        <span className="hub-ausc-label">IDENTIFY THE SOUND</span>
        <span className="hub-ausc-score" role="status">SCORE {score.correct}/{score.total}</span>
      </div>
      <audio ref={audioRef} className="hub-ausc-audio" controls autoPlay preload="auto" src={round.clip.src} aria-label="Unknown auscultation recording" />
      <p className="hub-ausc-trainer-site">Recorded at {round.clip.locationLabel} — {round.clip.locationNote}</p>
      <div className="hub-ausc-choices" role="group" aria-label="Answer choices">
        {round.choices.map((choice) => {
          const state = !result ? "" : choice.id === round.answerId ? " is-correct" : choice.id === result.choiceId ? " is-wrong" : "";
          return (
            <button key={choice.id} type="button" className={"hub-ausc-choice" + state} onClick={() => answer(choice.id)} disabled={Boolean(result)}>{choice.label}</button>
          );
        })}
      </div>
      {result ? (
        <div className="hub-ausc-feedback" role="status">
          <p className="hub-ausc-verdict">{result.correct ? "Correct." : `Not quite — this is ${round.clip.typeLabel}.`}</p>
          <p className="hub-ausc-clip-detail">{round.clip.teaching}</p>
          <button type="button" className="hub-ausc-preset" onClick={nextRound}>NEXT SOUND</button>
        </div>
      ) : null}
    </div>
  );
}

export default function AuscultationLab() {
  const [mode, setMode] = useState("library");
  const [system, setSystem] = useState("all");
  const [typeId, setTypeId] = useState("all");

  const types = useMemo(() => countByType(system), [system]);
  const clips = useMemo(() => getAuscultationClips({ system, typeId }), [system, typeId]);

  const selectSystem = useCallback((nextSystem) => {
    setSystem(nextSystem);
    setTypeId("all");
  }, []);

  return (
    <div className="hub-ausc-lab">
      <div className="hub-ausc-toolbar">
        <div className="hub-ausc-modes" role="group" aria-label="Lab mode">
          <button type="button" className="hub-ausc-preset" aria-pressed={mode === "library"} onClick={() => setMode("library")}>LIBRARY</button>
          <button type="button" className="hub-ausc-preset" aria-pressed={mode === "trainer"} onClick={() => setMode("trainer")}>TRAINER</button>
        </div>
        <div className="hub-ausc-systems" role="group" aria-label="Filter by system">
          <button type="button" className="hub-ausc-preset" aria-pressed={system === "all"} onClick={() => selectSystem("all")}>ALL 100</button>
          {AUSCULTATION_SYSTEMS.map((entry) => (
            <button key={entry.id} type="button" className="hub-ausc-preset" aria-pressed={system === entry.id} title={entry.blurb} onClick={() => selectSystem(entry.id)}>
              {entry.label.toUpperCase()} {getAuscultationClips({ system: entry.id }).length}
            </button>
          ))}
        </div>
      </div>

      <div className="hub-ausc-types" role="group" aria-label="Filter by sound type">
        <button type="button" className="hub-ausc-preset" aria-pressed={typeId === "all"} onClick={() => setTypeId("all")}>ALL TYPES</button>
        {types.map((type) => (
          <button key={type.id} type="button" className="hub-ausc-preset" aria-pressed={typeId === type.id} onClick={() => setTypeId(type.id)}>{type.label} {type.count}</button>
        ))}
      </div>

      {mode === "trainer" ? (
        <section className="hub-ausc-panel" aria-label="Auscultation trainer">
          <Trainer clips={clips} />
        </section>
      ) : (
        <section className="hub-ausc-panel" aria-label="Auscultation recording library">
          <p className="hub-ausc-note">{HLS_CMDS_SOURCE.note}</p>
          {clips.length === 0 ? <p className="hub-ausc-empty">No recordings match the current filter.</p> : (
            <div className="hub-ausc-grid">
              {clips.map((clip) => <ClipCard key={clip.id} clip={clip} />)}
            </div>
          )}
        </section>
      )}

      <footer className="hub-ausc-source">
        <p>
          <strong>{HLS_CMDS_SOURCE.title}</strong> by {HLS_CMDS_SOURCE.authors}, licensed{" "}
          <a href={HLS_CMDS_SOURCE.licenseUrl} target="_blank" rel="noreferrer noopener">{HLS_CMDS_SOURCE.license}</a>. Source:{" "}
          <a href={HLS_CMDS_SOURCE.sourceUrl} target="_blank" rel="noreferrer noopener">Zenodo</a> ·{" "}
          <a href={HLS_CMDS_SOURCE.doiUrl} target="_blank" rel="noreferrer noopener">IEEE Data Descriptions</a>. {HLS_CMDS_SOURCE.capture}
        </p>
      </footer>
    </div>
  );
}
