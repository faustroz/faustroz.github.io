"use client";

import { useState } from "react";
import CrudPanel from "@/components/hub/CrudPanel";
import QuestionLibrary from "@/components/hub/QuestionLibrary";
import { calculateAcademicTarget, calculateOspeScore, GRADE_POINTS } from "@/lib/hub/academic.mjs";
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

function AcademicTargetCalculator({ records }) {
  const semesters = [...new Set(records.map((record) => String(record.semester || "").trim()).filter(Boolean))].sort((left, right) => left.localeCompare(right, undefined, { numeric: true }));
  const [selectedSemester, setSelectedSemester] = useState("");
  const [targetIp, setTargetIp] = useState("3.50");
  const [remainingCredits, setRemainingCredits] = useState("4");
  const semester = semesters.includes(selectedSemester) ? selectedSemester : semesters[0] || "";
  const semesterRecords = records.filter((record) => String(record.semester || "") === semester);
  const result = calculateAcademicTarget(semesterRecords, Number(targetIp), Number(remainingCredits));

  return <section className="hub-academic-target" aria-labelledby="academic-target-title">
    <header><div><span>ACADEMIC TARGET</span><h2 id="academic-target-title">Target IP semester.</h2><p>Hitung rata-rata bobot minimum untuk sisa SKS dari nilai Blok dan MKU yang sudah tercatat.</p></div><b>MAX 4.00</b></header>
    <div className="hub-academic-target-inputs">
      <label><span>Semester</span><select value={semester} onChange={(event) => setSelectedSemester(event.target.value)} disabled={!semesters.length}>{semesters.length ? semesters.map((item) => <option key={item} value={item}>{item}</option>) : <option value="">Belum ada semester</option>}</select></label>
      <label><span>Target IP</span><input type="number" inputMode="decimal" min="0" max="4" step="0.01" value={targetIp} onChange={(event) => setTargetIp(event.target.value)} /></label>
      <label><span>Sisa SKS yang direncanakan</span><input type="number" inputMode="decimal" min="0.5" step="0.5" value={remainingCredits} onChange={(event) => setRemainingCredits(event.target.value)} /></label>
    </div>
    {!result ? <p className="hub-ospe-empty">Masukkan target IP 0–4 dan sisa SKS yang valid.</p> : <div className="hub-academic-target-results" aria-live="polite">
      <dl><div><dt>IP saat ini</dt><dd>{result.currentIp === null ? "Belum ada nilai" : result.currentIp.toFixed(2)}</dd></div><div><dt>SKS tercatat</dt><dd>{result.currentCredits}</dd></div><div><dt>Proyeksi total SKS</dt><dd>{result.projectedCredits}</dd></div></dl>
      {result.alreadySecured ? <p className="hub-ospe-status is-pass">Target sudah aman berdasarkan nilai yang tercatat.</p> : !result.achievable ? <p className="hub-ospe-status is-danger">Target tidak dapat dicapai pada sisa SKS ini meskipun seluruh nilai mendapat bobot 4.00.</p> : <p className="hub-ospe-status">Butuh rata-rata bobot minimal <b>{result.requiredAverage.toFixed(2)}</b>{result.recommendedGrade ? ` · target nilai setidaknya ${result.recommendedGrade}` : ""}.</p>}
    </div>}
  </section>;
}

export default function AcademicPanel() {
  const [activePage, setActivePage] = useState("overview");
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
  const latestSemester = [...bySemester].sort((left, right) => String(right.semester).localeCompare(String(left.semester), undefined, { numeric: true }))[0] || null;
  const pages = [["overview", "Overview"], ["grades", "Grades & Credits"], ["target", "Academic Target"], ["calculator", "Grade Calculator"], ["questions", "Question Bank"]];

  return <>
    <nav className="hub-academic-nav" role="tablist" aria-label="Academic pages">
      {pages.map(([id, label]) => <button key={id} type="button" role="tab" id={`academic-tab-${id}`} aria-controls={`academic-panel-${id}`} aria-selected={activePage === id} className={activePage === id ? "is-active" : undefined} aria-label={id === "overview" ? "Overview — Record & Targets" : label} onClick={() => setActivePage(id)}>{label}</button>)}
    </nav>

    <section id="academic-panel-overview" className="hub-academic-page-panel" role="tabpanel" aria-labelledby="academic-tab-overview" hidden={activePage !== "overview"}>
      <section className="hub-academic-overview">
        <article className="hub-academic-gpa"><span>IPK / CUMULATIVE</span><strong>{credits ? ipk.toFixed(2) : "—"}</strong><small>{credits ? "Blok kedokteran + MKU" : "Belum ada nilai tercatat"}</small></article>
        <div className="hub-academic-overview-stats">
          <article><span>TOTAL SKS</span><strong>{credits}</strong></article>
          <article><span>SEMESTER</span><strong>{bySemester.length}</strong></article>
          <article><span>IP TERBARU{latestSemester ? ` · ${latestSemester.semester}` : ""}</span><strong>{latestSemester ? latestSemester.ip.toFixed(2) : "—"}</strong></article>
        </div>
      </section>
      <section className="hub-academic-quick-links" aria-label="Academic quick access">
        <span>AKSES CEPAT</span>
        <div>
          <button type="button" onClick={() => { setRecordType("medical"); setActivePage("grades"); }}>Grades & Credits · Blok</button>
          <button type="button" onClick={() => { setRecordType("mku"); setActivePage("grades"); }}>Mata Kuliah Umum</button>
          <button type="button" onClick={() => setActivePage("target")}>Academic Target</button>
          <button type="button" onClick={() => setActivePage("calculator")}>Grade Calculator</button>
          <button type="button" onClick={() => setActivePage("questions")}>Question Bank</button>
        </div>
      </section>
      <p className="hub-academic-shared-note">IPK dan IP per semester menghitung nilai blok serta MKU bersama-sama.</p>
    </section>

    <section id="academic-panel-grades" className="hub-academic-page-panel hub-academic-grades" role="tabpanel" aria-labelledby="academic-tab-grades" hidden={activePage !== "grades"}>
      <section className="hub-academic-record-type" aria-label="Academic record type">
        <div><span>RECORD TYPE</span><p>IPK dan IP per semester menghitung nilai blok serta MKU bersama-sama.</p></div>
        <div role="tablist" aria-label="Academic record options"><button type="button" role="tab" aria-selected={recordType === "medical"} className={recordType === "medical" ? "is-active" : undefined} onClick={() => setRecordType("medical")}>BLOK KEDOKTERAN</button><button type="button" role="tab" aria-selected={recordType === "mku"} className={recordType === "mku" ? "is-active" : undefined} onClick={() => setRecordType("mku")}>MATA KULIAH UMUM</button></div>
      </section>
      <div hidden={recordType !== "medical"}><CrudPanel {...ACADEMIC_CHANNELS[0]} onRecordsChange={setRecords} /></div>
      <div hidden={recordType !== "mku"}><CrudPanel {...ACADEMIC_CHANNELS[1]} onRecordsChange={setMkuRecords} /></div>
    </section>

    <section id="academic-panel-target" className="hub-academic-page-panel" role="tabpanel" aria-labelledby="academic-tab-target" hidden={activePage !== "target"}>
      <AcademicTargetCalculator records={allRecords} />
    </section>

    <section id="academic-panel-calculator" className="hub-academic-page-panel hub-academic-calculator-page" role="tabpanel" aria-labelledby="academic-tab-calculator" hidden={activePage !== "calculator"}>
      <details className="hub-academic-guide hub-academic-guide-accordion">
        <summary><span>ATURAN PEMBOBOTAN NILAI BLOK</span><small>Lihat tabel nilai dan komponen per blok</small></summary>
        <div className="hub-academic-guide-content">
          <p>Nilai akhir blok dikonversi menjadi huruf mutu dan bobot berikut.</p>
          <div>{guide.map(([range, grade, point]) => <span key={grade}>{range} <b>{grade}</b> / {point}</span>)}</div>
          <ul>{weights.map(([block, distribution]) => <li key={block}><b>{block}</b><span>{distribution}</span></li>)}</ul>
        </div>
      </details>
      <OspeCalculator />
    </section>

    <section id="academic-panel-questions" className="hub-academic-page-panel" role="tabpanel" aria-labelledby="academic-tab-questions" hidden={activePage !== "questions"}>
      {activePage === "questions" && <QuestionLibrary />}
    </section>
  </>;
}
