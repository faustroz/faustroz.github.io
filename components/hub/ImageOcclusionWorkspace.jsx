"use client";
/* eslint-disable @next/next/no-img-element -- private signed images and local editor previews. */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, Clock3, ImagePlus, Pencil, Play, Plus, Redo2, Save, Trash2, Undo2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { requireSupabase } from "@/lib/supabase/client";
import { createImageOcclusionRun, createImageOcclusionRepository, IMAGE_OCCLUSION_MAX_IMAGE_BYTES, IMAGE_OCCLUSION_MIME_TYPES, writeImageOcclusionRun } from "@/lib/hub/image-occlusion.mjs";

const emptyDraft = () => ({ id: null, title: "", mode: "hide_one", answerMode: "answer", imagePath: "", imageFile: null, imageUrl: "", masks: [] });
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function normalizedPoint(event, element) {
  const rect = element.getBoundingClientRect();
  return { x: clamp((event.clientX - rect.left) / rect.width, 0, 1), y: clamp((event.clientY - rect.top) / rect.height, 0, 1) };
}

function makeRect(start, end) {
  const x = Math.min(start.x, end.x);
  const y = Math.min(start.y, end.y);
  return { x, y, width: Math.abs(end.x - start.x), height: Math.abs(end.y - start.y) };
}

function MaskPreview({ imageUrl, masks, targetIndex, mode = "hide_one", answerMode = "answer" }) {
  return <div className="hub-occlusion-preview-image">
    <img src={imageUrl} alt="Preview kartu Image Occlusion" />
    <div className="hub-occlusion-preview-mask-layer">{masks.map((mask, index) => {
      const reveal = mode === "hide_one" && index !== targetIndex;
      const maskOnlyOpen = reveal && answerMode === "mask_only";
      return <div key={mask.id || index} className={`hub-occlusion-mask${reveal && !maskOnlyOpen ? " is-revealed" : ""}${maskOnlyOpen ? " is-open" : ""}`} style={{ left: `${mask.x * 100}%`, top: `${mask.y * 100}%`, width: `${mask.width * 100}%`, height: `${mask.height * 100}%` }}>{reveal ? (answerMode === "answer" ? mask.answer : "") : index + 1}</div>;
    })}</div>
  </div>;
}

export default function ImageOcclusionWorkspace() {
  const router = useRouter();
  const repository = useMemo(() => createImageOcclusionRepository(requireSupabase()), []);
  const [sets, setSets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [draft, setDraft] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedMaskId, setSelectedMaskId] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [interaction, setInteraction] = useState(null);
  const [past, setPast] = useState([]);
  const [future, setFuture] = useState([]);
  const stageRef = useRef(null);
  const masksRef = useRef([]);
  const interactionRef = useRef(null);
  const fileInputRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const data = await repository.listSets();
      const client = requireSupabase();
      const nextSets = await Promise.all(data.map(async (set) => {
        const { data: signed, error: signError } = await client.storage.from("academic-question-images").createSignedUrl(set.image_path, 3600);
        return { ...set, imageUrl: signError ? "" : signed?.signedUrl || "" };
      }));
      setSets(nextSets);
    } catch (nextError) { setError(nextError?.message || "Kumpulan Image Occlusion gagal dimuat."); }
    finally { setLoading(false); }
  }, [repository]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (!draft?.imageFile) { setImageUrl(draft?.imageUrl || ""); return undefined; }
    const objectUrl = URL.createObjectURL(draft.imageFile);
    setImageUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [draft?.imageFile, draft?.imageUrl]);
  useEffect(() => { masksRef.current = draft?.masks || []; }, [draft?.masks]);

  const selectedMask = draft?.masks.find((mask) => mask.id === selectedMaskId) || null;
  const changeMasks = (next) => {
    masksRef.current = next;
    setDraft((current) => current ? { ...current, masks: next } : current);
  };
  const remember = (before) => { setPast((current) => [...current.slice(-39), before]); setFuture([]); };
  const undo = () => {
    if (!past.length || !draft) return;
    const nextPast = past.slice(0, -1);
    const previous = past[past.length - 1];
    setFuture((current) => [draft.masks, ...current]); setPast(nextPast); changeMasks(previous);
  };
  const redo = () => {
    if (!future.length || !draft) return;
    const [next, ...remaining] = future;
    setPast((current) => [...current, draft.masks]); setFuture(remaining); changeMasks(next);
  };

  const startNew = () => { setDraft(emptyDraft()); setPast([]); setFuture([]); setSelectedMaskId(""); setPreviewOpen(false); setStatus(""); setError(""); };
  const editSet = (set) => {
    const masks = set.cards.map(({ id, position, x, y, width, height, answer }) => ({ id, position, x: Number(x), y: Number(y), width: Number(width), height: Number(height), answer }));
    setDraft({ id: set.id, title: set.title, mode: set.mode, answerMode: set.answer_mode || "answer", imagePath: set.image_path, imageFile: null, imageUrl: set.imageUrl, masks });
    masksRef.current = masks; setPast([]); setFuture([]); setSelectedMaskId(masks[0]?.id || ""); setPreviewOpen(false); setStatus(""); setError("");
  };

  const handleFile = (file) => {
    if (!file) return;
    if (!IMAGE_OCCLUSION_MIME_TYPES.includes(file.type) || file.size > IMAGE_OCCLUSION_MAX_IMAGE_BYTES) {
      setError("Pilih gambar PNG, JPG, atau JPEG dengan ukuran maksimal 5 MB.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    setError("");
    setDraft((current) => ({ ...current, imageFile: file }));
  };

  const beginInteraction = (event, kind, mask = null, edge = "") => {
    event.preventDefault(); event.stopPropagation();
    if (!stageRef.current) return;
    const point = normalizedPoint(event, stageRef.current);
    const before = masksRef.current.map((item) => ({ ...item }));
    const initial = mask ? { ...mask } : null;
    let maskId = mask?.id || "";
    if (kind === "draw") {
      maskId = crypto.randomUUID();
      const next = [...before, { id: maskId, position: before.length, x: point.x, y: point.y, width: 0.001, height: 0.001, answer: "" }];
      changeMasks(next); setSelectedMaskId(maskId);
    } else setSelectedMaskId(maskId);
    const state = { kind, edge, pointerId: event.pointerId, start: point, before, initial, maskId };
    interactionRef.current = state; setInteraction(state);
    try { stageRef.current.setPointerCapture(event.pointerId); } catch { /* Safari may not expose pointer capture for synthetic events. */ }
  };

  const onStagePointerDown = (event) => {
    if (!draft || !imageUrl || (event.target !== stageRef.current && event.target.tagName !== "IMG")) return;
    beginInteraction(event, "draw");
  };
  const onPointerMove = (event) => {
    const active = interactionRef.current;
    if (!active || active.pointerId !== event.pointerId || !stageRef.current) return;
    const point = normalizedPoint(event, stageRef.current);
    const dx = point.x - active.start.x;
    const dy = point.y - active.start.y;
    const next = masksRef.current.map((mask) => {
      if (mask.id !== active.maskId) return mask;
      if (active.kind === "draw") return { ...mask, ...makeRect(active.start, point) };
      if (active.kind === "drag") return { ...mask, x: clamp(active.initial.x + dx, 0, 1 - active.initial.width), y: clamp(active.initial.y + dy, 0, 1 - active.initial.height) };
      const item = { ...active.initial };
      if (active.edge.includes("l")) { const right = active.initial.x + active.initial.width; item.x = clamp(active.initial.x + dx, 0, right - 0.01); item.width = right - item.x; }
      if (active.edge.includes("r")) item.width = clamp(active.initial.width + dx, 0.01, 1 - item.x);
      if (active.edge.includes("t")) { const bottom = active.initial.y + active.initial.height; item.y = clamp(active.initial.y + dy, 0, bottom - 0.01); item.height = bottom - item.y; }
      if (active.edge.includes("b")) item.height = clamp(active.initial.height + dy, 0.01, 1 - item.y);
      return item;
    });
    changeMasks(next);
  };
  const finishInteraction = (event) => {
    const active = interactionRef.current;
    if (!active || (event?.pointerId !== undefined && active.pointerId !== event.pointerId)) return;
    const current = masksRef.current;
    const created = active.kind === "draw" ? current.find((mask) => mask.id === active.maskId) : null;
    if (active.kind === "draw" && (!created || created.width < 0.008 || created.height < 0.008)) {
      changeMasks(current.filter((mask) => mask.id !== active.maskId)); setSelectedMaskId("");
    } else remember(active.before);
    interactionRef.current = null; setInteraction(null);
  };

  const updateSelectedAnswer = (answer) => {
    if (!selectedMask) return;
    const before = masksRef.current.map((item) => ({ ...item }));
    const next = before.map((mask) => mask.id === selectedMask.id ? { ...mask, answer } : mask);
    changeMasks(next); remember(before);
  };
  const removeSelectedMask = () => {
    if (!selectedMask) return;
    const before = masksRef.current.map((item) => ({ ...item }));
    changeMasks(before.filter((mask) => mask.id !== selectedMask.id)); setSelectedMaskId(""); remember(before);
  };

  const save = async () => {
    if (!draft || saving) return;
    setSaving(true); setError(""); setStatus("");
    try {
      const result = await repository.saveSet({ id: draft.id, title: draft.title, mode: draft.mode, answerMode: draft.answerMode, imagePath: draft.imagePath, imageFile: draft.imageFile, masks: draft.masks });
      setStatus(`Kumpulan “${result.title}” tersimpan dengan ${draft.masks.length} kartu.`);
      setDraft(null); setSelectedMaskId(""); setPreviewOpen(false); await load();
    } catch (saveError) { setError(saveError?.message || "Kumpulan gagal disimpan."); }
    finally { setSaving(false); }
  };

  const deleteSet = async (set) => {
    if (!window.confirm(`Hapus kumpulan “${set.title}”, semua kartu, dan riwayat review Image Occlusion secara permanen?`)) return;
    setError(""); setStatus("");
    try { await repository.deleteSet(set.id); setStatus("Kumpulan dan gambar privat berhasil dihapus."); await load(); }
    catch (deleteError) { setError(deleteError?.message || "Kumpulan gagal dihapus."); }
  };

  const startStudy = async (set, dueOnly = false) => {
    setError("");
    try {
      const allCards = await repository.listCards(set.id);
      const now = Date.now();
      const cards = dueOnly ? allCards.filter((card) => !card.reviewState || Date.parse(card.reviewState.due_at) <= now) : allCards;
      if (!cards.length) { setStatus("Belum ada kartu yang jatuh tempo untuk dikaji."); return; }
      const run = createImageOcclusionRun(set, cards, set.mode);
      if (!writeImageOcclusionRun(window.sessionStorage, run)) throw new Error("Sesi belajar tidak dapat disimpan di browser ini.");
      router.push("/academic/occlusion");
    } catch (studyError) { setError(studyError?.message || "Sesi Image Occlusion gagal dimulai."); }
  };

  return <section className="hub-occlusion-workspace" aria-label="Image Occlusion workspace">
    <header className="hub-occlusion-heading"><div><span>ACADEMIC / IMAGE OCCLUSION</span><h3>Study from the image.</h3><p>Buat kartu dengan mask pada gambar, lalu review setiap bagian secara terpisah.</p></div><button type="button" className="hub-question-add-button" onClick={startNew}><Plus size={16} /> Kumpulan baru</button></header>
    {status && <p className="hub-occlusion-status" role="status"><Check size={15} />{status}</p>}
    {error && <p className="hub-data-error" role="alert">{error}</p>}

    {draft && <section className="hub-occlusion-editor" aria-label="Image Occlusion editor">
      <div className="hub-occlusion-editor-heading"><div><span>{draft.id ? "EDIT IMAGE SET" : "NEW IMAGE SET"}</span><h4>{draft.id ? "Edit kartu dan mask" : "Siapkan gambar"}</h4></div><button type="button" className="hub-occlusion-icon-button" aria-label="Tutup editor" onClick={() => { setDraft(null); setPreviewOpen(false); }}><X size={16} /></button></div>
      <div className="hub-occlusion-form-grid">
        <label><span>Nama kumpulan</span><input value={draft.title} maxLength={120} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="Contoh: Anatomi hepatobilier" /></label>
        <label><span>Mode kartu</span><select value={draft.mode} onChange={(event) => setDraft({ ...draft, mode: event.target.value })}><option value="hide_one">Hide One · satu mask per kartu</option><option value="hide_all">Hide All · semua mask tertutup</option></select></label>
        <label><span>Konten kartu</span><select value={draft.answerMode} onChange={(event) => setDraft({ ...draft, answerMode: event.target.value })}><option value="answer">Mask + jawaban</option><option value="mask_only">Mask saja · tanpa jawaban teks</option></select></label>
      </div>
      <div className="hub-occlusion-upload-row"><label className="hub-occlusion-upload-control"><input ref={fileInputRef} type="file" accept="image/png,image/jpeg,.png,.jpg,.jpeg" onChange={(event) => handleFile(event.target.files?.[0])} aria-label="Upload gambar PNG atau JPG" /><ImagePlus size={15} /><span>{draft.imageFile?.name || (draft.imageUrl ? "Ganti gambar" : "Pilih file gambar")}</span></label><span>PNG / JPG · maksimal 5 MB · gambar privat di Supabase Storage.</span></div>

      {imageUrl ? <div className="hub-occlusion-editor-layout">
        <div className="hub-occlusion-stage-column">
          <div className="hub-occlusion-tools"><span>{draft.masks.length} MASK / {draft.masks.length} KARTU</span><div><button type="button" aria-label="Undo" title="Undo" disabled={!past.length} onClick={undo}><Undo2 size={15} /></button><button type="button" aria-label="Redo" title="Redo" disabled={!future.length} onClick={redo}><Redo2 size={15} /></button><button type="button" disabled={!selectedMask} onClick={removeSelectedMask}><Trash2 size={14} /> Hapus mask</button></div></div>
          <div ref={stageRef} className={`hub-occlusion-stage${interaction ? " is-interacting" : ""}`} onPointerDown={onStagePointerDown} onPointerMove={onPointerMove} onPointerUp={finishInteraction} onPointerCancel={finishInteraction}>
            <img src={imageUrl} alt="Gambar sumber untuk Image Occlusion" draggable="false" />
            <div className="hub-occlusion-stage-overlay">{draft.masks.map((mask, index) => <div key={mask.id} className={`hub-occlusion-mask${selectedMaskId === mask.id ? " is-selected" : ""}`} style={{ left: `${mask.x * 100}%`, top: `${mask.y * 100}%`, width: `${mask.width * 100}%`, height: `${mask.height * 100}%` }} onPointerDown={(event) => beginInteraction(event, "drag", mask)} role="button" tabIndex={0} aria-label={`Mask ${index + 1}${mask.answer ? `: ${mask.answer}` : ""}`} onFocus={() => setSelectedMaskId(mask.id)} onClick={() => setSelectedMaskId(mask.id)}>
              <span>{index + 1}</span>{["tl", "tr", "bl", "br"].map((edge) => <i key={edge} className={`hub-occlusion-handle is-${edge}`} onPointerDown={(event) => beginInteraction(event, "resize", mask, edge)} />)}
            </div>)}</div>
          </div>
          <p className="hub-occlusion-stage-help">Sentuh/klik area gambar untuk menambah mask. Tarik untuk memindahkan; gunakan pegangan sudut untuk resize.</p>
        </div>
        <aside className="hub-occlusion-mask-details">
          <span>MASK DETAILS</span>
          {!selectedMask ? <p>Pilih mask atau buat area baru di gambar.</p> : <>{draft.answerMode === "answer" ? <label><span>Jawaban / label mask {draft.masks.findIndex((mask) => mask.id === selectedMask.id) + 1}</span><textarea rows={4} value={selectedMask.answer} onChange={(event) => updateSelectedAnswer(event.target.value)} placeholder="Isi jawaban yang akan di-reveal" /></label> : <p>Mode mask saja aktif. Reveal akan membuka area gambar tanpa menampilkan jawaban teks.</p>}<small>Posisi tersimpan relatif terhadap ukuran gambar.</small></>}
        </aside>
      </div> : <button type="button" className="hub-occlusion-empty-upload" onClick={() => fileInputRef.current?.click()}><ImagePlus size={18} /><span>Pilih gambar untuk mulai membuat mask</span></button>}

      <footer className="hub-occlusion-editor-actions"><span>{draft.masks.length} kartu akan dihasilkan dari mask yang dibuat.</span><div><button type="button" className="hub-question-tool-button" disabled={!draft.masks.length || !imageUrl} onClick={() => setPreviewOpen(!previewOpen)}>{previewOpen ? "Tutup preview" : "Preview kartu"}</button><button type="button" className="hub-question-add-button" disabled={saving || !imageUrl || !draft.masks.length} onClick={save}><Save size={15} />{saving ? "Menyimpan…" : "Simpan kumpulan"}</button></div></footer>
      {previewOpen && imageUrl && <div className="hub-occlusion-card-preview-grid" aria-label="Preview semua kartu">{draft.masks.map((mask, index) => <article key={mask.id}><div className="hub-occlusion-card-preview-label">{String(index + 1).padStart(2, "0")} / {draft.masks.length}</div><MaskPreview imageUrl={imageUrl} masks={draft.masks} targetIndex={index} mode={draft.mode} answerMode={draft.answerMode} /><strong>{draft.answerMode === "answer" ? mask.answer || "Jawaban belum diisi" : "Mask saja · tanpa jawaban teks"}</strong><small>{draft.mode === "hide_one" ? "HIDE ONE" : "HIDE ALL"}</small></article>)}</div>}
    </section>}

    <div className="hub-occlusion-library-heading"><span>IMAGE SETS</span><span>{sets.length} KUMPULAN</span></div>
    {loading ? <div className="hub-data-state">MEMUAT KUMPULAN GAMBAR…</div> : sets.length === 0 ? <div className="hub-data-state hub-question-empty-state"><span>BELUM ADA IMAGE OCCLUSION</span><p>Unggah gambar untuk mulai membuat kartu berbasis mask.</p><button type="button" className="hub-primary-action" onClick={startNew}><Plus size={15} /> Buat kumpulan pertama</button></div> : <div className="hub-occlusion-set-list">{sets.map((set) => {
      const dueCount = set.cards.filter((card) => !card.reviewState || Date.parse(card.reviewState.due_at) <= Date.now()).length;
      return <article key={set.id} className="hub-occlusion-set-row"><div className="hub-occlusion-set-cover">{set.imageUrl ? <img src={set.imageUrl} alt="" /> : <ImagePlus size={18} />}</div><div className="hub-occlusion-set-info"><span>{set.mode === "hide_one" ? "HIDE ONE" : "HIDE ALL"} · {set.answer_mode === "mask_only" ? "MASK ONLY" : "ANSWER"} · {set.cards.length} KARTU</span><h4>{set.title}</h4><small>{set.cards.filter((card) => card.reviewState?.mastered).length} dikuasai · {dueCount} jatuh tempo</small></div><div className="hub-occlusion-set-actions"><button type="button" aria-label={`Belajar ${set.title}`} disabled={!set.cards.length} onClick={() => startStudy(set)}><Play size={14} /> Belajar</button><button type="button" aria-label={`Review kartu jatuh tempo ${set.title}`} disabled={!dueCount} onClick={() => startStudy(set, true)}><Clock3 size={14} /> Review {dueCount}</button><button type="button" aria-label={`Edit ${set.title}`} onClick={() => editSet(set)}><Pencil size={14} /></button><button type="button" aria-label={`Hapus ${set.title}`} onClick={() => deleteSet(set)}><Trash2 size={14} /></button></div></article>;
    })}</div>}
  </section>;
}
