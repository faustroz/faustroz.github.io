// Anki export helpers. Output is a tab-separated text file that Anki imports directly
// (File > Import), plus a stored (uncompressed) ZIP for Image Occlusion cards whose
// images must be copied into the collection.media folder.

const encoder = new TextEncoder();

export const escapeHtml = (value) => String(value ?? "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;");

/** Plain text to an Anki HTML field: escape, then keep line breaks. */
export const toAnkiHtml = (value) => escapeHtml(String(value ?? "").replace(/\r\n?/g, "\n").trim()).replace(/\n/g, "<br>");

/** A tab-separated field. Quoted when it holds a quote or tab, per Anki's CSV rules. */
export function tsvField(value) {
  const text = String(value ?? "").replace(/\t/g, " ");
  return text.includes('"') ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Anki tags are space separated; spaces inside a tag become underscores. */
export function ankiTag(value) {
  return String(value ?? "").trim().replace(/\s+/g, "_").replace(/[^\p{L}\p{N}_:.-]/gu, "");
}

const joinTags = (values) => [...new Set(values.map(ankiTag).filter(Boolean))].join(" ");

function header({ deck, notetype = "Basic", tagsColumn }) {
  return [
    "#separator:tab",
    "#html:true",
    `#notetype:${notetype}`,
    `#deck:${deck}`,
    `#tags column:${tagsColumn}`,
  ];
}

export function buildQuestionAnkiTsv(questions = [], { deck = "4allx::Bank Soal" } = {}) {
  const rows = questions.map((question) => {
    const essay = question.question_type === "essay";
    const options = essay ? [] : Object.keys(question.options || {}).sort();
    const front = [
      toAnkiHtml(question.question_text),
      question.image_path ? "<i>(Soal ini punya gambar di bank soal.)</i>" : "",
      options.length ? options.map((key) => `${key}. ${escapeHtml(question.options[key])}`).join("<br>") : "",
    ].filter(Boolean).join("<br><br>");
    const answerKey = question.correct_answer;
    const back = [
      essay
        ? `<b>Jawaban referensi</b><br>${toAnkiHtml(question.reference_answer)}`
        : `<b>Jawaban: ${escapeHtml(answerKey)}</b>${question.options?.[answerKey] ? ` — ${escapeHtml(question.options[answerKey])}` : ""}`,
      question.explanation ? `<b>Pembahasan</b><br>${toAnkiHtml(question.explanation)}` : "",
    ].filter(Boolean).join("<br><br>");
    const tags = joinTags([question.exam_type, question.block, question.subject, question.topic, ...(Array.isArray(question.tags) ? question.tags : [])]);
    return [front, back, tags].map(tsvField).join("\t");
  });
  return [...header({ deck, tagsColumn: 3 }), ...rows].join("\n") + "\n";
}

export function occlusionFileNames(set, index) {
  const base = `io_${String(set.id || "set").slice(0, 8)}_${String(index + 1).padStart(3, "0")}`;
  return { question: `${base}_q.png`, answer: `${base}_a.png` };
}

export function buildOcclusionAnkiTsv(set, items = []) {
  const showText = set.answer_mode !== "mask_only";
  const tags = joinTags([set.group_name, "image_occlusion"]);
  const rows = items.map(({ card, files }) => {
    const front = `<img src="${files.question}">`;
    const back = `<img src="${files.answer}">${showText && card.answer ? `<br>${toAnkiHtml(card.answer)}` : ""}`;
    return [front, back, tags].map(tsvField).join("\t");
  });
  return [...header({ deck: `4allx::Image Occlusion::${String(set.title || "Set").replace(/:+/g, " ").replace(/\s+/g, " ").trim()}`, tagsColumn: 3 }), ...rows].join("\n") + "\n";
}

/**
 * Paints the masks of one image. The active card is amber on the question side and left
 * open on the answer side. Rotation turns about the mask centre, like the CSS transform.
 */
export function drawOcclusionMasks(ctx, width, height, masks = [], { activeId = null, revealActive = false } = {}) {
  for (const mask of masks) {
    const active = mask.id === activeId;
    if (active && revealActive) continue;
    const w = Number(mask.width) * width;
    const h = Number(mask.height) * height;
    ctx.save();
    ctx.translate(Number(mask.x) * width + w / 2, Number(mask.y) * height + h / 2);
    ctx.rotate(((Number(mask.rotation_degrees) || 0) * Math.PI) / 180);
    ctx.fillStyle = active ? "#f59e0b" : "#1f1f1f";
    ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.restore();
  }
}

export const ANKI_IMPORT_README = [
  "Cara impor ke Anki",
  "1. Salin semua file .png di ZIP ini ke folder collection.media Anki (Tools > Check Media membuka lokasinya).",
  "2. Di Anki pilih File > Import, lalu pilih cards.txt.",
  "3. Pastikan note type Basic dan separator Tab, lalu Import.",
  "",
].join("\n");

let crcTable;
function crc32(bytes) {
  if (!crcTable) {
    crcTable = new Uint32Array(256).map((_, n) => {
      let c = n;
      for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      return c >>> 0;
    });
  }
  let crc = 0xffffffff;
  for (const byte of bytes) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

/** Builds a ZIP with stored (uncompressed) entries. entries: [{ name, data: Uint8Array | string }]. */
export function createZip(entries = [], now = new Date()) {
  const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | Math.floor(now.getSeconds() / 2);
  const dosDate = ((Math.max(1980, now.getFullYear()) - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
  const parts = [];
  const central = [];
  let offset = 0;

  for (const entry of entries) {
    const name = encoder.encode(entry.name);
    const data = typeof entry.data === "string" ? encoder.encode(entry.data) : entry.data;
    const crc = crc32(data);
    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true);
    local.setUint16(6, 0x0800, true); // UTF-8 names
    local.setUint16(8, 0, true); // stored
    local.setUint16(10, dosTime, true);
    local.setUint16(12, dosDate, true);
    local.setUint32(14, crc, true);
    local.setUint32(18, data.length, true);
    local.setUint32(22, data.length, true);
    local.setUint16(26, name.length, true);
    parts.push(new Uint8Array(local.buffer), name, data);

    const dir = new DataView(new ArrayBuffer(46));
    dir.setUint32(0, 0x02014b50, true);
    dir.setUint16(4, 20, true);
    dir.setUint16(6, 20, true);
    dir.setUint16(8, 0x0800, true);
    dir.setUint16(10, 0, true);
    dir.setUint16(12, dosTime, true);
    dir.setUint16(14, dosDate, true);
    dir.setUint32(16, crc, true);
    dir.setUint32(20, data.length, true);
    dir.setUint32(24, data.length, true);
    dir.setUint16(28, name.length, true);
    dir.setUint32(42, offset, true);
    central.push(new Uint8Array(dir.buffer), name);
    offset += 30 + name.length + data.length;
  }

  const centralSize = central.reduce((sum, part) => sum + part.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, entries.length, true);
  end.setUint16(10, entries.length, true);
  end.setUint32(12, centralSize, true);
  end.setUint32(16, offset, true);

  const all = [...parts, ...central, new Uint8Array(end.buffer)];
  const zip = new Uint8Array(all.reduce((sum, part) => sum + part.length, 0));
  let position = 0;
  for (const part of all) { zip.set(part, position); position += part.length; }
  return zip;
}
