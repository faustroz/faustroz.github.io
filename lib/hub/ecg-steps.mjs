import { analyzeEcg } from "./ecg-analysis.mjs";

// Systematic reading: rate, rhythm, P waves, axis, PR, QRS, ST–T. Each step has one right answer
// derived from the generated trace, so the learner commits to findings before naming the diagnosis.

const opt = (id, label) => ({ id, label });

export function axisClass(deg) {
  if (deg === null || deg === undefined) return "cant";
  if (deg >= -30 && deg <= 90) return "normal";
  if (deg < -30 && deg >= -90) return "lad";
  if (deg > 90 && deg <= 180) return "rad";
  return "extreme";
}

function rateClass(rate) {
  if (rate === null) return "cant";
  return rate < 60 ? "slow" : rate > 100 ? "fast" : "normal";
}

function rhythmClass(p) {
  if (p.rhythm === "vf") return "chaotic";
  if (p.rhythm === "afib" || p.irregular) return "irregular";
  if (p.rhythm === "avblock" && p.avBlock !== "1deg") return "patterned";
  return "regular";
}

function pClass(p) {
  if (p.rhythm === "vf") return "absent";
  if (p.rhythm === "chb") return "dissociated";
  if (p.rhythm === "avblock" && p.avBlock !== "1deg") return "extra";
  if (p.pPresent === false || p.rhythm === "afib") return "absent";
  return "each";
}

function prClass(p) {
  if (p.rhythm === "vf" || p.rhythm === "chb" || p.rhythm === "afib" || p.pPresent === false) return "varies";
  if (p.rhythm === "avblock" && p.avBlock === "mobitz1") return "varies";
  return p.pr < 120 ? "short" : p.pr > 200 ? "long" : "normal";
}

function qrsClass(p) {
  if (p.rhythm === "vf") return "cant";
  return p.qrsWidth >= 120 ? "wide" : "narrow";
}

function stClass(p) {
  if (p.rhythm === "vf" || (p.qrsWidth >= 120 && !p.bbb)) return "cant";
  if (p.bbb) return "secondary";
  if (p.stemi) return "elevation";
  return "normal";
}

export function buildSystematicSteps(gen, caseDef) {
  const p = gen.params;
  const analysis = analyzeEcg(gen, caseDef);
  const rate = rateClass(analysis.rate);
  const rhythm = rhythmClass(p);
  const pw = pClass(p);
  const axis = axisClass(analysis.axisDeg);
  const pr = prClass(p);
  const qrs = qrsClass(p);
  const st = stClass(p);

  const rateText = analysis.rate === null ? "There are no organised QRS complexes to count."
    : `Rate ≈ ${analysis.rate} bpm${p.rhythm === "chb" ? " (ventricular, the escape rhythm)" : ""}.`;
  const reasons = {
    rate: { slow: "Below 60: bradycardia.", normal: "60–100: normal.", fast: "Above 100: tachycardia.", cant: rateText },
    rhythm: {
      regular: "R–R intervals are equal.",
      irregular: "R–R intervals vary with no pattern: irregularly irregular.",
      patterned: "Beats are dropped in a repeating pattern, so the R–R gaps are irregular but predictable.",
      chaotic: "There is no organised activity at all.",
    },
    p: {
      each: "One upright P before every QRS: the atria drive the ventricles.",
      absent: "No true P waves: the atria are not depolarising in an organised way (or the P is buried).",
      dissociated: "P waves march at their own rate, unrelated to the QRS: atria and ventricles are dissociated.",
      extra: "Some P waves are not followed by a QRS: more P than QRS means blocked beats.",
    },
    axis: {
      normal: "−30° to +90°: lead I and aVF are both positive (or II positive).",
      lad: "Between −30° and −90°: lead I positive, aVF and II negative.",
      rad: "Between +90° and +180°: lead I negative, aVF positive.",
      extreme: "Between −90° and −180°: lead I and aVF are both negative.",
      cant: "Without organised QRS complexes there is no axis.",
    },
    pr: {
      short: `PR ${p.pr} ms is under 120: the AV node delay is bypassed.`,
      normal: `PR ${p.pr} ms is within 120–200.`,
      long: `PR ${p.pr} ms is over 200: the AV node is delaying every beat (first-degree block).`,
      varies: p.rhythm === "avblock" ? "PR is not constant: it lengthens beat by beat until a P drops." : "There is no P–QRS relationship to measure a PR from.",
    },
    qrs: {
      narrow: `QRS ${p.qrsWidth} ms is under 120: normal His–Purkinje conduction.`,
      wide: `QRS ${p.qrsWidth} ms is 120 or more: slow ventricular conduction (bundle block or ventricular origin).`,
      cant: "There is no QRS to measure.",
    },
    st: {
      normal: "ST segments are isoelectric and T waves follow the QRS direction.",
      elevation: "ST is raised in a territory with reciprocal depression elsewhere: injury current.",
      secondary: "A wide QRS from a bundle block brings expected secondary (discordant) ST–T changes.",
      cant: "ST–T cannot be separated from the QRS here.",
    },
  };

  return [
    { id: "rate", title: "RATE", prompt: "What is the rate?", hint: "300 ÷ big boxes between R waves, or QRS complexes in 10 s × 6.", options: [opt("slow", "Slow (< 60)"), opt("normal", "Normal (60–100)"), opt("fast", "Fast (> 100)"), opt("cant", "Cannot count")], correct: rate, explain: `${reasons.rate[rate]}${rate === "cant" ? "" : ` ${rateText}`}` },
    { id: "rhythm", title: "RHYTHM", prompt: "How regular is the ventricular rhythm?", hint: "Compare the R–R gaps along the rhythm strip.", options: [opt("regular", "Regular"), opt("irregular", "Irregularly irregular"), opt("patterned", "Regularly irregular (pattern)"), opt("chaotic", "Chaotic / no QRS")], correct: rhythm, explain: reasons.rhythm[rhythm] },
    { id: "p", title: "P WAVES", prompt: "What are the P waves doing?", hint: "Look in lead II and V1. Is there one before every QRS?", options: [opt("each", "One before every QRS"), opt("absent", "Absent / not visible"), opt("dissociated", "Present but unrelated to QRS"), opt("extra", "More P than QRS")], correct: pw, explain: reasons.p[pw] },
    { id: "axis", title: "AXIS", prompt: "What is the QRS axis?", hint: "Net deflection in lead I and aVF. Check II if I is positive and aVF negative.", options: [opt("normal", "Normal"), opt("lad", "Left axis deviation"), opt("rad", "Right axis deviation"), opt("extreme", "Extreme axis"), opt("cant", "Cannot measure")], correct: axis, explain: `${reasons.axis[axis]}${analysis.axisDeg === null ? "" : ` Measured ≈ ${analysis.axisDeg}°.`}` },
    { id: "pr", title: "PR INTERVAL", prompt: "What is the PR interval?", hint: "P onset to QRS onset: 3–5 small boxes (120–200 ms) is normal.", options: [opt("short", "Short (< 120 ms)"), opt("normal", "Normal (120–200 ms)"), opt("long", "Long (> 200 ms)"), opt("varies", "Varies / cannot measure")], correct: pr, explain: reasons.pr[pr] },
    { id: "qrs", title: "QRS WIDTH", prompt: "How wide is the QRS?", hint: "Under 3 small boxes (120 ms) is narrow.", options: [opt("narrow", "Narrow (< 120 ms)"), opt("wide", "Wide (≥ 120 ms)"), opt("cant", "Cannot measure")], correct: qrs, explain: reasons.qrs[qrs] },
    { id: "st", title: "ST–T", prompt: "What do the ST segments and T waves show?", hint: "Compare each ST segment with the baseline between T and the next P.", options: [opt("normal", "Normal"), opt("elevation", "ST elevation"), opt("secondary", "Secondary (discordant) changes"), opt("cant", "Cannot assess")], correct: st, explain: reasons.st[st] },
  ];
}
