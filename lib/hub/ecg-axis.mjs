import { makeRng } from "./ecg-rhythms.mjs";
import { axisClass } from "./ecg-steps.mjs";

export const LIMB_AXES = Object.freeze({ I: 0, II: 60, III: 120, aVR: -150, aVL: -30, aVF: 90 });
export const LIMB_LEADS = ["I", "II", "III", "aVR", "aVL", "aVF"];

export const AXIS_CATEGORIES = [
  { id: "normal", label: "Normal axis", range: "−30° to +90°" },
  { id: "lad", label: "Left axis deviation", range: "−30° to −90°" },
  { id: "rad", label: "Right axis deviation", range: "+90° to +180°" },
  { id: "extreme", label: "Extreme axis", range: "−90° to −180°" },
];

export const normalizeAngle = (deg) => ((((Math.round(deg) + 180) % 360) + 360) % 360) - 180;

export const axisCategory = (deg) => axisClass(normalizeAngle(deg));

/** Net QRS deflection (−1…1) a vector at `deg` produces in a limb lead: the projection onto the lead axis. */
export const leadDeflection = (deg, lead) => Math.cos(((deg - LIMB_AXES[lead]) * Math.PI) / 180);

export const polarity = (value) => (value > 0.12 ? "+" : value < -0.12 ? "−" : "±");

/** The lead I / aVF shortcut, with the lead II tie-break, in words. */
export function axisRule(deg) {
  const i = leadDeflection(deg, "I");
  const avf = leadDeflection(deg, "aVF");
  const ii = leadDeflection(deg, "II");
  const sign = (v) => (v > 0 ? "positive" : "negative");
  if (i > 0 && avf > 0) return `Lead I ${sign(i)} and aVF ${sign(avf)}: the vector points down and left, so the axis is normal.`;
  if (i > 0 && avf <= 0) return ii > 0
    ? `Lead I positive, aVF negative, but lead II still positive: the axis is between 0° and −30°, still normal.`
    : `Lead I positive, aVF negative and lead II negative: the vector points up and left, so left axis deviation.`;
  if (i <= 0 && avf > 0) return `Lead I negative, aVF positive: the vector points down and right, so right axis deviation.`;
  return `Lead I and aVF both negative: the vector points up and right ("no man's land"), so extreme axis.`;
}

const RANGES = { normal: [-18, 78], lad: [-78, -42], rad: [102, 168], extreme: [-168, -102] };

/** An axis question with a margin from every boundary so the answer is unambiguous. */
export function buildAxisQuestion(seed) {
  const rng = makeRng(seed * 104729 + 17);
  const ids = AXIS_CATEGORIES.map((entry) => entry.id);
  const category = ids[Math.floor(rng() * ids.length)];
  const [min, max] = RANGES[category];
  const angle = min + Math.floor(rng() * (max - min + 1));
  return { angle, category, rule: axisRule(angle) };
}
