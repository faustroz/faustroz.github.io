export const LEADS = ["I", "II", "III", "aVR", "aVL", "aVF", "V1", "V2", "V3", "V4", "V5", "V6"];
export const SHEET_ROWS = [
  ["I", "aVR", "V1", "V4"],
  ["II", "aVL", "V2", "V5"],
  ["III", "aVF", "V3", "V6"],
];
export const RHYTHM_STRIP_LEAD = "II";
export const FS = 500;

const LEAD_AXIS = { I: 0, II: 60, III: 120, aVR: -150, aVL: -30, aVF: 90 };

const PRECORDIAL_NORMAL = {
  V1: { r: 0.15, s: 0.85, q: 0, rp: 0 },
  V2: { r: 0.25, s: 1.05, q: 0, rp: 0 },
  V3: { r: 0.55, s: 0.85, q: 0, rp: 0 },
  V4: { r: 0.95, s: 0.45, q: 0, rp: 0 },
  V5: { r: 1.05, s: 0.22, q: 0.06, rp: 0 },
  V6: { r: 0.95, s: 0.14, q: 0.08, rp: 0 },
};
const PRECORDIAL_RBBB = {
  V1: { r: 0.2, s: 0.55, q: 0, rp: 0.5 },
  V2: { r: 0.3, s: 0.6, q: 0, rp: 0.42 },
  V3: { r: 0.6, s: 0.7, q: 0, rp: 0.2 },
  V4: { r: 0.95, s: 0.4, q: 0, rp: 0 },
  V5: { r: 1.05, s: 0.3, q: 0.06, rp: 0 },
  V6: { r: 0.95, s: 0.24, q: 0.08, rp: 0 },
};
const PRECORDIAL_LBBB = {
  V1: { r: 0.12, s: 1.2, q: 0, rp: 0 },
  V2: { r: 0.15, s: 1.15, q: 0, rp: 0 },
  V3: { r: 0.3, s: 0.9, q: 0, rp: 0 },
  V4: { r: 0.7, s: 0.4, q: 0, rp: 0 },
  V5: { r: 1.0, s: 0.1, q: 0, rp: 0 },
  V6: { r: 1.05, s: 0.08, q: 0, rp: 0 },
};
const T_PRECORDIAL_NORMAL = { V1: -0.12, V2: 0.35, V3: 0.5, V4: 0.55, V5: 0.45, V6: 0.3 };
const T_PRECORDIAL_LBBB = { V1: 0.25, V2: 0.2, V3: -0.1, V4: -0.2, V5: -0.25, V6: -0.28 };

export function makeRng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const gauss = (t, center, sigma) => {
  const d = (t - center) / sigma;
  return Math.exp(-d * d);
};
const rad = (deg) => (deg * Math.PI) / 180;
const frontal = (amp, waveAxis, leadAxis) => amp * Math.cos(rad(waveAxis - leadAxis));
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const smooth = (t, a, b) => {
  const x = clamp01((t - a) / (b - a));
  return x * x * (3 - 2 * x);
};

function precordialTable(params) {
  if (params.bbb === "RBBB") return PRECORDIAL_RBBB;
  if (params.bbb === "LBBB") return PRECORDIAL_LBBB;
  return PRECORDIAL_NORMAL;
}

function tPrecordial(params) {
  return params.bbb === "LBBB" ? T_PRECORDIAL_LBBB : T_PRECORDIAL_NORMAL;
}

function stShiftForLead(params, lead) {
  if (!params.stemi) return 0;
  const map = params.stemi.territory === "anterior"
    ? { V1: 0.2, V2: 0.35, V3: 0.38, V4: 0.28, V5: 0.08, I: 0.05, aVR: -0.12, II: -0.08, III: -0.1, aVF: -0.08 }
    : { II: 0.28, III: 0.34, aVF: 0.3, V5: 0.06, V6: 0.05, I: -0.1, aVL: -0.14, V1: -0.06, V2: -0.05 };
  return map[lead] || 0;
}

function qAmpForLead(params, lead) {
  if (params.stemi && params.stemi.territory === "anterior" && (lead === "V1" || lead === "V2" || lead === "V3")) return 0.25;
  return 0;
}

function leadQrsAmps(params, lead) {
  const table = precordialTable(params);
  if (LEAD_AXIS[lead] !== undefined) {
    const axis = params.qrsAxis;
    const r = frontal(1.0, axis, LEAD_AXIS[lead]);
    const s = -0.28 * Math.max(0, Math.cos(rad(axis - LEAD_AXIS[lead])));
    const q = -0.1 * Math.max(0, Math.cos(rad(axis - LEAD_AXIS[lead])));
    const rp = 0;
    return { r, s, q, rp };
  }
  const cell = table[lead];
  return {
    r: cell.r,
    s: -cell.s,
    q: -cell.q - qAmpForLead(params, lead),
    rp: cell.rp,
    sSigmaScale: params.bbb === "LBBB" && (lead === "V1" || lead === "V2") ? 2.2 : params.bbb === "RBBB" && ["I", "aVL", "V5", "V6"].includes(lead) ? 2 : 1,
    notched: params.bbb === "LBBB" && ["I", "aVL", "V5", "V6"].includes(lead),
  };
}

function leadPAmp(params, lead) {
  if (LEAD_AXIS[lead] !== undefined) return frontal(params.pAmp, params.pAxis ?? 50, LEAD_AXIS[lead]);
  return lead === "V1" ? params.pAmp * 0.25 : params.pAmp * 0.1;
}

function leadTAmp(params, lead) {
  if (params.vf) return 0;
  if (LEAD_AXIS[lead] !== undefined) {
    let amp = frontal(params.tAmp, params.tAxis ?? 45, LEAD_AXIS[lead]);
    if (params.stemi) {
      const shift = stShiftForLead(params, lead);
      amp += shift * 1.2;
    }
    return amp;
  }
  let amp = tPrecordial(params)[lead];
  if (params.stemi && params.stemi.territory === "anterior") amp += stShiftForLead(params, lead) * 1.4;
  return amp;
}

function buildBeatWaves(beat, params) {
  const waves = [];
  const qrsWidth = params.qrsWidth;
  const qSigma = qrsWidth / 7;
  const pr = beat.pr ?? 0;
  if (beat.hasP) {
    for (const lead of LEADS) {
      waves.push({ kind: "wave", lead, center: params.pWidth / 2, sigma: params.pWidth / 4, amp: leadPAmp(params, lead) * (beat.pScale ?? 1) });
    }
  }
  if (beat.hasQrs) {
    const rSigma = params.bbb ? qSigma * 1.6 : qSigma;
    for (const lead of LEADS) {
      const amps = leadQrsAmps(params, lead);
      const qrsStart = pr;
      if (amps.q !== 0) waves.push({ kind: "wave", lead, center: qrsStart + qSigma, sigma: qSigma * 0.8, amp: amps.q });
      if (amps.notched) {
        waves.push({ kind: "wave", lead, center: qrsStart + qrsWidth * 0.28, sigma: rSigma * 1.5, amp: amps.r * 0.85 });
        waves.push({ kind: "wave", lead, center: qrsStart + qrsWidth * 0.62, sigma: rSigma * 1.5, amp: amps.r * 0.7 });
      } else {
        waves.push({ kind: "wave", lead, center: qrsStart + qrsWidth * 0.32, sigma: rSigma, amp: amps.r });
      }
      if (amps.rp) waves.push({ kind: "wave", lead, center: qrsStart + qrsWidth * 0.66, sigma: rSigma * 1.1, amp: amps.rp });
      if (amps.s !== 0) waves.push({ kind: "wave", lead, center: qrsStart + qrsWidth * 0.58, sigma: qSigma * (amps.sSigmaScale || 1) * 1.1, amp: amps.s });
      const stShift = stShiftForLead(params, lead);
      const jPoint = qrsStart + qrsWidth;
      const tCenter = qrsStart + params.qtc * 0.72;
      const tOnset = tCenter - params.qtc * 0.2;
      if (stShift !== 0) {
        waves.push({ kind: "st", lead, from: jPoint - 8, to: tOnset + 8, amp: stShift });
      }
      const tAmp = leadTAmp(params, lead);
      waves.push({ kind: "wave", lead, center: tCenter, sigma: Math.max(24, params.qtc * 0.16), amp: tAmp });
    }
  }
  return waves;
}

function scheduleBeats(params, durationSec, rng) {
  const beats = [];
  const push = (beat) => { if (beat.t < durationSec - 0.05) beats.push(beat); };
  const rrBase = 60 / params.rate;
  const rrSec = (rate) => 60 / rate;

  if (params.rhythm === "vf") return beats;

  if (params.rhythm === "chb") {
    for (let t = 0.2; t < durationSec; t += rrSec(params.pRate)) push({ t, hasP: true, hasQrs: false, pr: 0 });
    for (let t = 0.55; t < durationSec; t += rrSec(params.escapeRate)) push({ t, hasP: false, hasQrs: true, pr: 0 });
    return beats.sort((a, b) => a.t - b.t);
  }

  if (params.rhythm === "afib") {
    let t = 0.3;
    while (t < durationSec) {
      push({ t, hasP: false, hasQrs: true, pr: 0 });
      t += rrBase * (0.68 + rng() * 0.64);
    }
    return beats;
  }

  if (params.rhythm === "avblock") {
    if (params.avBlock === "1deg") {
      for (let t = 0.2; t < durationSec; t += rrBase) push({ t, hasP: true, hasQrs: true, pr: params.pr });
      return beats;
    }
    if (params.avBlock === "mobitz1") {
      const ladder = [160, 220, 280, 340, null];
      let i = 0;
      for (let t = 0.2; t < durationSec; t += rrBase, i += 1) {
        const pr = ladder[i % ladder.length];
        push({ t, hasP: true, hasQrs: pr !== null, pr: pr ?? 0 });
      }
      return beats;
    }
    let i = 0;
    for (let t = 0.2; t < durationSec; t += rrBase, i += 1) {
      const dropped = i % 3 === 2;
      push({ t, hasP: true, hasQrs: !dropped, pr: params.pr });
    }
    return beats;
  }

  const jitter = params.irregular ? () => 0.72 + rng() * 0.56 : () => 1;
  let t = 0.25;
  while (t < durationSec) {
    push({ t, hasP: params.pPresent !== false, hasQrs: true, pr: params.pr ?? 0 });
    t += rrBase * jitter();
  }
  return beats;
}

function baselineValue(t, params, phases) {
  if (params.rhythm === "vf") {
    const mod = 1 + 0.45 * Math.sin(2 * Math.PI * 0.37 * t + phases[3]);
    return mod * (0.16 * Math.sin(2 * Math.PI * 4.3 * t + phases[0]) + 0.13 * Math.sin(2 * Math.PI * 5.7 * t + phases[1]) + 0.08 * Math.sin(2 * Math.PI * 7.9 * t + phases[2]));
  }
  if (params.fibBaseline) {
    return 0.045 * Math.sin(2 * Math.PI * 6.2 * t + phases[0]) + 0.03 * Math.sin(2 * Math.PI * 8.7 * t + phases[1]);
  }
  return 0;
}

function flutterValue(t, lead, params) {
  const period = 0.2;
  const frac = (t % period) / period;
  const saw = 1 - 2 * frac;
  if (LEAD_AXIS[lead] !== undefined) {
    const sign = ["II", "III", "aVF"].includes(lead) ? -1 : 1;
    return sign * 0.16 * Math.abs(Math.cos(rad(params.qrsAxis - LEAD_AXIS[lead]))) * saw + 0.05 * saw;
  }
  return 0.04 * saw;
}

export function generateEcg(params, durationSec = 10, seed = 7) {
  const rng = makeRng(seed);
  const beats = scheduleBeats(params, durationSec, rng);
  const phases = [rng() * 6.28, rng() * 6.28, rng() * 6.28, rng() * 6.28];
  const n = Math.round(durationSec * FS);
  const samples = {};

  const prepared = beats.map((beat) => ({ beat, waves: buildBeatWaves(beat, params) }));
  const byLead = {};
  for (const lead of LEADS) {
    const items = [];
    for (const { beat, waves } of prepared) {
      for (const wave of waves) {
        if (wave.lead !== lead) continue;
        items.push({ t0: beat.t - 0.08, beat, wave });
      }
    }
    items.sort((a, b) => a.t0 - b.t0);
    byLead[lead] = items;
  }

  const WINDOW = 0.88;
  const noiseAmp = params.noise ?? 0.008;

  for (const lead of LEADS) {
    const arr = new Float32Array(n);
    const items = byLead[lead];
    let start = 0;
    for (let i = 0; i < n; i += 1) {
      const t = i / FS;
      let v = 0;
      if (params.rhythm === "vf") {
        v = baselineValue(t, params, phases);
      } else if (params.flutterWaves) {
        v = flutterValue(t, lead, params);
      } else if (params.fibBaseline) {
        v = baselineValue(t, params, phases);
      }
      while (start < items.length && items[start].t0 + WINDOW < t) start += 1;
      for (let j = start; j < items.length; j += 1) {
        const item = items[j];
        if (item.t0 > t) break;
        const local = (t - item.beat.t) * 1000;
        const wave = item.wave;
        if (wave.kind === "wave") {
          v += wave.amp * gauss(local, wave.center, wave.sigma);
        } else {
          v += wave.amp * smooth(local, wave.from, wave.from + 16) * (1 - smooth(local, wave.to, wave.to + 40));
        }
      }
      arr[i] = v + (rng() * 2 - 1) * noiseAmp;
    }
    samples[lead] = arr;
  }
  return { fs: FS, durationSec, leads: samples, beats, params };
}

export function sampleAt(gen, lead, tSec) {
  const arr = gen.leads[lead];
  if (!arr) return 0;
  const idx = Math.round(tSec * gen.fs);
  if (idx < 0 || idx >= arr.length) return 0;
  return arr[idx];
}
