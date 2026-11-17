import { axisLabel } from "./ecg-analysis.mjs";

// The mechanism lab turns physiology knobs (what the heart does) into waveform parameters
// (what the ECG shows), and explains each knob in words.

export const MECHANISM_DEFAULTS = Object.freeze({ rate: 75, pr: 160, qrsWidth: 90, qtc: 420, axis: 40, conduction: "normal", bundle: "none", st: "none" });

export const MECHANISM_LIMITS = Object.freeze({
  rate: [35, 180], pr: [80, 360], qrsWidth: [70, 180], qtc: [340, 540], axis: [-110, 180],
});

export const MECHANISM_PRESETS = [
  { id: "normal", label: "NORMAL", state: {} },
  { id: "avb1", label: "1° AV BLOCK", state: { pr: 300 } },
  { id: "wenckebach", label: "WENCKEBACH", state: { conduction: "mobitz1" } },
  { id: "mobitz2", label: "MOBITZ II", state: { conduction: "mobitz2", pr: 200, qrsWidth: 100 } },
  { id: "rbbb", label: "RBBB", state: { bundle: "RBBB", qrsWidth: 140 } },
  { id: "lbbb", label: "LBBB", state: { bundle: "LBBB", qrsWidth: 145, axis: -35, qtc: 440 } },
  { id: "tachy", label: "TACHYCARDIA", state: { rate: 130, pr: 140 } },
  { id: "brady", label: "BRADYCARDIA", state: { rate: 45 } },
  { id: "longqt", label: "LONG QT", state: { qtc: 500 } },
  { id: "stemi", label: "ANTERIOR STEMI", state: { st: "anterior", rate: 96 } },
];

export function mechanismState(patch = {}) {
  return { ...MECHANISM_DEFAULTS, ...patch };
}

/** Waveform generator parameters for a mechanism state. */
export function mechanismParams(input) {
  const s = mechanismState(input);
  const params = {
    rhythm: "sinus", rate: s.rate, pr: s.pr, qrsWidth: s.qrsWidth, qtc: s.qtc, qrsAxis: s.axis,
    pAxis: 50, tAxis: s.bundle === "LBBB" ? 160 : 45, pAmp: 0.15, pWidth: 90, tAmp: s.bundle === "LBBB" ? 0.3 : 0.32,
  };
  if (s.conduction !== "normal") { params.rhythm = "avblock"; params.avBlock = s.conduction; }
  if (s.bundle !== "none") params.bbb = s.bundle;
  if (s.st !== "none") params.stemi = { territory: s.st };
  return params;
}

/** What the settings add up to, named the way a clinician would. */
export function classifyMechanism(input) {
  const s = mechanismState(input);
  let label;
  if (s.st === "anterior") label = "Anterior STEMI pattern";
  else if (s.st === "inferior") label = "Inferior STEMI pattern";
  else if (s.bundle === "RBBB") label = "Right bundle branch block";
  else if (s.bundle === "LBBB") label = "Left bundle branch block";
  else if (s.conduction === "mobitz1") label = "Second-degree AV block, Mobitz I (Wenckebach)";
  else if (s.conduction === "mobitz2") label = "Second-degree AV block, Mobitz II";
  else if (s.pr > 200) label = "First-degree AV block";
  else if (s.rate < 60) label = "Sinus bradycardia";
  else if (s.rate > 100) label = "Sinus tachycardia";
  else label = "Normal sinus rhythm";
  const extras = [];
  if (s.bundle === "none" && s.qrsWidth >= 120) extras.push("wide QRS");
  if (s.pr < 120 && s.conduction === "normal") extras.push("short PR");
  if (s.qtc > 460) extras.push("long QT");
  if (s.qtc < 350) extras.push("short QT");
  const axis = axisLabel(s.axis);
  if (axis !== "Normal axis") extras.push(axis.toLowerCase());
  return { label, extras };
}

/** One plain-language line per knob: what is physically happening and how it shows on paper. */
export function explainMechanism(input) {
  const s = mechanismState(input);
  const rr = Math.round(60000 / s.rate);
  const lines = [];

  lines.push({
    key: "rate", title: `Rate ${s.rate}/min · R–R ${rr} ms`, abnormal: s.rate < 60 || s.rate > 100,
    text: s.rate < 60 ? "The SA node fires slowly, so beats sit far apart on the paper. Each beat is still normal."
      : s.rate > 100 ? "The SA node fires fast. Beats crowd together and the diastolic gap (T to next P) shrinks first."
        : "The SA node sets a normal pace.",
  });

  if (s.conduction === "mobitz1") {
    lines.push({ key: "pr", title: "PR lengthens, then a beat drops", abnormal: true, text: "The AV node tires: each impulse is held a little longer until one cannot pass. The pause lets the node recover, then the cycle repeats (grouped beating)." });
  } else if (s.conduction === "mobitz2") {
    lines.push({ key: "pr", title: `PR constant ${s.pr} ms, beats drop suddenly`, abnormal: true, text: "The block sits below the AV node (His–Purkinje). Conduction is all-or-none: PR does not warn you, so it can progress to complete block." });
  } else if (s.pr > 200) {
    lines.push({ key: "pr", title: `PR ${s.pr} ms (long)`, abnormal: true, text: "The AV node holds the impulse longer than normal. Every P still conducts, so this is a delay, not a failure: first-degree AV block." });
  } else if (s.pr < 120) {
    lines.push({ key: "pr", title: `PR ${s.pr} ms (short)`, abnormal: true, text: "The impulse reaches the ventricles without the usual AV node delay (an accessory pathway or a junctional origin)." });
  } else {
    lines.push({ key: "pr", title: `PR ${s.pr} ms`, abnormal: false, text: "The AV node delay (the flat PR segment) lets the ventricles finish filling before they contract." });
  }

  if (s.bundle === "RBBB") {
    lines.push({ key: "qrs", title: `QRS ${s.qrsWidth} ms · RBBB`, abnormal: true, text: "The right bundle is blocked, so the right ventricle is activated late through muscle from the left. Late right-sided forces make the R′ in V1 and a slurred S in I and V6." });
  } else if (s.bundle === "LBBB") {
    lines.push({ key: "qrs", title: `QRS ${s.qrsWidth} ms · LBBB`, abnormal: true, text: "The left bundle is blocked, so the whole left ventricle is activated slowly from the right. Result: broad notched R in I, aVL, V6 and deep S in V1, with discordant ST–T." });
  } else if (s.qrsWidth >= 120) {
    lines.push({ key: "qrs", title: `QRS ${s.qrsWidth} ms (wide)`, abnormal: true, text: "The impulse is crossing muscle cell to cell instead of racing down the His–Purkinje system: a ventricular origin, a bundle block or a conduction problem." });
  } else {
    lines.push({ key: "qrs", title: `QRS ${s.qrsWidth} ms`, abnormal: false, text: "Narrow: the impulse spreads through the fast His–Purkinje network and both ventricles depolarise almost together." });
  }

  lines.push({
    key: "qt", title: `QTc ${s.qtc} ms`, abnormal: s.qtc > 460 || s.qtc < 350,
    text: s.qtc > 460 ? "Ventricular repolarisation is slow. The vulnerable period lengthens, which risks torsades de pointes (drugs, low K⁺/Mg²⁺, congenital)."
      : s.qtc < 350 ? "Repolarisation is unusually quick (hypercalcaemia, digoxin, congenital short QT)."
        : "Repolarisation time is normal for the rate.",
  });

  lines.push({
    key: "axis", title: `QRS axis ${s.axis}° · ${axisLabel(s.axis)}`, abnormal: axisLabel(s.axis) !== "Normal axis",
    text: axisLabel(s.axis) === "Normal axis" ? "The average ventricular depolarisation points down and left, toward the big left ventricle."
      : "The average ventricular vector is rotated away from normal: look for hypertrophy, a fascicular block, an old infarct or lead misplacement.",
  });

  if (s.st === "anterior") lines.push({ key: "st", title: "ST elevation V1–V4", abnormal: true, text: "Transmural ischaemia of the LAD territory. The injury current lifts the ST segment over the injured wall and depresses it in opposite (reciprocal) leads inferiorly." });
  else if (s.st === "inferior") lines.push({ key: "st", title: "ST elevation II, III, aVF", abnormal: true, text: "Transmural ischaemia of the RCA territory, with reciprocal depression in I and aVL. The RCA also feeds the AV node, so expect bradycardia and AV block." });
  else lines.push({ key: "st", title: "ST segment isoelectric", abnormal: false, text: "No injury current: the whole ventricle is at the same potential between QRS and T." });

  return lines;
}

const STAGE_LABELS = {
  sa: "SA node fires", atria: "Atria depolarise (P wave)", av: "AV node delay (PR segment)",
  blocked: "Impulse blocked at the AV node (P without QRS)", purkinje: "His–Purkinje fires, ventricles depolarise (QRS)",
  repol: "Ventricles repolarise (ST–T)", rest: "Diastole (resting)",
};

/**
 * Which parts of the heart are active tMs after the SA node fired. beat: { pr, hasQrs } from the generator.
 */
export function heartState(input, beat, tMs) {
  const s = mechanismState(input);
  const pWidth = 90;
  const pr = beat?.hasQrs ? beat.pr : (beat?.pr ?? s.pr);
  const conducted = beat?.hasQrs !== false;
  const qrsStart = conducted ? pr : Infinity;
  const jPoint = qrsStart + s.qrsWidth;
  const out = { sa: false, atria: false, av: false, blocked: false, his: false, rv: false, lv: false, repol: false, stage: "rest" };

  if (tMs < 0) return { ...out, label: STAGE_LABELS.rest };
  if (conducted && tMs >= qrsStart) {
    if (tMs < jPoint) {
      out.stage = "purkinje";
      out.his = tMs < qrsStart + s.qrsWidth * 0.5;
      const slowSide = tMs >= qrsStart + s.qrsWidth * 0.5;
      out.rv = s.bundle === "RBBB" ? slowSide : true;
      out.lv = s.bundle === "LBBB" ? slowSide : true;
    } else if (tMs < qrsStart + s.qtc * 0.9) {
      out.repol = true; out.stage = "repol";
    }
  } else if (tMs < pWidth) {
    out.atria = true;
    out.sa = tMs < 25;
    out.stage = out.sa ? "sa" : "atria";
  } else if (!conducted) {
    if (tMs < pWidth + 160) { out.blocked = true; out.stage = "blocked"; }
  } else {
    out.av = true; out.stage = "av";
  }
  return { ...out, label: STAGE_LABELS[out.stage] };
}

/** The beat a time point belongs to, and how many ms after its SA firing. */
export function beatAtTime(gen, tSec) {
  let found = null;
  for (const beat of gen.beats) {
    if (beat.t <= tSec) found = beat;
    else break;
  }
  return found ? { beat: found, tMs: (tSec - found.t) * 1000 } : { beat: null, tMs: -1 };
}
