"use client";

import { useState } from "react";
import CrudPanel from "@/components/hub/CrudPanel";
import { calculateOspeScore, GRADE_POINTS } from "@/lib/hub/academic.mjs";
import { ACADEMIC_CHANNELS } from "@/lib/hub/module-config.mjs";

const guide = [["75–100", "A", "4"], ["70–74", "B+", "3.5"], ["66–69", "B", "3"], ["60–65", "C+", "2.5"], ["55–59", "C", "2"], ["40–54", "D", "1"], ["0–39", "E", "0"]];
const weights = [["Blok 3–19, 23–25, 27–28", "OSPE 20 · OSCE 20 · SOCA 20 · MP 30 · Perilaku 10"], ["Blok 1", "SOCA 40 · MP 50 · Perilaku 10"], ["Blok 2", "OSPE 20 · SOCA 30 · MP 40 · Perilaku 10"], ["Blok 20", "OSPE 40 · MP 50 · Perilaku 10"], ["Blok 21 & 22", "OSPE 25 · SOCA 25 · MP 40 · Perilaku 10"], ["Blok 26", "OSCE 25 · SOCA 25 · MP 40 · Perilaku 10"]];

const asScore = (value) => value === "" ? null : Number(value);
const formatScore = (value) => Number.isFinite(value) ? value.toFixed(2) : "—";

function OspeCalculator() {
  const [pretest, setPretest] = useState("");
  const [exam, setExam] = useState("");
  const result = calculateOspeScore(asScore(pretest), asScore(exam));

  return <section className="hub-ospe-calculator" aria-labelledby="ospe-calculator-title">
    <header><div><span>OSPE CALCULATOR</span><h2 id="ospe-calculator-title">Target KKM 55.</h2><p>Pretest berbobot 30% dan Ujian OSPE berbobot 70%.</p></div><b>30 / 70</b></header>
    <div className="hub-ospe-inputs">
      <label><span>Nilai Pretest</span><input type="number" inputMode="decimal" min="0" max="100" step="0.01" value={pretest} onChange={(event) => setPretest(event.target.value)} placeholder="0–100" /></label>
      <label><span>Nilai Ujian OSPE <small>opsional</small></span><input type="number" inputMode="decimal" min="0" max="100" step="0.01" value={exam} onChange={(event) => setExam(event.target.value)} placeholder="0–100" /></label>
    </div>
    {!result ? <p className="hub-ospe-empty">Masukkan nilai Pretest antara 0–100 untuk menghitung target.</p> : <div className="hub-ospe-results" aria-live="polite">
      <dl><div><dt>Kontribusi Pretest</dt><dd>{formatScore(result.pretestContribution)}</dd></div><div><dt>KKM</dt><dd>55.00</dd></div></dl>
      {result.alreadyMeetsMinimum ? <p className="hub-ospe-status is-pass">Nilai minimum sudah terpenuhi berdasarkan komponen Pretest.</p> : !result.canReachPassingScore ? <p className="hub-ospe-status is-danger">KKM tidak dapat dicapai meskipun nilai Ujian OSPE 100.</p> : <p className="hub-ospe-status">Nilai minimum Ujian OSPE: <b>{formatScore(result.minimumExam)}</b></p>}
      {result.finalScore !== null && <dl className="hub-ospe-final"><div><dt>Nilai Akhir</dt><dd>{formatScore(result.finalScore)}</dd></div><div><dt>Status</dt><dd className={result.passed ? "is-pass" : "is-danger"}>{result.passed ? "Lulus" : "Tidak Lulus"}</dd></div></dl>}
    </div>}
  </section>;
}

export default function AcademicPanel() {
  const [records, setRecords] = useState([]);
  const [mkuRecords, setMkuRecords] = useState([]);
  const [recordType, setRecordType] = useState("medical");
  const allRecords = [...records, ...mkuRecords];
  const credits = allRecords.reduce((sum, row) => sum + Number(row.credits || 0), 0);
  const ipk = credits ? allRecords.reduce((sum, row) => sum + Number(row.credits || 0) * (GRADE_POINTS[row.grade] ?? 0), 0) / credits : 0;
  const bySemester = [...new Set(allRecords.map((row) => row.semester))].map((semester) => {
    const rows = allRecords.filter((row) => row.semester === semester);
    const total = rows.reduce((sum, row) => sum + Number(row.credits || 0), 0);
    return { semester, ip: total ? rows.reduce((sum, row) => sum + Number(row.credits || 0) * (GRADE_POINTS[row.grade] ?? 0), 0) / total : 0 };
  });
  return <>
    <section className="hub-academic-summary"><article><span>IPK / CUMULATIVE</span><strong>{ipk.toFixed(2)}</strong></article><article><span>SKS / CREDITS</span><strong>{credits}</strong></article><article><span>SEMESTERS</span><strong>{bySemester.length}</strong></article>{bySemester.map((item) => <article key={item.semester}><span>IP {item.semester}</span><strong>{item.ip.toFixed(2)}</strong></article>)}</section>
    <section className="hub-academic-record-type" aria-label="Academic record type">
      <div><span>RECORD TYPE</span><p>IPK dan IP per semester menghitung nilai blok serta MKU bersama-sama.</p></div>
      <div role="tablist" aria-label="Academic record options"><button type="button" role="tab" aria-selected={recordType === "medical"} className={recordType === "medical" ? "is-active" : undefined} onClick={() => setRecordType("medical")}>BLOK KEDOKTERAN</button><button type="button" role="tab" aria-selected={recordType === "mku"} className={recordType === "mku" ? "is-active" : undefined} onClick={() => setRecordType("mku")}>MATA KULIAH UMUM</button></div>
    </section>
    {recordType === "medical" && <><section className="hub-academic-guide"><header><span>BLOCK GRADING / AUTOMATIC</span><p>Enter each applicable component score (0–100). The selected block determines its weighting and calculates the final score, grade, IP, and IPK.</p></header><div>{guide.map(([range, grade, point]) => <span key={grade}>{range} <b>{grade}</b> / {point}</span>)}</div><ul>{weights.map(([block, distribution]) => <li key={block}><b>{block}</b><span>{distribution}</span></li>)}</ul></section><OspeCalculator /></>}
    <div hidden={recordType !== "medical"}><CrudPanel {...ACADEMIC_CHANNELS[0]} onRecordsChange={setRecords} /></div>
    <div hidden={recordType !== "mku"}><CrudPanel {...ACADEMIC_CHANNELS[1]} onRecordsChange={setMkuRecords} /></div>
  </>;
}
