import assert from "node:assert/strict";
import test from "node:test";
import { generateEcg } from "../../lib/hub/ecg-rhythms.mjs";
import { ECG_CASES } from "../../lib/hub/ecg-cases.mjs";
import {
  beatAtTime, classifyMechanism, explainMechanism, heartState, MECHANISM_PRESETS, mechanismParams, mechanismState,
} from "../../lib/hub/ecg-mechanism.mjs";
import { axisClass, buildSystematicSteps } from "../../lib/hub/ecg-steps.mjs";
import { axisCategory, axisRule, buildAxisQuestion, leadDeflection, normalizeAngle } from "../../lib/hub/ecg-axis.mjs";

test("mechanism params map physiology knobs onto the generator", () => {
  const p = mechanismParams({ conduction: "mobitz2", bundle: "RBBB", st: "anterior", pr: 210, axis: -20 });
  assert.equal(p.rhythm, "avblock");
  assert.equal(p.avBlock, "mobitz2");
  assert.equal(p.bbb, "RBBB");
  assert.deepEqual(p.stemi, { territory: "anterior" });
  assert.equal(p.pr, 210);
  assert.equal(p.qrsAxis, -20);
  assert.equal(mechanismParams({}).rhythm, "sinus");
});

test("every preset generates a finite trace and names itself sensibly", () => {
  const expected = { normal: /normal sinus/i, avb1: /first-degree/i, wenckebach: /wenckebach/i, mobitz2: /mobitz II/i, rbbb: /right bundle/i, lbbb: /left bundle/i, tachy: /tachycardia/i, brady: /bradycardia/i, longqt: /normal sinus/i, stemi: /anterior stemi/i };
  for (const preset of MECHANISM_PRESETS) {
    const gen = generateEcg(mechanismParams(preset.state), 4, 7);
    assert.ok(gen.leads.II.every(Number.isFinite), preset.id);
    assert.match(classifyMechanism(preset.state).label, expected[preset.id], preset.id);
  }
  assert.deepEqual(classifyMechanism({ qtc: 500 }).extras, ["long QT"]);
});

test("explanations flag exactly the knobs that are abnormal", () => {
  const abnormal = (state) => explainMechanism(state).filter((line) => line.abnormal).map((line) => line.key);
  assert.deepEqual(abnormal({}), []);
  assert.deepEqual(abnormal({ pr: 300 }), ["pr"]);
  assert.deepEqual(abnormal({ rate: 130 }), ["rate"]);
  assert.deepEqual(abnormal({ bundle: "LBBB", qrsWidth: 145, axis: -35 }).sort(), ["axis", "qrs"].sort());
  assert.deepEqual(abnormal({ st: "inferior" }), ["st"]);
});

test("heart state follows the impulse: atria, AV delay, ventricles, repolarisation", () => {
  const s = mechanismState({});
  const beat = { pr: 160, hasQrs: true };
  assert.equal(heartState(s, beat, 10).stage, "sa");
  assert.equal(heartState(s, beat, 60).stage, "atria");
  assert.equal(heartState(s, beat, 120).stage, "av");
  assert.equal(heartState(s, beat, 180).stage, "purkinje");
  assert.ok(heartState(s, beat, 180).rv && heartState(s, beat, 180).lv);
  assert.equal(heartState(s, beat, 300).stage, "repol");
  assert.equal(heartState(s, beat, 700).stage, "rest");
  // a dropped beat stalls at the AV node
  assert.equal(heartState(s, { pr: 0, hasQrs: false }, 150).stage, "blocked");
  // the blocked bundle's ventricle only fires in the second half of a wide QRS
  const lbbb = mechanismState({ bundle: "LBBB", qrsWidth: 140 });
  assert.equal(heartState(lbbb, beat, 165).lv, false);
  assert.equal(heartState(lbbb, beat, 165).rv, true);
  assert.equal(heartState(lbbb, beat, 160 + 100).lv, true);
});

test("beatAtTime picks the latest beat that already started", () => {
  const gen = generateEcg(mechanismParams({ rate: 60 }), 4, 7);
  assert.equal(beatAtTime(gen, 0.1).beat, null);
  const { beat, tMs } = beatAtTime(gen, gen.beats[1].t + 0.12);
  assert.equal(beat, gen.beats[1]);
  assert.ok(Math.abs(tMs - 120) < 1e-6);
});

test("systematic steps: every case has one valid answer per step and the right measured facts", () => {
  for (const caseDef of ECG_CASES) {
    const gen = generateEcg(caseDef.params, 10, 11);
    const steps = buildSystematicSteps(gen, caseDef);
    assert.deepEqual(steps.map((step) => step.id), ["rate", "rhythm", "p", "axis", "pr", "qrs", "st"], caseDef.id);
    for (const step of steps) {
      assert.ok(step.options.some((option) => option.id === step.correct), `${caseDef.id}/${step.id}`);
      assert.equal(new Set(step.options.map((option) => option.id)).size, step.options.length);
      assert.ok(step.explain.length > 10);
    }
  }
  const answer = (id, step) => buildSystematicSteps(generateEcg(ECG_CASES.find((entry) => entry.id === id).params, 10, 11), ECG_CASES.find((entry) => entry.id === id)).find((s) => s.id === step).correct;
  assert.equal(answer("nsr", "rate"), "normal");
  assert.equal(answer("bradycardia", "rate"), "slow");
  assert.equal(answer("tachycardia", "rate"), "fast");
  assert.equal(answer("afib", "rhythm"), "irregular");
  assert.equal(answer("mobitz1", "rhythm"), "patterned");
  assert.equal(answer("avb3", "p"), "dissociated");
  assert.equal(answer("avb1", "pr"), "long");
  assert.equal(answer("bbb-r", "qrs"), "wide");
  assert.equal(answer("bbb-l", "axis"), "lad");
  assert.equal(answer("stemi-ant", "st"), "elevation");
  assert.equal(answer("vf", "rate"), "cant");
});

test("axis classes follow the standard boundaries", () => {
  assert.equal(axisClass(-30), "normal");
  assert.equal(axisClass(90), "normal");
  assert.equal(axisClass(-31), "lad");
  assert.equal(axisClass(-90), "lad");
  assert.equal(axisClass(91), "rad");
  assert.equal(axisClass(-91), "extreme");
  assert.equal(axisClass(null), "cant");
  assert.equal(normalizeAngle(190), -170);
  assert.equal(normalizeAngle(-181), 179);
});

test("limb lead projection and the lead I / aVF rule agree with the category for every angle", () => {
  assert.ok(Math.abs(leadDeflection(0, "I") - 1) < 1e-12);
  assert.ok(Math.abs(leadDeflection(90, "I")) < 1e-12);
  assert.ok(leadDeflection(60, "II") > 0.99);
  const keyword = { normal: /normal/, lad: /left axis/, rad: /right axis/, extreme: /extreme/ };
  for (let angle = -179; angle <= 180; angle += 1) {
    if ([-90, -30, 0, 90, 150, 180].some((edge) => Math.abs(angle - edge) < 1)) continue;
    assert.match(axisRule(angle), keyword[axisCategory(angle)], `angle ${angle}`);
  }
});

test("axis questions sit well inside their category and the trace agrees", () => {
  for (let seed = 1; seed <= 200; seed += 1) {
    const q = buildAxisQuestion(seed);
    assert.equal(axisCategory(q.angle), q.category, `seed ${seed}`);
  }
  const q = buildAxisQuestion(3);
  const gen = generateEcg(mechanismParams({ axis: q.angle }), 4, 7);
  assert.ok(gen.leads.I.every(Number.isFinite));
});
