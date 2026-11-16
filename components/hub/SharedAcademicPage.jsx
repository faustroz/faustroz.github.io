"use client";
/* eslint-disable @next/next/no-img-element -- signed Storage URLs for shared content. */

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Eye, RotateCcw } from "lucide-react";
import { requireSupabase } from "@/lib/supabase/client";
import { readShareTokenFromHash, SHARE_KINDS, loadSharedContent, filterSharedQuestions, filterSharedReferenceLibrary } from "@/lib/hub/share-links.mjs";

const pad = (value) => String(value).padStart(2, "0");
const REFERENCE_FIELDS = [["Kelas", "drug_class"], ["Mekanisme", "mechanism"], ["Indikasi", "indications"], ["Efek samping", "adverse_effects"], ["Kontraindikasi", "contraindications"], ["Interaksi", "interactions"], ["Catatan", "notes"]];

export default function SharedAcademicPage() {
  const [token, setToken] = useState(undefined);
  const [shared, setShared] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const readToken = () => setToken(readShareTokenFromHash(window.location.hash));
    readToken();
    window.addEventListener("hashchange", readToken);
    return () => window.removeEventListener("hashchange", readToken);
  }, []);

  useEffect(() => {
    if (token === undefined) return undefined;
    setShared(null);
    setError("");
    if (!token) {
      setError("Link tidak valid. Minta link baru dari pemilik konten.");
      return undefined;
    }
    let active = true;
    Promise.resolve()
      .then(() => loadSharedContent(requireSupabase(), token))
      .then((result) => { if (active) setShared(result); })
      .catch((loadError) => { if (active) setError(loadError?.message || "Konten gagal dimuat."); });
    return () => { active = false; };
  }, [token]);

  return (
    <div className="hub-shell hub-shell--practice hub-shared-page">
      <main className="hub-shared-main">
        {error && <p className="hub-data-error" role="alert">{error}</p>}
        {!error && !shared && <p className="hub-data-state">MEMUAT KONTEN…</p>}
        {shared?.kind === SHARE_KINDS.IMAGE_OCCLUSION_SET && <SharedOcclusionViewer shared={shared} />}
        {shared?.kind === SHARE_KINDS.QUESTION_BANK && <SharedQuestionBankViewer shared={shared} />}
        {shared?.kind === SHARE_KINDS.REFERENCE_LIBRARY && <SharedReferenceViewer shared={shared} />}
      </main>
    </div>
  );
}

function SharedOcclusionViewer({ shared }) {
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const total = shared.cards.length;
  const card = shared.cards[index];
  const maskOnly = shared.answerMode === "mask_only";
  const imageUrl = card ? shared.imageUrls.get(card.imagePath) || "" : "";
  const cardsOnImage = card ? shared.cards.filter((item) => item.imagePath === card.imagePath) : [];
  const maskNumber = card ? cardsOnImage.findIndex((item) => item.id === card.id) + 1 : 0;
  const progress = total ? Math.round(((index + 1) / total) * 100) : 0;

  useEffect(() => {
    const onKey = (event) => {
      const target = event.target;
      if (target instanceof HTMLElement && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(target.tagName))) return;
      if (event.code === "Space" && !event.repeat) {
        event.preventDefault();
        setRevealed(true);
      } else if (event.key === "ArrowRight") {
        setIndex((current) => Math.min(current + 1, total - 1));
        setRevealed(false);
      } else if (event.key === "ArrowLeft") {
        setIndex((current) => Math.max(current - 1, 0));
        setRevealed(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [total]);

  const go = (nextIndex) => {
    setIndex(nextIndex);
    setRevealed(false);
  };

  if (!card) return <p className="hub-data-state">Kumpulan ini belum punya kartu.</p>;

  return (
    <section className="hub-occlusion-study">
      <header className="hub-occlusion-study-top">
        <div><span>IMAGE OCCLUSION / SHARED</span><strong>{shared.title}</strong></div>
        <b>{pad(index + 1)} / {pad(total)}</b>
      </header>
      <div className="academic-practice__progress" role="progressbar" aria-valuenow={progress} aria-valuemin="0" aria-valuemax="100"><span style={{ width: `${progress}%` }} /></div>
      <section className="hub-occlusion-study-body">
        <p className="hub-occlusion-study-instruction">Coba ingat bagian yang tertutup, lalu tekan Space atau tombol Reveal. Panah kiri dan kanan untuk pindah kartu.</p>
        {imageUrl ? (
          <div key={card.id} className="hub-occlusion-study-image">
            <img src={imageUrl} alt="Gambar belajar dengan bagian tertutup" />
            {cardsOnImage.map((mask, maskIndex) => {
              const current = mask.id === card.id;
              const open = current && revealed;
              return (
                <div
                  key={mask.id}
                  aria-hidden={open && maskOnly ? "true" : undefined}
                  className={`hub-occlusion-mask${current ? " is-current" : ""}${open && !maskOnly ? " is-revealed" : ""}${open && maskOnly ? " is-mask-only-open" : ""}`}
                  style={{ left: `${mask.x * 100}%`, top: `${mask.y * 100}%`, width: `${mask.width * 100}%`, height: `${mask.height * 100}%`, transform: `rotate(${mask.rotation || 0}deg)` }}
                >
                  {open && !maskOnly ? mask.answer : <span className="hub-occlusion-study-mask-number">{maskIndex + 1}</span>}
                </div>
              );
            })}
          </div>
        ) : (
          <p role="alert">Gambar tidak dapat dimuat. Coba muat ulang halaman.</p>
        )}
        <div className="hub-occlusion-study-answer">
          <span>MASK {pad(maskNumber)}</span>
          {revealed ? (
            maskOnly ? <strong>Area gambar terbuka · tanpa jawaban teks</strong> : <strong>{card.answer}</strong>
          ) : (
            <button type="button" className="hub-question-tool-button" aria-keyshortcuts="Space" onClick={() => setRevealed(true)}>
              <Eye size={15} /> {maskOnly ? "Buka area · Space" : "Reveal jawaban · Space"}
            </button>
          )}
        </div>
        <SharedNav index={index} total={total} onGo={go} />
      </section>
    </section>
  );
}

function SharedQuestionBankViewer({ shared }) {
  const [block, setBlock] = useState("");
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [draft, setDraft] = useState("");
  const blocks = useMemo(() => [...new Set(shared.questions.map((question) => question.block).filter(Boolean))].sort((a, b) => a.localeCompare(b, "id")), [shared.questions]);
  const questions = useMemo(() => filterSharedQuestions(shared.questions, { block, query }), [shared.questions, block, query]);
  const question = questions[index];
  const total = questions.length;

  const go = (nextIndex) => {
    setIndex(nextIndex);
    setPicked(null);
    setRevealed(false);
    setDraft("");
  };
  const changeFilter = (setter) => (value) => {
    setter(value);
    go(0);
  };

  if (!shared.questions.length) return <p className="hub-data-state">Bank soal ini belum berisi soal.</p>;

  const isEssay = question?.question_type === "essay";
  const showAnswer = revealed || picked !== null;
  const options = question ? Object.keys(question.options || {}).sort() : [];
  const meta = question ? [question.exam_type, question.subject, question.block, question.topic, question.subtopic, question.difficulty].filter(Boolean).join(" · ") : "";

  return (
    <section className="hub-shared-quiz">
      <header className="hub-occlusion-study-top">
        <div><span>BANK SOAL / SHARED</span><strong>{shared.title}</strong></div>
        <b>{total ? `${pad(index + 1)} / ${pad(total)}` : "00"}</b>
      </header>
      <div className="hub-shared-filters">
        <input type="search" aria-label="Cari soal" placeholder="Cari soal atau topik…" value={query} onChange={(event) => changeFilter(setQuery)(event.target.value)} />
        {blocks.length > 0 && (
          <select aria-label="Filter block" value={block} onChange={(event) => changeFilter(setBlock)(event.target.value)}>
            <option value="">Semua block</option>
            {blocks.map((name) => <option key={name} value={name}>{name}</option>)}
          </select>
        )}
      </div>
      {!question ? <p className="hub-data-state">Tidak ada soal yang cocok dengan filter.</p> : (
        <section className="hub-shared-question">
          <p className="hub-shared-meta">{isEssay ? "ESSAY" : "MCQ"}{meta && ` · ${meta}`}</p>
          {shared.imageUrls.get(question.image_path) && <img className="hub-shared-question-image" src={shared.imageUrls.get(question.image_path)} alt="Gambar soal" />}
          <p className="hub-shared-question-text">{question.question_text}</p>
          {isEssay ? (
            <>
              <textarea aria-label="Jawaban kamu (tidak disimpan)" placeholder="Tulis jawabanmu di sini (tidak disimpan)…" value={draft} onChange={(event) => setDraft(event.target.value)} rows={5} />
              {revealed ? <div className="hub-shared-answer"><strong>Jawaban referensi</strong><p>{question.reference_answer}</p></div> : (
                <button type="button" className="hub-question-tool-button" onClick={() => setRevealed(true)}><Eye size={15} /> Lihat jawaban referensi</button>
              )}
            </>
          ) : (
            <ol className="hub-shared-options" aria-label="Pilihan jawaban">
              {options.map((key) => {
                const correct = key === question.correct_answer;
                const wrong = picked === key && !correct;
                return (
                  <li key={key}>
                    <button
                      type="button"
                      disabled={picked !== null}
                      className={`${showAnswer && correct ? "is-correct " : ""}${wrong ? "is-wrong" : ""}`.trim()}
                      onClick={() => setPicked(key)}
                    >
                      <b>{key}</b> {question.options[key]}
                    </button>
                  </li>
                );
              })}
            </ol>
          )}
          {!isEssay && !showAnswer && (
            <button type="button" className="hub-question-tool-button" onClick={() => setRevealed(true)}><Eye size={15} /> Tampilkan jawaban</button>
          )}
          {showAnswer && question.explanation && <div className="hub-shared-answer"><strong>Pembahasan</strong><p>{question.explanation}</p></div>}
        </section>
      )}
      {total > 0 && <SharedNav index={index} total={total} onGo={go} />}
    </section>
  );
}

function SharedReferenceViewer({ shared }) {
  const [query, setQuery] = useState("");
  const { drugs, values } = useMemo(() => filterSharedReferenceLibrary(shared, query), [shared, query]);
  const groups = useMemo(() => {
    const byTopic = new Map();
    for (const value of values) byTopic.set(value.topic, [...(byTopic.get(value.topic) || []), value]);
    return [...byTopic.entries()];
  }, [values]);

  return (
    <section className="hub-shared-reference">
      <header className="hub-occlusion-study-top">
        <div><span>REFERENSI / SHARED</span><strong>Obat, nilai, dosis</strong></div>
      </header>
      <input type="search" className="hub-shared-search" aria-label="Cari referensi" placeholder="Cari obat, parameter, atau topik…" value={query} onChange={(event) => setQuery(event.target.value)} />
      <h2 className="hub-shared-section-title">Kartu obat ({drugs.length})</h2>
      {drugs.length === 0 && <p className="hub-data-state">Belum ada kartu obat.</p>}
      {drugs.map((drug) => (
        <article key={drug.id} className="hub-shared-card">
          <h3>{drug.name}</h3>
          <dl>
            {REFERENCE_FIELDS.filter(([, key]) => drug[key]).map(([label, key]) => (
              <div key={key}><dt>{label}</dt><dd>{drug[key]}</dd></div>
            ))}
          </dl>
        </article>
      ))}
      <h2 className="hub-shared-section-title">Nilai dan dosis ({values.length})</h2>
      {values.length === 0 && <p className="hub-data-state">Belum ada nilai referensi.</p>}
      {groups.map(([topic, rows]) => (
        <article key={topic} className="hub-shared-card">
          <h3>{topic}</h3>
          <table>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <th scope="row">{row.parameter}</th>
                  <td>{row.value}{row.unit ? ` ${row.unit}` : ""}</td>
                  <td>{row.notes || ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>
      ))}
    </section>
  );
}

function SharedNav({ index, total, onGo }) {
  return (
    <nav className="hub-occlusion-study-nav" aria-label="Navigasi kartu">
      <button type="button" className="hub-question-tool-button" disabled={index === 0} onClick={() => onGo(index - 1)}><ArrowLeft size={15} /> Sebelumnya</button>
      <span>{total} kartu</span>
      {index === total - 1 ? (
        <button type="button" className="hub-question-add-button" onClick={() => onGo(0)}><RotateCcw size={15} /> Ulangi dari awal</button>
      ) : (
        <button type="button" className="hub-question-add-button" onClick={() => onGo(index + 1)}>Berikutnya <ArrowRight size={15} /></button>
      )}
    </nav>
  );
}
