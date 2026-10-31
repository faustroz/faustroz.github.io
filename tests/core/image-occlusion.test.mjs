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

test("Hide One is default, Hide All persists, and study runs round-trip without losing per-card schedule", () => {
  const set = { id: "set-1", title: "Anatomi", image_path: "owner/occlusion/a.png" };
  const run = createImageOcclusionRun(set, cards);
  assert.equal(run.mode, "hide_one");
  assert.equal(run.cards.length, 2);
  assert.equal(run.cards[0].reviewState, null);
  const hideAll = createImageOcclusionRun(set, cards, "hide_all");
  const storage = new Map();
  assert.equal(writeImageOcclusionRun({ setItem: (key, value) => storage.set(key, value) }, hideAll), true);
  assert.equal(readImageOcclusionRun({ getItem: (key) => storage.get(key) }).mode, "hide_all");
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
