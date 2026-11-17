import { generateEcg, makeRng, sampleAt } from "./ecg-rhythms.mjs";

// Paper facts at 25 mm/s: 1 small box = 1 mm = 0.04 s, 1 big box = 5 mm = 0.2 s.
export const RATE_PAPER_SPEED = 25;
export const SMALL_BOX_SEC = 0.04;
export const BIG_BOX_SEC = 0.2;
export const RATE_METHODS = ["all", "big", "small"];

const BIG_RANGE = [2, 8]; // RR in whole big boxes: 150 ... 37.5 bpm
const SMALL_RANGE = [15, 50]; // RR in small boxes: 100 ... 30 bpm

const pick = (rng, [min, max]) => min + Math.floor(rng() * (max - min + 1));

function distractorRates(correct, candidates) {
  const out = [];
  for (const value of candidates) {
    const rounded = Math.round(value);
    if (rounded < 20 || rounded > 300 || rounded === correct || out.includes(rounded)) continue;
    out.push(rounded);
    if (out.length === 3) break;
  }
  return out;
}

function shuffle(list, rng) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * One heart-rate question. "big": RR is a whole number of big boxes, rate = 300 / boxes.
 * "small": RR is a count of small boxes, rate = 1500 / boxes.
 */
export function buildRateQuestion(seed, method = "all") {
  const rng = makeRng(seed * 7919 + 13);
  const used = method === "all" ? (rng() < 0.5 ? "big" : "small") : method;
  const boxes = used === "big" ? pick(rng, BIG_RANGE) : pick(rng, SMALL_RANGE);
  const unit = used === "big" ? 300 : 1500;
  const rrSec = boxes * (used === "big" ? BIG_BOX_SEC : SMALL_BOX_SEC);
  const rate = Math.round(unit / boxes);

  const nearby = [];
  for (let step = 1; step <= 20; step += 1) nearby.push(unit / (boxes + (used === "big" ? step : step * 4)), unit / (boxes - (used === "big" ? step : step * 4)));
  const wrong = distractorRates(rate, nearby.filter((value) => Number.isFinite(value) && value > 0));
  const options = shuffle([rate, ...wrong], rng);

  const explanation = used === "big"
    ? `R–R = ${boxes} big boxes (${boxes} × 5 mm = ${rrSec.toFixed(1)} s). Rate = 300 ÷ ${boxes} = ${rate} bpm.`
    : `R–R = ${boxes} small boxes (${boxes} × 1 mm = ${rrSec.toFixed(2)} s). Rate = 1500 ÷ ${boxes} = ${rate} bpm.`;
  return { method: used, boxes, rrSec, rate, options, explanation, exactRate: 60 / rrSec };
}

/** Builds the strip for a question. R1 sits on a bold grid line two big boxes from the left edge. */
export function generateRateStrip(question, seed = 5) {
  const params = {
    rhythm: "sinus", rate: question.exactRate, pr: question.exactRate > 110 ? 130 : 160, qrsWidth: 90, qtc: 400,
    qrsAxis: 40, pAxis: 50, tAxis: 45, pAmp: 0.15, pWidth: 85, tAmp: 0.3,
  };
  const gen = generateEcg(params, 10, seed);
  const beat = gen.beats.find((entry) => entry.hasQrs);
  const from = beat.t + (params.pr - 20) / 1000;
  let r1Sec = from;
  let best = -Infinity;
  for (let t = from; t < from + 0.14; t += 1 / gen.fs) {
    const value = sampleAt(gen, "II", t);
    if (value > best) { best = value; r1Sec = t; }
  }
  const startSec = r1Sec - 2 * BIG_BOX_SEC;
  return { gen, startSec, r1Sec, r2Sec: r1Sec + question.rrSec };
}
