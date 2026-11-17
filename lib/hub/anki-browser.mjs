// Browser-only Anki export: renders Image Occlusion cards to PNG and triggers downloads.
import {
  ANKI_IMPORT_README,
  buildOcclusionAnkiTsv,
  buildQuestionAnkiTsv,
  createZip,
  drawOcclusionMasks,
  occlusionFileNames,
} from "./anki-export.mjs";

const safeName = (value) => String(value || "export").trim().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "export";

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportQuestionsToAnki(questions) {
  const stamp = new Date().toISOString().slice(0, 10);
  downloadBlob(new Blob([buildQuestionAnkiTsv(questions)], { type: "text/tab-separated-values;charset=utf-8" }), `4allx-bank-soal-${stamp}.txt`);
}

async function loadBitmap(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Gambar tidak dapat diunduh. Muat ulang halaman lalu coba lagi.");
  return createImageBitmap(await response.blob());
}

async function renderPng(bitmap, masks, options) {
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(bitmap, 0, 0);
  drawOcclusionMasks(ctx, canvas.width, canvas.height, masks, options);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("Gambar kartu gagal dibuat.");
  return new Uint8Array(await blob.arrayBuffer());
}

/** set: a workspace set with images[{ id, imageUrl }] and cards[{ id, image_id, ... }]. */
export async function exportOcclusionSetToAnki(set) {
  const cards = set.cards || [];
  if (!cards.length) throw new Error("Kumpulan ini belum punya kartu.");
  const entries = [];
  const items = [];
  const bitmaps = new Map();
  try {
    for (const [index, card] of cards.entries()) {
      const image = (set.images || []).find((item) => item.id === card.image_id) || set.images?.[0];
      if (!image?.imageUrl) throw new Error("Gambar belum siap. Tunggu sebentar lalu coba lagi.");
      if (!bitmaps.has(image.imageUrl)) bitmaps.set(image.imageUrl, await loadBitmap(image.imageUrl));
      const bitmap = bitmaps.get(image.imageUrl);
      const masks = cards.filter((item) => item.image_id === card.image_id);
      const files = occlusionFileNames(set, index);
      entries.push({ name: files.question, data: await renderPng(bitmap, masks, { activeId: card.id }) });
      entries.push({ name: files.answer, data: await renderPng(bitmap, masks, { activeId: card.id, revealActive: true }) });
      items.push({ card, files });
    }
  } finally {
    for (const bitmap of bitmaps.values()) bitmap.close?.();
  }
  entries.push({ name: "cards.txt", data: buildOcclusionAnkiTsv(set, items) });
  entries.push({ name: "BACA-DULU.txt", data: ANKI_IMPORT_README });
  downloadBlob(new Blob([createZip(entries)], { type: "application/zip" }), `4allx-io-${safeName(set.title)}.zip`);
}
