"use client";
/* eslint-disable @next/next/no-img-element -- private signed Storage URL. */

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Eye, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { requireSupabase } from "@/lib/supabase/client";
import { createImageOcclusionRepository, readImageOcclusionRun, writeImageOcclusionRun } from "@/lib/hub/image-occlusion.mjs";

const ratings = [["again", "Again"], ["hard", "Hard"], ["good", "Good"], ["easy", "Easy"]];

export default function ImageOcclusionStudyPage() {
  const router = useRouter();
  const [run, setRun] = useState(null);
  const [imageUrl, setImageUrl] = useState("");
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const ratingLock = useRef(false);
  useEffect(() => { setRun(readImageOcclusionRun(window.sessionStorage)); setReady(true); }, []);
  useEffect(() => { if (run) writeImageOcclusionRun(window.sessionStorage, run); }, [run]);
  useEffect(() => {
    let active = true;
    if (run?.imagePath) requireSupabase().storage.from("academic-question-images").createSignedUrl(run.imagePath, 3600)
      .then(({ data, error: signError }) => { if (active) setImageUrl(signError ? "" : data?.signedUrl || ""); })
      .catch(() => { if (active) setImageUrl(""); });
    return () => { active = false; };
  }, [run?.imagePath]);

  const response = run?.responses?.[run.index];
  useEffect(() => {
    const revealWithSpace = (event) => {
      if (event.code !== "Space" || event.repeat || response?.revealed) return;
      const target = event.target;
      if (target instanceof HTMLElement && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(target.tagName))) return;
      event.preventDefault();
      setRun((current) => current ? ({ ...current, responses: current.responses.map((item, index) => index === current.index ? { ...item, revealed: true } : item) }) : current);
    };
    window.addEventListener("keydown", revealWithSpace);
    return () => window.removeEventListener("keydown", revealWithSpace);
  }, [response?.revealed]);

  const card = run?.cards?.[run.index];
  const progress = run ? Math.round(((run.index + 1) / run.cards.length) * 100) : 0;
  const next = (index) => setRun((current) => ({ ...current, index, responses: current.responses.map((item, i) => i === index ? { ...item, revealed: false } : item) }));
  const rate = async (rating) => {
    if (!card || busy || ratingLock.current || response?.rating) return;
    ratingLock.current = true;
    setBusy(true); setError("");
    try {
      const result = await createImageOcclusionRepository(requireSupabase()).rateCard(card.id, rating);
      setRun((current) => ({ ...current, cards: current.cards.map((item, i) => i === current.index ? { ...item, reviewState: result.state } : item), responses: current.responses.map((item, i) => i === current.index ? { ...item, rating } : item) }));
    } catch (saveError) { setError(saveError?.message || "Rating belum tersimpan. Silakan coba lagi."); }
    finally { ratingLock.current = false; setBusy(false); }
  };

  const maskOnly = (run?.answerMode || "answer") === "mask_only";
  const masks = useMemo(() => run?.mode === "hide_all" ? run.cards.map((item, index) => ({ ...item, index, open: index === run.index && response?.revealed })) : run?.cards.map((item, index) => ({ ...item, index, open: index !== run.index || response?.revealed })), [run, response?.revealed]);
  if (!ready) return <main className="hub-occlusion-study"><p>Memuat sesi...</p></main>;
  if (!run || !card) return <main className="hub-occlusion-study"><button type="button" className="academic-practice__icon-button" onClick={() => router.back()} aria-label="Kembali"><ArrowLeft size={18} /></button><p>Sesi Image Occlusion tidak ditemukan.</p><button type="button" className="hub-question-tool-button" onClick={() => router.push("/academic")}>Kembali ke Academic</button></main>;

  return <main className="hub-occlusion-study">
    <header className="hub-occlusion-study-top"><button type="button" className="academic-practice__icon-button" onClick={() => router.back()} aria-label="Keluar ke Image Occlusion"><ArrowLeft size={18} /></button><div><span>IMAGE OCCLUSION / {run.mode === "hide_one" ? "HIDE ONE" : "HIDE ALL"}</span><strong>{run.title}</strong></div><b>{String(run.index + 1).padStart(2, "0")} / {String(run.cards.length).padStart(2, "0")}</b></header>
    <div className="academic-practice__progress" role="progressbar" aria-valuenow={progress} aria-valuemin="0" aria-valuemax="100"><span style={{ width: `${progress}%` }} /></div>
    <section className="hub-occlusion-study-body">
      <p className="hub-occlusion-study-instruction">Coba ingat bagian yang tertutup, lalu tekan Space atau tombol Reveal.</p>
      {imageUrl ? <div className="hub-occlusion-study-image"><img src={imageUrl} alt="Gambar belajar dengan bagian tertutup" />{masks.map((mask) => <div key={mask.id} className={`hub-occlusion-mask${mask.open && !maskOnly ? " is-revealed" : ""}${mask.open && maskOnly ? " is-open" : ""}`} style={{ left: `${mask.x * 100}%`, top: `${mask.y * 100}%`, width: `${mask.width * 100}%`, height: `${mask.height * 100}%` }}>{mask.open ? (maskOnly ? "" : mask.answer) : mask.index + 1}</div>)}</div> : <p role="alert">Gambar privat tidak dapat dimuat. Periksa koneksi dan coba kembali.</p>}
      <div className="hub-occlusion-study-answer"><span>MASK {String(run.index + 1).padStart(2, "0")}</span>{response?.revealed ? (maskOnly ? <strong>Area gambar terbuka · tanpa jawaban teks</strong> : <strong>{card.answer}</strong>) : <button type="button" className="hub-question-tool-button" aria-keyshortcuts="Space" onClick={() => setRun((current) => ({ ...current, responses: current.responses.map((item, i) => i === current.index ? { ...item, revealed: true } : item) }))}><Eye size={15} /> {maskOnly ? "Buka area · Space" : "Reveal jawaban · Space"}</button>}</div>
      {response?.revealed && <div className="hub-occlusion-study-rating"><span>{response.rating ? `Tersimpan: ${response.rating.toUpperCase()}` : "Seberapa baik Anda mengingatnya?"}</span><div>{ratings.map(([value, label]) => <button type="button" key={value} disabled={busy || Boolean(response.rating)} aria-pressed={response.rating === value} onClick={() => rate(value)}>{busy ? "Menyimpan..." : label}</button>)}</div></div>}
      {error && <p className="hub-data-error" role="alert">{error}</p>}
      <nav className="hub-occlusion-study-nav" aria-label="Navigasi kartu"><button type="button" className="hub-question-tool-button" disabled={run.index === 0} onClick={() => next(run.index - 1)}><ArrowLeft size={15} /> Sebelumnya</button><span>{run.cards.length} kartu</span><button type="button" className="hub-question-add-button" onClick={() => run.index === run.cards.length - 1 ? router.push("/academic") : next(run.index + 1)}>{run.index === run.cards.length - 1 ? "Selesai" : <>Berikutnya <ArrowRight size={15} /></>}</button></nav>
      {run.cards.length === 1 && <p className="hub-occlusion-study-single"><RotateCcw size={14} /> Satu kartu dalam sesi ini</p>}
    </section>
  </main>;
}
