import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import EcgLab from "@/components/hub/EcgLab";
import { generateEcg, makeRng, sampleAt, LEADS } from "@/lib/hub/ecg-rhythms.mjs";
import { analyzeEcg, computeAxis, ECG_REFERENCE, axisLabel } from "@/lib/hub/ecg-analysis.mjs";
import { ECG_CASES, ECG_CATEGORIES, getCaseById, casesByDifficulty } from "@/lib/hub/ecg-cases.mjs";
import { computeSheetLayout } from "@/lib/hub/ecg-paper.mjs";

const findCase = (id) => getCaseById(id).params;

describe("ECG waveform generator", () => {
  it("is deterministic for a given seed", () => {
    const a = generateEcg(findCase("nsr"), 4, 7);
    const b = generateEcg(findCase("nsr"), 4, 7);
    expect(Array.from(a.leads.II)).toEqual(Array.from(b.leads.II));
  });

  it("produces finite samples for every case and lead", () => {
    for (const entry of ECG_CASES) {
      const gen = generateEcg(entry.params, 4, 3);
      let nonFinite = 0;
      for (const lead of LEADS) {
        for (const value of gen.leads[lead]) {
          if (!Number.isFinite(value)) nonFinite += 1;
        }
      }
      expect(nonFinite).toBe(0);
    }
  });

  it("paces a regular rhythm at the requested rate", () => {
    const gen = generateEcg(findCase("nsr"), 10, 7);
    const qrsTimes = gen.beats.filter((beat) => beat.hasQrs).map((beat) => beat.t);
    expect(qrsTimes.length).toBeGreaterThanOrEqual(10);
    const rrs = qrsTimes.slice(1).map((t, i) => t - qrsTimes[i]);
    const mean = rrs.reduce((a, b) => a + b, 0) / rrs.length;
    expect(60 / mean).toBeCloseTo(75, 0);
  });

  it("keeps a P wave before each QRS in sinus rhythm and none in AFib", () => {
    const sinus = generateEcg(findCase("nsr"), 10, 7);
    expect(sinus.beats.every((beat) => beat.hasP && beat.hasQrs)).toBe(true);
    const afib = generateEcg(findCase("afib"), 10, 7);
    expect(afib.beats.every((beat) => !beat.hasP)).toBe(true);
    expect(afib.beats.some((beat) => beat.hasQrs)).toBe(true);
  });

  it("makes AFib irregularly irregular versus regular sinus", () => {
    const rrs = (gen) => {
      const times = gen.beats.filter((beat) => beat.hasQrs).map((beat) => beat.t);
      return times.slice(1).map((t, i) => t - times[i]);
    };
    const sinusSpread = Math.max(...rrs(generateEcg(findCase("nsr"), 10, 7))) - Math.min(...rrs(generateEcg(findCase("nsr"), 10, 7)));
    const afibSpread = Math.max(...rrs(generateEcg(findCase("afib"), 10, 7))) - Math.min(...rrs(generateEcg(findCase("afib"), 10, 7)));
    expect(afibSpread).toBeGreaterThan(sinusSpread * 3);
  });

  it("projects the QRS axis onto limb leads with correct polarities", () => {
    const gen = generateEcg(findCase("nsr"), 10, 7);
    const rPeak = gen.beats.find((beat) => beat.hasQrs).t + findCase("nsr").pr / 1000 + 0.03;
    expect(sampleAt(gen, "I", rPeak)).toBeGreaterThan(0.3);
    expect(sampleAt(gen, "aVR", rPeak)).toBeLessThan(-0.2);
    expect(sampleAt(gen, "II", rPeak)).toBeGreaterThan(sampleAt(gen, "III", rPeak));
  });

  it("renders RBBB with an R' in V1 and wide QRS", () => {
    const params = findCase("bbb-r");
    const gen = generateEcg(params, 10, 7);
    const beat = gen.beats.find((entry) => entry.hasQrs);
    const qrsStart = beat.t + beat.pr / 1000;
    const trough = sampleAt(gen, "V1", qrsStart + 0.08);
    const prime = sampleAt(gen, "V1", qrsStart + 0.11);
    expect(prime).toBeGreaterThan(0.2);
    expect(trough).toBeLessThan(prime);
    expect(params.qrsWidth).toBeGreaterThanOrEqual(120);
  });

  it("elevates the ST segment in anterior STEMI territory with inferior reciprocity", () => {
    const gen = generateEcg(findCase("stemi-ant"), 10, 7);
    const beat = gen.beats.find((entry) => entry.hasQrs);
    const jPoint = beat.t + beat.pr / 1000 + findCase("stemi-ant").qrsWidth / 1000 + 0.02;
    expect(sampleAt(gen, "V3", jPoint)).toBeGreaterThan(0.15);
    expect(sampleAt(gen, "II", jPoint)).toBeLessThan(sampleAt(gen, "V3", jPoint) - 0.2);
  });

  it("drops QRS complexes in Mobitz II with constant PR", () => {
    const gen = generateEcg(findCase("mobitz2"), 10, 7);
    const pBeats = gen.beats.filter((beat) => beat.hasP);
    const conducted = gen.beats.filter((beat) => beat.hasQrs);
    expect(conducted.length).toBeLessThan(pBeats.length);
    expect(conducted.every((beat) => beat.pr === findCase("mobitz2").pr)).toBe(true);
  });

  it("paces Mobitz I with progressive PR before a dropped beat", () => {
    const gen = generateEcg(findCase("mobitz1"), 10, 7);
    const prs = gen.beats.map((beat) => beat.pr);
    expect(prs).toEqual(expect.arrayContaining([160, 220, 280, 340]));
    expect(gen.beats.some((beat) => beat.hasP && !beat.hasQrs)).toBe(true);
  });

  it("dissociates atrial and ventricular activity in complete heart block", () => {
    const gen = generateEcg(findCase("avb3"), 10, 7);
    const pBeats = gen.beats.filter((beat) => beat.hasP);
    const qrsBeats = gen.beats.filter((beat) => beat.hasQrs);
    expect(pBeats.every((beat) => !beat.hasQrs)).toBe(true);
    expect(qrsBeats.every((beat) => !beat.hasP)).toBe(true);
    const pInterval = pBeats[1].t - pBeats[0].t;
    const qrsInterval = qrsBeats[1].t - qrsBeats[0].t;
    expect(60 / pInterval).toBeCloseTo(90, 0);
    expect(60 / qrsInterval).toBeCloseTo(40, 0);
  });

  it("produces no organised beats in ventricular fibrillation", () => {
    const gen = generateEcg(findCase("vf"), 10, 7);
    expect(gen.beats.filter((beat) => beat.hasQrs).length).toBe(0);
    let peak = 0;
    for (let t = 0; t < 5; t += 0.004) peak = Math.max(peak, Math.abs(sampleAt(gen, "II", t)));
    expect(peak).toBeGreaterThan(0.1);
    expect(peak).toBeLessThan(0.6);
  });

  it("adds sawtooth flutter waves near 300 per minute in lead II", () => {
    const gen = generateEcg(findCase("flutter"), 10, 7);
    const t0 = 1.05;
    const v1 = sampleAt(gen, "II", t0);
    const v2 = sampleAt(gen, "II", t0 + 0.1);
    expect(Math.abs(v1 - v2)).toBeGreaterThan(0.05);
  });

  it("seeds the random generator reproducibly", () => {
    const rngA = makeRng(42);
    const rngB = makeRng(42);
    expect(rngA()).toBe(rngB());
  });
});

describe("ECG analysis", () => {
  it("measures the rate from generated RR intervals", () => {
    const gen = generateEcg(findCase("bradycardia"), 10, 7);
    const analysis = analyzeEcg(gen, getCaseById("bradycardia"));
    expect(analysis.rate).toBe(45);
    expect(analysis.irregular).toBe(false);
  });

  it("flags AFib as irregular", () => {
    const gen = generateEcg(findCase("afib"), 10, 7);
    const analysis = analyzeEcg(gen, getCaseById("afib"));
    expect(analysis.irregular).toBe(true);
  });

  it("computes a normal axis for NSR and left deviation for LBBB", () => {
    const normal = computeAxis(generateEcg(findCase("nsr"), 10, 7));
    expect(normal).toBeGreaterThanOrEqual(-30);
    expect(normal).toBeLessThanOrEqual(90);
    const lbbb = computeAxis(generateEcg(findCase("bbb-l"), 10, 7));
    expect(lbbb).toBeLessThan(-30);
  });

  it("applies Bazett QTc scaling", () => {
    const params = findCase("nsr");
    const gen = generateEcg(params, 10, 7);
    const analysis = analyzeEcg(gen, getCaseById("nsr"));
    const rrSec = 60 / analysis.rate;
    const expectedQt = Math.round(params.qtc * Math.sqrt(rrSec));
    expect(analysis.fields.find((field) => field.key === "qt").value).toBe(`${expectedQt} / ${params.qtc} ms`);
  });

  it("marks abnormal fields and keeps normal values clean", () => {
    const gen = generateEcg(findCase("nsr"), 10, 7);
    const analysis = analyzeEcg(gen, getCaseById("nsr"));
    const prField = analysis.fields.find((field) => field.key === "pr");
    expect(prField.abnormal).toBe(false);
    const stemi = analyzeEcg(generateEcg(findCase("stemi-ant"), 10, 7), getCaseById("stemi-ant"));
    expect(stemi.fields.find((field) => field.key === "st").abnormal).toBe(true);
  });

  it("classifies axis deviation labels", () => {
    expect(axisLabel(40)).toBe("Normal axis");
    expect(axisLabel(-60)).toBe("Left axis deviation");
    expect(axisLabel(120)).toBe("Right axis deviation");
  });

  it("exposes standard reference ranges", () => {
    expect(ECG_REFERENCE.rate).toEqual([60, 100, "60–100 bpm"]);
    expect(ECG_REFERENCE.pr[0]).toBe(120);
    expect(ECG_REFERENCE.qrs[1]).toBe(120);
  });
});

describe("ECG case library", () => {
  it("has unique ids with valid categories and difficulties", () => {
    const ids = ECG_CASES.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const entry of ECG_CASES) {
      expect(ECG_CATEGORIES).toContain(entry.category);
      expect([1, 2, 3]).toContain(entry.difficulty);
      expect(entry.distractors.length).toBeGreaterThanOrEqual(3);
      for (const distractor of entry.distractors) {
        expect(getCaseById(distractor)).not.toBeNull();
      }
    }
  });

  it("filters by difficulty", () => {
    expect(casesByDifficulty("all").length).toBe(ECG_CASES.length);
    expect(casesByDifficulty(3).every((entry) => entry.difficulty === 3)).toBe(true);
  });
});

describe("ECG sheet layout", () => {
  it("scales paper speed and gain into pixels", () => {
    const base = computeSheetLayout({ width: 1200, height: 700, paperSpeed: 25, gain: 10, zoom: 1 });
    expect(base.pxPerSec).toBe(125);
    expect(base.mvToPx(1)).toBeCloseTo(50, 5);
    const fast = computeSheetLayout({ width: 1200, height: 700, paperSpeed: 50, gain: 10, zoom: 1 });
    expect(fast.pxPerSec).toBe(250);
    expect(fast.cellSeconds).toBeCloseTo(base.cellSeconds / 2, 5);
    const zoomed = computeSheetLayout({ width: 1200, height: 700, paperSpeed: 25, gain: 10, zoom: 2 });
    expect(zoomed.pxPerSec).toBe(250);
    expect(zoomed.mvToPx(1)).toBeCloseTo(100, 5);
  });
});

describe("ECG Lab interface", () => {
  it("renders learn mode with the synthetic disclaimer and case library", () => {
    render(<EcgLab />);
    expect(screen.getByRole("img", { name: "Synthetic 12-lead ECG printout" })).toBeInTheDocument();
    expect(screen.getByText(/SYNTHETIC EDUCATIONAL ECG — WAVEFORMS ARE GENERATED/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Normal sinus rhythm/ })).toBeInTheDocument();
    expect(screen.getByText(/Heart rate/)).toBeInTheDocument();
  });

  it("switches paper speed and gain controls", () => {
    render(<EcgLab />);
    fireEvent.click(screen.getByRole("button", { name: "50 MM/S" }));
    expect(screen.getByRole("button", { name: "50 MM/S" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "20 MM/MV" }));
    expect(screen.getByRole("button", { name: "20 MM/MV" })).toHaveAttribute("aria-pressed", "true");
  });

  it("runs a quiz round with evaluation and explanation", () => {
    render(<EcgLab />);
    fireEvent.click(screen.getByRole("button", { name: "QUIZ" }));
    const options = screen.getByRole("group", { name: "Diagnosis options" });
    const buttons = within(options).getAllByRole("button");
    fireEvent.click(buttons[0]);
    expect(screen.getByText(/CORRECT|INCORRECT/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /NEXT/ })).toBeInTheDocument();
  });

  it("shows the mistake review tab", () => {
    window.localStorage.clear();
    render(<EcgLab />);
    fireEvent.click(screen.getByRole("button", { name: /REVIEW/ }));
    expect(screen.getByText(/No recorded mistakes yet/i)).toBeInTheDocument();
  });
});
