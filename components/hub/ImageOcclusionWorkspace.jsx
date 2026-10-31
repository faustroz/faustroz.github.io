"use client";
/* eslint-disable @next/next/no-img-element -- private signed images and local editor previews. */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, Clock3, ImagePlus, Pencil, Play, Plus, Redo2, Save, Trash2, Undo2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { requireSupabase } from "@/lib/supabase/client";
import { createImageOcclusionRun, createImageOcclusionRepository, IMAGE_OCCLUSION_MAX_IMAGE_BYTES, IMAGE_OCCLUSION_MIME_TYPES, writeImageOcclusionRun } from "@/lib/hub/image-occlusion.mjs";

const emptyDraft = () => ({ id: null, title: "", mode: "hide_one", answerMode: "answer", activeImageId: null, images: [] });
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
      return <div key={mask.id || index} className={`hub-occlusion-mask${reveal && !maskOnlyOpen ? " is-revealed" : ""}${maskOnlyOpen ? " is-open" : ""}`} style={{ left: `${mask.x * 100}%`, top: `${mask.y * 100}%`, width: `${mask.width * 100}%`, height: `${mask.height * 100}%`, transform: `rotate(${mask.rotation || 0}deg)` }}>{reveal ? (answerMode === "answer" ? mask.answer : "") : index + 1}</div>;
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
  const [saving, setSaving] = useState(false);
  const [interaction, setInteraction] = useState(null);
  const [past, setPast] = useState([]);
  const [future, setFuture] = useState([]);
  const stageRef = useRef(null);
  const masksRef = useRef([]);
  const interactionRef = useRef(null);
  const fileInputRef = useRef(null);
  const objectUrlsRef = useRef(new Map());

  const releaseDraftUrls = (images = []) => {
    for (const image of images) {
      const url = objectUrlsRef.current.get(image.id);
      if (url) URL.revokeObjectURL(url);
      objectUrlsRef.current.delete(image.id);
    }
  };

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const data = await repository.listSets();
      const client = requireSupabase();
      const nextSets = await Promise.all(data.map(async (set) => {
        const sourceImages = set.images?.length ? set.images : [{ id: null, image_path: set.image_path, cards: set.cards }];
        const images = await Promise.all(sourceImages.map(async (image) => {
          const { data: signed, error: signError } = await client.storage.from("academic-question-images").createSignedUrl(image.image_path, 3600);
          return { ...image, imageUrl: signError ? "" : signed?.signedUrl || "" };
        }));
        return { ...set, images, imageUrl: images[0]?.imageUrl || "" };
      }));
      setSets(nextSets);
    } catch (nextError) { setError(nextError?.message || "Kumpulan Image Occlusion gagal dimuat."); }
    finally { setLoading(false); }
  }, [repository]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => () => {
    for (const url of objectUrlsRef.current.values()) URL.revokeObjectURL(url);
    objectUrlsRef.current.clear();
  }, []);

  const activeImage = draft?.images.find((image) => image.id === draft.activeImageId) || draft?.images[0] || null;
  const activeMasks = useMemo(() => activeImage?.masks || [], [activeImage]);
  const allDraftMasks = draft?.images.reduce((total, image) => total + image.masks.length, 0) || 0;
  useEffect(() => { masksRef.current = activeMasks; }, [activeMasks]);

  const selectedMask = activeMasks.find((mask) => mask.id === selectedMaskId) || null;
  const changeMasks = (next) => {
    masksRef.current = next;
    setDraft((current) => current ? { ...current, images: current.images.map((image) => image.id === current.activeImageId ? { ...image, masks: next } : image) } : current);
  };
  const remember = (before) => { setPast((current) => [...current.slice(-39), before]); setFuture([]); };
  const undo = () => {
    if (!past.length || !draft) return;
    const nextPast = past.slice(0, -1);
    const previous = past[past.length - 1];
    setFuture((current) => [activeMasks, ...current]); setPast(nextPast); changeMasks(previous);
  };
  const redo = () => {
    if (!future.length || !draft) return;
    const [next, ...remaining] = future;
    setPast((current) => [...current, activeMasks]); setFuture(remaining); changeMasks(next);
  };

  const startNew = () => { if (draft) releaseDraftUrls(draft.images); setDraft(emptyDraft()); setPast([]); setFuture([]); setSelectedMaskId(""); setPreviewOpen(false); setStatus(""); setError(""); };
  const editSet = (set) => {
    const images = (set.images?.length ? set.images : [{ id: null, image_path: set.image_path, imageUrl: set.imageUrl, cards: set.cards }]).map((image) => ({
      id: image.id || `legacy-${set.id}`,
      imageId: image.id,
      imagePath: image.image_path,
      imageFile: null,
      imageUrl: image.imageUrl,
      masks: (image.cards || set.cards.filter((card) => !card.image_id || card.image_id === image.id)).map(({ id, position, x, y, width, height, rotation_degrees, answer }) => ({ id, position, x: Number(x), y: Number(y), width: Number(width), height: Number(height), rotation: Number(rotation_degrees) || 0, answer: answer || "" })),
    }));
    if (draft) releaseDraftUrls(draft.images);
    const activeImageId = images[0]?.id || null;
    setDraft({ id: set.id, title: set.title, mode: set.mode, answerMode: set.answer_mode || "answer", activeImageId, images });
    masksRef.current = images[0]?.masks || []; setPast([]); setFuture([]); setSelectedMaskId(images[0]?.masks[0]?.id || ""); setPreviewOpen(false); setStatus(""); setError("");
  };

  const handleFiles = (fileList) => {
    const files = [...(fileList || [])];
    if (!files.length) return;
    const valid = files.filter((file) => IMAGE_OCCLUSION_MIME_TYPES.includes(file.type) && file.size <= IMAGE_OCCLUSION_MAX_IMAGE_BYTES);
    const invalidCount = files.length - valid.length;
    const additions = valid.map((file) => {
      const imageId = crypto.randomUUID();
      const imageUrl = URL.createObjectURL(file);
      objectUrlsRef.current.set(imageId, imageUrl);
      return { id: imageId, imageId: null, imagePath: "", imageFile: file, imageUrl, masks: [] };
    });
    setError(invalidCount ? `${invalidCount} file dilewati. Setiap gambar harus PNG, JPG, atau JPEG dan maksimal 5 MB.` : "");
    setDraft((current) => {
      if (!current) { releaseDraftUrls(additions); return current; }
      const images = [...current.images, ...additions];
      return { ...current, images, activeImageId: current.activeImageId || additions[0]?.id || null };
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const selectImage = (image) => {
    setDraft((current) => current ? { ...current, activeImageId: image.id } : current);
    masksRef.current = image.masks;
    setSelectedMaskId(image.masks[0]?.id || "");
    setPast([]); setFuture([]); setPreviewOpen(false);
  };

  const removeImage = (image) => {
    if (image.masks.length && !window.confirm("Menghapus gambar ini juga menghapus mask, kartu, dan jadwal review terkait setelah disimpan. Lanjutkan?")) return;
    const remaining = draft.images.filter((item) => item.id !== image.id);
    releaseDraftUrls([image]);
    const nextActive = image.id === activeImage?.id ? remaining[0] || null : activeImage;
    setDraft((current) => current ? { ...current, images: remaining, activeImageId: nextActive?.id || null } : current);
    masksRef.current = nextActive?.masks || [];
    setSelectedMaskId(nextActive?.masks[0]?.id || ""); setPast([]); setFuture([]); setPreviewOpen(false);
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
      const next = [...before, { id: maskId, position: before.length, x: point.x, y: point.y, width: 0.001, height: 0.001, rotation: 0, answer: "" }];
      changeMasks(next); setSelectedMaskId(maskId);
    } else setSelectedMaskId(maskId);
    const state = { kind, edge, pointerId: event.pointerId, start: point, before, initial, maskId };
    interactionRef.current = state; setInteraction(state);
    try { stageRef.current.setPointerCapture(event.pointerId); } catch { /* Safari may not expose pointer capture for synthetic events. */ }
  };

  const onStagePointerDown = (event) => {
    if (!draft || !activeImage?.imageUrl || (event.target !== stageRef.current && event.target.tagName !== "IMG")) return;
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
  const updateSelectedRotation = (rotation) => {
    if (!selectedMask) return;
    changeMasks(activeMasks.map((mask) => mask.id === selectedMask.id ? { ...mask, rotation } : mask));
  };
  const removeSelectedMask = () => {
    if (!selectedMask) return;
    const before = masksRef.current.map((item) => ({ ...item }));
    changeMasks(before.filter((mask) => mask.id !== selectedMask.id)); setSelectedMaskId(""); remember(before);
  };

  const save = async () => {
    if (!draft || saving || !draft.images.length || draft.images.some((image) => !image.masks.length)) return;
    setSaving(true); setError(""); setStatus("");
    try {
      const result = await repository.saveSet({
        id: draft.id, title: draft.title, mode: draft.mode, answerMode: draft.answerMode,
        images: draft.images.map((image) => ({ id: image.imageId, imagePath: image.imagePath, imageFile: image.imageFile, masks: image.masks })),
      });
      setStatus(`“${result.title}” tersimpan · ${allDraftMasks} kartu · ${draft.images.length} gambar`);
      releaseDraftUrls(draft.images);
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
      <div className="hub-occlusion-editor-heading"><div><span>{draft.id ? "EDIT IMAGE SET" : "NEW IMAGE SET"}</span><h4>{draft.id ? "Edit kartu dan mask" : "Siapkan gambar"}</h4></div><button type="button" className="hub-occlusion-icon-button" aria-label="Tutup editor" onClick={() => { releaseDraftUrls(draft.images); setDraft(null); setPreviewOpen(false); }}><X size={16} /></button></div>
      <div className="hub-occlusion-form-grid">
        <label><span>Nama kumpulan</span><input value={draft.title} maxLength={120} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="Contoh: Anatomi hepatobilier" /></label>
        <label><span>Mode kartu</span><select value={draft.mode} onChange={(event) => setDraft({ ...draft, mode: event.target.value })}><option value="hide_one">Hide One · satu mask per kartu</option><option value="hide_all">Hide All · semua mask tertutup</option></select></label>
        <label><span>Konten kartu</span><select value={draft.answerMode} onChange={(event) => setDraft({ ...draft, answerMode: event.target.value })}><option value="answer">Mask + jawaban</option><option value="mask_only">Mask saja · tanpa jawaban teks</option></select></label>
      </div>
      <div className="hub-occlusion-upload-row"><label className="hub-occlusion-upload-control"><input ref={fileInputRef} type="file" multiple accept="image/png,image/jpeg,.png,.jpg,.jpeg" onChange={(event) => handleFiles(event.target.files)} aria-label="Pilih satu atau beberapa gambar PNG atau JPG" /><ImagePlus size={15} /><span>Tambah gambar</span></label><span>Pilih satu atau beberapa PNG / JPG sekaligus · maksimal 5 MB per gambar.</span></div>

      {draft.images.length > 0 && <div className="hub-occlusion-image-strip" aria-label="Gambar dalam kumpulan">{draft.images.map((image, index) => <div key={image.id} className={`hub-occlusion-image-chip${image.id === activeImage?.id ? " is-active" : ""}`}><button type="button" onClick={() => selectImage(image)} aria-pressed={image.id === activeImage?.id}><img src={image.imageUrl} alt="" /><span>{String(index + 1).padStart(2, "0")} · {image.imageFile?.name || `Gambar ${index + 1}`} · {image.masks.length} mask</span></button><button type="button" className="hub-occlusion-remove-image" aria-label={`Hapus gambar ${index + 1}`} onClick={() => removeImage(image)}><X size={14} /></button></div>)}</div>}

      {activeImage?.imageUrl ? <div className="hub-occlusion-editor-layout">
        <div className="hub-occlusion-stage-column">
          <div className="hub-occlusion-tools"><span>GAMBAR {String(draft.images.findIndex((image) => image.id === activeImage.id) + 1).padStart(2, "0")} · {activeMasks.length} MASK / KARTU</span><div><button type="button" aria-label="Undo" title="Undo" disabled={!past.length} onClick={undo}><Undo2 size={15} /></button><button type="button" aria-label="Redo" title="Redo" disabled={!future.length} onClick={redo}><Redo2 size={15} /></button><button type="button" disabled={!selectedMask} onClick={removeSelectedMask}><Trash2 size={14} /> Hapus mask</button></div></div>
          <div ref={stageRef} className={`hub-occlusion-stage${interaction ? " is-interacting" : ""}`} onPointerDown={onStagePointerDown} onPointerMove={onPointerMove} onPointerUp={finishInteraction} onPointerCancel={finishInteraction}>
            <img src={activeImage.imageUrl} alt={`Gambar ${draft.images.findIndex((image) => image.id === activeImage.id) + 1} untuk Image Occlusion`} draggable="false" />
            <div className="hub-occlusion-stage-overlay">{activeMasks.map((mask, index) => <div key={mask.id} className={`hub-occlusion-mask${selectedMaskId === mask.id ? " is-selected" : ""}`} style={{ left: `${mask.x * 100}%`, top: `${mask.y * 100}%`, width: `${mask.width * 100}%`, height: `${mask.height * 100}%`, transform: `rotate(${mask.rotation || 0}deg)` }} onPointerDown={(event) => beginInteraction(event, "drag", mask)} role="button" tabIndex={0} aria-label={`Mask ${index + 1}${mask.answer ? `: ${mask.answer}` : ""}`} onFocus={() => setSelectedMaskId(mask.id)} onClick={() => setSelectedMaskId(mask.id)}>
              <span>{index + 1}</span>{["tl", "tr", "bl", "br"].map((edge) => <i key={edge} className={`hub-occlusion-handle is-${edge}`} onPointerDown={(event) => beginInteraction(event, "resize", mask, edge)} />)}
            </div>)}</div>
          </div>
          <p className="hub-occlusion-stage-help">Sentuh/klik area gambar untuk menambah mask. Tarik untuk memindahkan; gunakan pegangan sudut untuk resize.</p>
        </div>
        <aside className="hub-occlusion-mask-details">
          <span>MASK DETAILS</span>
          {!selectedMask ? <p>Pilih mask atau buat area baru di gambar.</p> : <><label className="hub-occlusion-rotation-control"><span>Sudut mask <output>{Math.round(selectedMask.rotation || 0)}°</output></span><input type="range" min="-90" max="90" step="1" value={selectedMask.rotation || 0} onChange={(event) => updateSelectedRotation(Number(event.target.value))} aria-label="Sudut rotasi mask" /><small>Geser ke kiri atau kanan untuk mengikuti arah teks.</small></label>{draft.answerMode === "answer" ? <label><span>Jawaban / label mask {activeMasks.findIndex((mask) => mask.id === selectedMask.id) + 1}</span><textarea rows={4} value={selectedMask.answer} onChange={(event) => updateSelectedAnswer(event.target.value)} placeholder="Isi jawaban yang akan di-reveal" /></label> : <p>Mode mask saja aktif. Reveal akan membuka area gambar tanpa menampilkan jawaban teks.</p>}<small>Posisi tersimpan relatif terhadap ukuran gambar.</small></>}
        </aside>
      </div> : <div className="hub-occlusion-empty-upload"><ImagePlus size={18} /><span>{draft.images.length ? "Pilih gambar di atas untuk mulai membuat mask" : "Tambahkan satu atau beberapa gambar untuk mulai"}</span><button type="button" className="hub-question-tool-button" onClick={() => fileInputRef.current?.click()}><Plus size={15} /> Pilih gambar</button></div>}

      <footer className="hub-occlusion-editor-actions"><span>{allDraftMasks} kartu dari {draft.images.length} gambar.</span><div><button type="button" className="hub-question-tool-button" disabled={!allDraftMasks || draft.images.some((image) => !image.imageUrl)} onClick={() => setPreviewOpen(!previewOpen)}>{previewOpen ? "Tutup preview" : "Preview kartu"}</button><button type="button" className="hub-question-add-button" disabled={saving || !draft.images.length || draft.images.some((image) => !image.imageUrl || !image.masks.length)} onClick={save}><Save size={15} />{saving ? "Menyimpan…" : "Simpan kumpulan"}</button></div></footer>
      {previewOpen && <div className="hub-occlusion-card-preview-grid" aria-label="Preview semua kartu">{draft.images.flatMap((image, imageIndex) => image.masks.map((mask, index) => <article key={mask.id}><div className="hub-occlusion-card-preview-label">GAMBAR {String(imageIndex + 1).padStart(2, "0")} · KARTU {String(index + 1).padStart(2, "0")} / {image.masks.length}</div><MaskPreview imageUrl={image.imageUrl} masks={image.masks} targetIndex={index} mode={draft.mode} answerMode={draft.answerMode} /><strong>{draft.answerMode === "answer" ? mask.answer || "Jawaban belum diisi" : "Mask saja · tanpa jawaban teks"}</strong><small>{draft.mode === "hide_one" ? "HIDE ONE" : "HIDE ALL"}</small></article>))}</div>}
    </section>}

    <div className="hub-occlusion-library-heading"><span>IMAGE SETS</span><span>{sets.length} KUMPULAN</span></div>
    {loading ? <div className="hub-data-state">MEMUAT KUMPULAN GAMBAR…</div> : sets.length === 0 ? <div className="hub-occlusion-empty-state"><span className="hub-occlusion-empty-icon"><ImagePlus size={19} /></span><div><h4>Belum ada kumpulan gambar</h4><p>Satukan beberapa gambar, lalu buat mask dan kartu belajar untuk setiap bagian.</p></div><button type="button" className="hub-question-add-button" onClick={startNew}><Plus size={15} /> Buat kumpulan pertama</button></div> : <div className="hub-occlusion-set-list">{sets.map((set) => {
      const dueCount = set.cards.filter((card) => !card.reviewState || Date.parse(card.reviewState.due_at) <= Date.now()).length;
      return <article key={set.id} className="hub-occlusion-set-row"><div className="hub-occlusion-set-cover">{set.imageUrl ? <img src={set.imageUrl} alt="" /> : <ImagePlus size={18} />}</div><div className="hub-occlusion-set-info"><span>{set.mode === "hide_one" ? "HIDE ONE" : "HIDE ALL"} · {set.answer_mode === "mask_only" ? "MASK ONLY" : "ANSWER"} · {set.images.length} GAMBAR · {set.cards.length} KARTU</span><h4>{set.title}</h4><small>{set.cards.filter((card) => card.reviewState?.mastered).length} dikuasai · {dueCount} jatuh tempo</small></div><div className="hub-occlusion-set-actions"><button type="button" aria-label={`Belajar ${set.title}`} disabled={!set.cards.length} onClick={() => startStudy(set)}><Play size={14} /> Belajar</button><button type="button" aria-label={`Review kartu jatuh tempo ${set.title}`} disabled={!dueCount} onClick={() => startStudy(set, true)}><Clock3 size={14} /> Review {dueCount}</button><button type="button" aria-label={`Edit ${set.title}`} onClick={() => editSet(set)}><Pencil size={14} /></button><button type="button" aria-label={`Hapus ${set.title}`} onClick={() => deleteSet(set)}><Trash2 size={14} /></button></div></article>;
    })}</div>}
  </section>;
}
