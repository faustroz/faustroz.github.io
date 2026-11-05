import { LEADS } from "./ecg-rhythms.mjs";

export const ECG_REFERENCE = {
  rate: [60, 100, "60–100 bpm"],
  pr: [120, 200, "120–200 ms"],
  qrs: [0, 120, "< 120 ms"],
  qtc: [0, 440, "≤ 440 ms"],
  axis: [-30, 90, "−30° to +90°"],
  st: "isoelectric",
  p: "upright in I, II, aVF; inverted in aVR",
};

export function axisLabel(deg) {
  if (deg >= -30 && deg <= 90) return "Normal axis";
  if (deg < -30 && deg >= -90) return "Left axis deviation";
  if (deg > 90 && deg <= 180) return "Right axis deviation";
  return "Extreme axis";
}

function netQrsArea(gen, lead, beat) {
  const params = gen.params;
  const start = beat.t + (beat.pr ?? 0) / 1000 - 0.02;
  const end = start + params.qrsWidth / 1000 + 0.04;
  const arr = gen.leads[lead];
  const from = Math.max(0, Math.round(start * gen.fs));
  const to = Math.min(arr.length, Math.round(end * gen.fs));
  let sum = 0;
  for (let i = from; i < to; i += 1) sum += arr[i];
  return sum / gen.fs;
}

export function computeAxis(gen) {
  const qrsBeats = gen.beats.filter((beat) => beat.hasQrs);
  if (!qrsBeats.length) return null;
  let sumI = 0;
  let sumAvf = 0;
  for (const beat of qrsBeats) {
    sumI += netQrsArea(gen, "I", beat);
    sumAvf += netQrsArea(gen, "aVF", beat);
  }
  const deg = (Math.atan2(sumAvf, sumI) * 180) / Math.PI;
  return Math.round(deg);
}

function rrStats(gen) {
  const qrsTimes = gen.beats.filter((beat) => beat.hasQrs).map((beat) => beat.t).sort((a, b) => a - b);
  const rrs = [];
  for (let i = 1; i < qrsTimes.length; i += 1) rrs.push((qrsTimes[i] - qrsTimes[i - 1]) * 1000);
  if (!rrs.length) return null;
  const mean = rrs.reduce((a, b) => a + b, 0) / rrs.length;
  const min = Math.min(...rrs);
  const max = Math.max(...rrs);
  return { mean, min, max, count: rrs.length };
}

function flag(value, ref) {
  if (ref === null || ref === undefined) return false;
  if (Array.isArray(ref)) return value < ref[0] || value > ref[1];
  return value !== ref;
}

export function analyzeEcg(gen, caseDef) {
  const params = gen.params;
  const stats = rrStats(gen);
  const axisDeg = computeAxis(gen);
  const rate = stats ? Math.round(60000 / stats.mean) : null;
  const irregular = stats ? stats.max - stats.min > 160 : false;
  const rrSec = stats ? stats.mean / 1000 : 1;
  const qtMs = params.rhythm === "vf" ? null : Math.round(params.qtc * Math.sqrt(rrSec));
  const qtcMs = params.rhythm === "vf" ? null : params.qtc;
  const prMs = params.pPresent === false || params.rhythm === "vf" ? null : params.pr ?? null;
  const qrsMs = params.rhythm === "vf" ? null : params.qrsWidth;

  const fields = [
    { key: "rate", label: "Heart rate", value: rate !== null ? `${rate} bpm` : "—", ref: ECG_REFERENCE.rate[2], abnormal: rate !== null && flag(rate, ECG_REFERENCE.rate) },
    { key: "rhythm", label: "Rhythm", value: caseDef.analysis.rhythm, ref: "Regular sinus", abnormal: caseDef.analysis.rhythmAbnormal },
    { key: "axis", label: "Electrical axis", value: axisDeg !== null ? `${axisDeg}° · ${axisLabel(axisDeg)}` : "—", ref: ECG_REFERENCE.axis[2], abnormal: axisDeg !== null && flag(axisDeg, ECG_REFERENCE.axis) },
    { key: "p", label: "P wave", value: caseDef.analysis.p, ref: ECG_REFERENCE.p, abnormal: caseDef.analysis.pAbnormal },
    { key: "pr", label: "PR interval", value: prMs !== null ? `${prMs} ms` : "not measurable", ref: ECG_REFERENCE.pr[2], abnormal: prMs !== null && flag(prMs, ECG_REFERENCE.pr) },
    { key: "qrs", label: "QRS duration", value: qrsMs !== null ? `${qrsMs} ms` : "—", ref: ECG_REFERENCE.qrs[2], abnormal: qrsMs !== null && flag(qrsMs, ECG_REFERENCE.qrs) },
    { key: "qt", label: "QT / QTc (Bazett)", value: qtMs !== null ? `${qtMs} / ${qtcMs} ms` : "—", ref: ECG_REFERENCE.qtc[2], abnormal: qtcMs !== null && flag(qtcMs, ECG_REFERENCE.qtc) },
    { key: "st", label: "ST segment", value: caseDef.analysis.st, ref: ECG_REFERENCE.st, abnormal: caseDef.analysis.stAbnormal },
    { key: "t", label: "T wave", value: caseDef.analysis.t, ref: "Upright, concordant with QRS", abnormal: caseDef.analysis.tAbnormal },
  ];

  return { rate, irregular, rrRange: stats ? [Math.round(stats.min), Math.round(stats.max)] : null, axisDeg, fields };
}

export function isFieldAbnormal(key, value) {
  const refs = { rate: ECG_REFERENCE.rate, pr: ECG_REFERENCE.pr, qrs: ECG_REFERENCE.qrs, qtc: ECG_REFERENCE.qtc, axis: ECG_REFERENCE.axis };
  const ref = refs[key];
  if (!ref || typeof value !== "number") return false;
  return flag(value, ref);
}
