import assert from "node:assert/strict";
import test from "node:test";
import { crc32 } from "node:zlib";
import {
  ankiTag,
  buildOcclusionAnkiTsv,
  buildQuestionAnkiTsv,
  createZip,
  drawOcclusionMasks,
  escapeHtml,
  occlusionFileNames,
  toAnkiHtml,
  tsvField,
} from "../../lib/hub/anki-export.mjs";

test("field helpers escape HTML, keep line breaks and quote when needed", () => {
  assert.equal(escapeHtml("a < b & c > d"), "a &lt; b &amp; c &gt; d");
  assert.equal(toAnkiHtml("baris 1\nbaris 2\r\nbaris 3"), "baris 1<br>baris 2<br>baris 3");
  assert.equal(tsvField("plain"), "plain");
  assert.equal(tsvField('ada "kutip"'), '"ada ""kutip"""');
  assert.equal(tsvField("a\tb"), "a b");
  assert.equal(ankiTag("Blok 12"), "Blok_12");
  assert.equal(ankiTag("  sistem (kardio) "), "sistem_kardio");
});

test("question deck has Anki file headers and one card per question", () => {
  const text = buildQuestionAnkiTsv([
    { question_type: "mcq", question_text: "Obat pilihan SVT?", options: { A: "Adenosine", B: "Digoxin" }, correct_answer: "A", explanation: "Memblok AV node.", block: "Blok 12", topic: "Aritmia", exam_type: "UKMPPD", tags: ["ekg"] },
    { question_type: "essay", question_text: "Jelaskan shift to the left.", reference_answer: "Peningkatan neutrofil imatur.", block: "Blok 12" },
  ]);
  const lines = text.trimEnd().split("\n");
  assert.deepEqual(lines.slice(0, 5), ["#separator:tab", "#html:true", "#notetype:Basic", "#deck:4allx::Bank Soal", "#tags column:3"]);
  assert.equal(lines.length, 7);
  const [front, back, tags] = lines[5].split("\t");
  assert.match(front, /Obat pilihan SVT\?<br><br>A\. Adenosine<br>B\. Digoxin/);
  assert.match(back, /<b>Jawaban: A<\/b> — Adenosine/);
  assert.match(back, /Memblok AV node\./);
  assert.equal(tags, "UKMPPD Blok_12 Aritmia ekg");
  assert.match(lines[6], /Jawaban referensi<\/b><br>Peningkatan neutrofil imatur\./);
});

test("occlusion deck points at the exported images and honours mask-only sets", () => {
  const set = { id: "abcdef12-0000", title: "Anatomi: thorax", group_name: "Anatomi thorax", answer_mode: "answer" };
  const card = { id: "c1", answer: "Aorta <asc>" };
  const files = occlusionFileNames(set, 0);
  assert.deepEqual(files, { question: "io_abcdef12_001_q.png", answer: "io_abcdef12_001_a.png" });
  const text = buildOcclusionAnkiTsv(set, [{ card, files }]);
  assert.match(text, /#deck:4allx::Image Occlusion::Anatomi thorax/);
  const [front, back, tags] = text.trimEnd().split("\n").pop().split("\t");
  assert.equal(front, '"<img src=""io_abcdef12_001_q.png"">"');
  assert.match(back, /io_abcdef12_001_a\.png.*Aorta &lt;asc&gt;/);
  assert.equal(tags, "Anatomi_thorax image_occlusion");
  const maskOnly = buildOcclusionAnkiTsv({ ...set, answer_mode: "mask_only" }, [{ card, files }]);
  assert.doesNotMatch(maskOnly, /Aorta/);
});

test("drawOcclusionMasks fills every mask, rotates about the centre and opens the revealed one", () => {
  const calls = [];
  const ctx = new Proxy({}, { get: (_, name) => (...args) => calls.push([name, ...args]), set: (_, name, value) => { calls.push([`set:${name}`, value]); return true; } });
  const masks = [
    { id: "a", x: 0.1, y: 0.2, width: 0.2, height: 0.1, rotation_degrees: 0 },
    { id: "b", x: 0.5, y: 0.5, width: 0.1, height: 0.1, rotation_degrees: 90 },
  ];
  drawOcclusionMasks(ctx, 1000, 500, masks, { activeId: "b" });
  const rects = calls.filter(([name]) => name === "fillRect");
  assert.equal(rects.length, 2);
  assert.deepEqual(calls.find(([name]) => name === "translate"), ["translate", 200, 125]); // centre of mask a
  assert.ok(calls.some(([name, value]) => name === "set:fillStyle" && value === "#f59e0b"));
  assert.ok(calls.some(([name, value]) => name === "rotate" && Math.abs(value - Math.PI / 2) < 1e-9));

  calls.length = 0;
  drawOcclusionMasks(ctx, 1000, 500, masks, { activeId: "b", revealActive: true });
  assert.equal(calls.filter(([name]) => name === "fillRect").length, 1);
});

test("createZip writes stored entries that a reader can walk with matching CRCs", () => {
  const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
  const zip = createZip([{ name: "a_q.png", data: png }, { name: "cards.txt", data: "Ünï\tback\n" }], new Date(2026, 10, 17, 10, 0, 0));
  const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
  const eocd = zip.length - 22;
  assert.equal(view.getUint32(eocd, true), 0x06054b50);
  assert.equal(view.getUint16(eocd + 10, true), 2);
  let pointer = view.getUint32(eocd + 16, true);
  const names = [];
  for (let index = 0; index < 2; index += 1) {
    assert.equal(view.getUint32(pointer, true), 0x02014b50);
    const size = view.getUint32(pointer + 20, true);
    const nameLength = view.getUint16(pointer + 28, true);
    const localOffset = view.getUint32(pointer + 42, true);
    names.push(new TextDecoder().decode(zip.subarray(pointer + 46, pointer + 46 + nameLength)));
    assert.equal(view.getUint32(localOffset, true), 0x04034b50);
    assert.equal(view.getUint32(localOffset + 18, true), size);
    assert.equal(view.getUint32(localOffset + 22, true), size);
    pointer += 46 + nameLength;
  }
  assert.deepEqual(names, ["a_q.png", "cards.txt"]);
  // The first local header (offset 0) carries the CRC-32 of the first entry's bytes.
  assert.equal(view.getUint32(14, true), crc32(png));
});
