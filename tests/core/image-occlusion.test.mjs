import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createImageOcclusionRun, isValidImageOcclusionRun, validateOcclusionMasks, writeImageOcclusionRun, readImageOcclusionRun } from "../../lib/hub/image-occlusion.mjs";

const cards = [
  { id: "card-1", position: 0, x: .1, y: .1, width: .2, height: .2, answer: "Label one" },
  { id: "card-2", position: 1, x: .5, y: .5, width: .25, height: .25, answer: "Label two" },
];

test("Image Occlusion masks require normalized bounds and an answer per card", () => {
  assert.equal(validateOcclusionMasks(cards).length, 2);
  assert.throws(() => validateOcclusionMasks([{ ...cards[0], x: .9 }]), /Posisi mask/);
  assert.throws(() => validateOcclusionMasks([{ ...cards[0], answer: " " }]), /Jawaban mask/);
});

test("mask-only cards may omit text answers while answer mode still requires them", () => {
  const masks = validateOcclusionMasks([{ ...cards[0], answer: "" }], "mask_only");
  assert.equal(masks[0].answer, null);
  assert.throws(() => validateOcclusionMasks([{ ...cards[0], answer: "" }], "answer"), /Jawaban mask/);
  assert.throws(() => validateOcclusionMasks(cards, "unknown"), /mode jawaban/i);
});

test("Hide One is default, Hide All persists, and study runs round-trip without losing per-card schedule", () => {
  const set = { id: "set-1", title: "Anatomi", image_path: "owner/occlusion/a.png" };
  const run = createImageOcclusionRun(set, cards);
  assert.equal(run.mode, "hide_one");
  assert.equal(run.answerMode, "answer");
  assert.equal(run.cards.length, 2);
  assert.equal(run.cards[0].reviewState, null);
  const hideAll = createImageOcclusionRun(set, cards, "hide_all");
  const storage = new Map();
  assert.equal(writeImageOcclusionRun({ setItem: (key, value) => storage.set(key, value) }, hideAll), true);
  assert.equal(readImageOcclusionRun({ getItem: (key) => storage.get(key) }).mode, "hide_all");
  const maskOnlyRun = createImageOcclusionRun({ ...set, answer_mode: "mask_only" }, [{ ...cards[0], answer: null }]);
  assert.equal(maskOnlyRun.answerMode, "mask_only");
  assert.equal(maskOnlyRun.cards[0].answer, null);
  const legacyRun = { ...run };
  delete legacyRun.answerMode;
  assert.equal(isValidImageOcclusionRun(legacyRun), true);
  assert.equal(isValidImageOcclusionRun({ ...hideAll, index: 9 }), false);
});

test("Image Occlusion migration is private and does not erase old Question Bank review data", async () => {
  const sql = await readFile(new URL("../../supabase/migrations/038-image-occlusion-study.sql", import.meta.url), "utf8");
  for (const table of ["academic_image_occlusion_sets", "academic_image_occlusion_cards", "academic_image_occlusion_attempts", "academic_image_occlusion_review_state"]) {
    assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`));
    assert.match(sql, new RegExp(`auth\\.uid\\(\\) = user_id`));
  }
  assert.match(sql, /foreign key \(user_id, set_id\).*on delete cascade/i);
  assert.match(sql, /foreign key \(user_id, card_id\).*on delete cascade/i);
  assert.match(sql, /drop trigger if exists track_academic_question_attempt/i);
  assert.match(sql, /revoke all on function public\.rate_academic_question_attempt/i);
  assert.doesNotMatch(sql, /delete\s+from\s+public\.academic_question_attempts|delete\s+from\s+public\.academic_question_review_state|truncate\s+table/i);
});

test("mask-only migration preserves old answer data and accepts null card answers", async () => {
  const sql = await readFile(new URL("../../supabase/migrations/039-image-occlusion-mask-only.sql", import.meta.url), "utf8");
  assert.match(sql, /add column if not exists answer_mode text not null default 'answer'/i);
  assert.match(sql, /alter column answer drop not null/i);
  assert.match(sql, /answer is null or length\(trim\(answer\)\)/i);
  assert.doesNotMatch(sql, /delete\s+from|truncate\s+table|drop\s+table/i);
});

test("multi-image migration backfills legacy collections and scopes image ownership", async () => {
  const sql = await readFile(new URL("../../supabase/migrations/040-image-occlusion-multiple-images.sql", import.meta.url), "utf8");
  assert.match(sql, /academic_image_occlusion_images/);
  assert.match(sql, /select user_id, id, image_path, 0\s+from public\.academic_image_occlusion_sets/i);
  assert.match(sql, /update public\.academic_image_occlusion_cards[\s\S]*set image_id = image\.id/i);
  assert.match(sql, /foreign key \(user_id, image_id\)[\s\S]*references public\.academic_image_occlusion_images\(user_id, id\)[\s\S]*on delete cascade/i);
  assert.match(sql, /auth\.uid\(\) = user_id/);
  assert.doesNotMatch(sql, /delete\s+from|truncate\s+table|drop\s+table/i);
});

test("Image Occlusion runs retain a separate source image path per card", () => {
  const set = { id: "set-1", title: "Anatomi", image_path: "owner/occlusion/a.png", images: [{ image_path: "owner/occlusion/a.png" }] };
  const run = createImageOcclusionRun(set, [
    { ...cards[0], image_id: "image-a", image_path: "owner/occlusion/a.png" },
    { ...cards[1], image_id: "image-b", image_path: "owner/occlusion/b.png" },
  ]);
  assert.equal(run.cards[0].imagePath, "owner/occlusion/a.png");
  assert.equal(run.cards[1].imagePath, "owner/occlusion/b.png");
});

test("Image Occlusion study supports Space reveal and editor offers both card content modes", async () => {
  const study = await readFile(new URL("../../components/hub/ImageOcclusionStudyPage.jsx", import.meta.url), "utf8");
  const editor = await readFile(new URL("../../components/hub/ImageOcclusionWorkspace.jsx", import.meta.url), "utf8");
  assert.match(study, /event\.code !== "Space"/);
  assert.match(study, /aria-keyshortcuts="Space"/);
  assert.match(study, /Area gambar terbuka/);
  assert.match(editor, /value="answer">Mask \+ jawaban/);
  assert.match(editor, /value="mask_only">Mask saja/);
  assert.match(editor, /multiple accept="image\/png,image\/jpeg/);
  assert.match(editor, /hub-occlusion-image-strip/);
});
