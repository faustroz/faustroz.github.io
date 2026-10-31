"use client";
/* eslint-disable @next/next/no-img-element -- private signed Storage URL. */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Eye, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { requireSupabase } from "@/lib/supabase/client";
import { applyImageOcclusionRating, createImageOcclusionRepository, getImageOcclusionRatingFromKey, readImageOcclusionRun, writeImageOcclusionRun } from "@/lib/hub/image-occlusion.mjs";
import { playImageOcclusionSound } from "@/lib/hub/image-occlusion-sounds.mjs";

const ratings = [["again", "Again"], ["hard", "Hard"], ["good", "Good"], ["easy", "Easy"]];

export default function ImageOcclusionStudyPage() {
  const router = useRouter();
  const [run, setRun] = useState(null);
  const [imageUrl, setImageUrl] = useState("");
  const [ready, setReady] = useState(false);
  const [pendingRatings, setPendingRatings] = useState(() => new Set());
  const [error, setError] = useState("");
  const ratingLock = useRef(new Set());
  const completionPlayed = useRef(false);
  const card = run?.cards?.[run.index];
  const activeImagePath = card?.imagePath || run?.imagePath;
  useEffect(() => { setRun(readImageOcclusionRun(window.sessionStorage)); setReady(true); }, []);
  useEffect(() => { if (run) writeImageOcclusionRun(window.sessionStorage, run); }, [run]);
  useEffect(() => {
    let active = true;
    setImageUrl("");
    if (activeImagePath) requireSupabase().storage.from("academic-question-images").createSignedUrl(activeImagePath, 3600)
      .then(({ data, error: signError }) => { if (active) setImageUrl(signError ? "" : data?.signedUrl || ""); })
      .catch(() => { if (active) setImageUrl(""); });
    return () => { active = false; };
  }, [activeImagePath]);

  const response = run?.responses?.[run.index];
  const sessionComplete = Boolean(run?.responses?.length && run.responses.every((item) => item.rating && item.saved));
  useEffect(() => {
    if (!sessionComplete || run?.completionSoundPlayed || completionPlayed.current) return;
    completionPlayed.current = true;
    setRun((current) => ({ ...current, completionSoundPlayed: true }));
    playImageOcclusionSound("complete", window);
  }, [sessionComplete, run?.completionSoundPlayed]);
  useEffect(() => {
    const revealWithSpace = (event) => {
      if (event.code !== "Space" || event.repeat || response?.revealed) return;
      const target = event.target;
      if (target instanceof HTMLElement && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(target.tagName))) return;
      event.preventDefault();
      playImageOcclusionSound("reveal", window);
      setRun((current) => current ? ({ ...current, responses: current.responses.map((item, index) => index === current.index ? { ...item, revealed: true } : item) }) : current);
    };
    window.addEventListener("keydown", revealWithSpace);
    return () => window.removeEventListener("keydown", revealWithSpace);
  }, [response?.revealed]);

  const progress = run ? Math.round(((run.index + 1) / run.cards.length) * 100) : 0;
  const next = (index) => {
    const direction = index > run.index ? "next" : "previous";
    setRun((current) => ({ ...current, index, responses: current.responses.map((item) => ({ ...item, revealed: false })) }));
    playImageOcclusionSound(direction, window);
  };
  const cardId = card?.id;
  const currentIndex = run?.index;
  const rate = useCallback((rating) => {
    if (!cardId || ratingLock.current.has(cardId) || response?.rating) return;
    const targetCardId = cardId;
    const targetIndex = currentIndex;
    ratingLock.current.add(targetCardId);
    setPendingRatings((current) => new Set(current).add(targetCardId));
    setRun((current) => applyImageOcclusionRating(current, targetIndex, rating));
    setError("");
    // Optimistically move to the next card; persistence runs in the background.
    void (async () => {
      try {
        const result = await createImageOcclusionRepository(requireSupabase()).rateCard(targetCardId, rating);
        setRun((current) => ({
          ...current,
          cards: current.cards.map((item) => item.id === targetCardId ? { ...item, reviewState: result.state } : item),
          responses: current.responses.map((item, index) => index === targetIndex ? { ...item, saved: true } : item),
        }));
        playImageOcclusionSound(rating, window);
      } catch (saveError) {
        setRun((current) => ({ ...current, responses: current.responses.map((item, index) => index === targetIndex && item.rating === rating ? { ...item, rating: null, saved: false } : item) }));
        playImageOcclusionSound("error", window);
        setError(`Rating kartu ${String(targetIndex + 1).padStart(2, "0")} belum tersimpan. Kembali ke kartu tersebut untuk mencoba lagi. ${saveError?.message || ""}`);
      } finally {
        ratingLock.current.delete(targetCardId);
        setPendingRatings((current) => { const next = new Set(current); next.delete(targetCardId); return next; });
      }
    })();
  }, [cardId, currentIndex, response?.rating]);

  useEffect(() => {
    if (!response?.revealed || response.rating) return undefined;
    const rateWithNumber = (event) => {
      if (event.repeat || event.altKey || event.ctrlKey || event.metaKey) return;
      const target = event.target;
      if (target instanceof HTMLElement && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))) return;
      const rating = getImageOcclusionRatingFromKey(event.key);
      if (!rating) return;
      event.preventDefault();
      void rate(rating);
    };
    window.addEventListener("keydown", rateWithNumber);
    return () => window.removeEventListener("keydown", rateWithNumber);
  }, [response?.revealed, response?.rating, rate]);

  const maskOnly = (run?.answerMode || "answer") === "mask_only";
  const masks = useMemo(() => {
    const cardsOnImage = (run?.cards?.filter((item) => (card?.imageId && item.imageId) ? item.imageId === card.imageId : (item.imagePath || run.imagePath) === activeImagePath) || [])
      .slice()
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    return cardsOnImage.map((item, index) => ({
      ...item,
      index,
      open: run.mode === "hide_all" ? item.id === card?.id && response?.revealed : item.id !== card?.id || response?.revealed,
    }));
  }, [run, card?.id, card?.imageId, activeImagePath, response?.revealed]);
  const activeMaskNumber = useMemo(() => {
    const currentOnImage = masks.find((item) => item.id === card?.id);
    return currentOnImage ? currentOnImage.index + 1 : (card?.position != null ? card.position + 1 : (run?.index ?? 0) + 1);
  }, [masks, card?.id, card?.position, run?.index]);
  if (!ready) return <main className="hub-occlusion-study"><p>Memuat sesi...</p></main>;
  if (!run || !card) return <main className="hub-occlusion-study"><button type="button" className="academic-practice__icon-button" onClick={() => router.back()} aria-label="Kembali"><ArrowLeft size={18} /></button><p>Sesi Image Occlusion tidak ditemukan.</p><button type="button" className="hub-question-tool-button" onClick={() => router.push("/academic")}>Kembali ke Academic</button></main>;

  if (sessionComplete) {
    const ratingCounts = ratings.map(([value, label]) => ({ label, count: run.responses.filter((item) => item.rating === value).length }));
    return <main className="hub-occlusion-study hub-occlusion-completion" aria-labelledby="occlusion-completion-title">
      <div className="hub-occlusion-completion-check"><Check aria-hidden="true" /></div>
      <span>IMAGE OCCLUSION / SESSION COMPLETE</span>
      <h1 id="occlusion-completion-title">Sesi selesai.</h1>
      <p>{run.cards.length} dari {run.cards.length} kartu sudah dinilai dan tersimpan.</p>
      <dl>{ratingCounts.map(({ label, count }) => <div key={label}><dt>{label}</dt><dd>{count}</dd></div>)}</dl>
      <button type="button" className="hub-question-add-button" onClick={() => router.push("/academic")}>Kembali ke Image Occlusion</button>
    </main>;
  }

  return <main className="hub-occlusion-study">
    <header className="hub-occlusion-study-top"><button type="button" className="academic-practice__icon-button" onClick={() => router.back()} aria-label="Keluar ke Image Occlusion"><ArrowLeft size={18} /></button><div><span>IMAGE OCCLUSION / {run.mode === "hide_one" ? "HIDE ONE" : "HIDE ALL"}</span><strong>{run.title}</strong></div><b>{String(run.index + 1).padStart(2, "0")} / {String(run.cards.length).padStart(2, "0")}</b></header>
    <div className="academic-practice__progress" role="progressbar" aria-valuenow={progress} aria-valuemin="0" aria-valuemax="100"><span style={{ width: `${progress}%` }} /></div>
    <section className="hub-occlusion-study-body">
      <p className="hub-occlusion-study-instruction">Coba ingat bagian yang tertutup, lalu tekan Space atau tombol Reveal.</p>
      {imageUrl ? <div key={card.id} className="hub-occlusion-study-image"><img src={imageUrl} alt="Gambar belajar dengan bagian tertutup" />{masks.map((mask) => <div key={mask.id} aria-hidden={mask.open && maskOnly ? "true" : undefined} className={`hub-occlusion-mask${mask.id === card.id ? " is-current" : ""}${mask.open && !maskOnly ? " is-revealed" : ""}${mask.open && maskOnly ? " is-mask-only-open" : ""}`} style={{ left: `${mask.x * 100}%`, top: `${mask.y * 100}%`, width: `${mask.width * 100}%`, height: `${mask.height * 100}%`, transform: `rotate(${mask.rotation || 0}deg)` }}>{mask.open && !maskOnly ? mask.answer : mask.id === card.id ? <span className="hub-occlusion-study-mask-number">{mask.index + 1}</span> : mask.index + 1}</div>)}</div> : <p role="alert">Gambar privat tidak dapat dimuat. Periksa koneksi dan coba kembali.</p>}
      <div className="hub-occlusion-study-answer"><span>MASK {String(activeMaskNumber).padStart(2, "0")}</span>{response?.revealed ? (maskOnly ? <strong>Area gambar terbuka · tanpa jawaban teks</strong> : <strong>{card.answer}</strong>) : <button type="button" className="hub-question-tool-button" aria-keyshortcuts="Space" onClick={() => { playImageOcclusionSound("reveal", window); setRun((current) => ({ ...current, responses: current.responses.map((item, i) => i === current.index ? { ...item, revealed: true } : item) })); }}><Eye size={15} /> {maskOnly ? "Buka area · Space" : "Reveal jawaban · Space"}</button>}</div>
      {response?.revealed && <div className="hub-occlusion-study-rating"><span aria-live="polite">{response.rating ? `${pendingRatings.has(card.id) ? "Dipilih" : "Tersimpan"}: ${response.rating.toUpperCase()}` : "Seberapa baik Anda mengingatnya?"}</span><div>{ratings.map(([value, label]) => <button type="button" key={value} disabled={pendingRatings.has(card.id) || Boolean(response.rating)} aria-pressed={response.rating === value} onClick={() => rate(value)}>{label}</button>)}<small className="hub-occlusion-rating-shortcuts">1 Again · 2 Hard · 3 Good · 4 Easy</small></div></div>}
      {error && <p className="hub-data-error" role="alert">{error}</p>}
      <nav className="hub-occlusion-study-nav" aria-label="Navigasi kartu"><button type="button" className="hub-question-tool-button" disabled={run.index === 0} onClick={() => next(run.index - 1)}><ArrowLeft size={15} /> Sebelumnya</button><span>{run.cards.length} kartu</span><button type="button" className="hub-question-add-button" onClick={() => run.index === run.cards.length - 1 ? router.push("/academic") : next(run.index + 1)}>{run.index === run.cards.length - 1 ? "Selesai" : <>Berikutnya <ArrowRight size={15} /></>}</button></nav>
      {run.cards.length === 1 && <p className="hub-occlusion-study-single"><RotateCcw size={14} /> Satu kartu dalam sesi ini</p>}
    </section>
  </main>;
}
