import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { applyImageOcclusionRating, createImageOcclusionCardPayloads, createImageOcclusionImagePayloads, createImageOcclusionRun, getImageOcclusionRatingFromKey, groupCardsByImage, isValidImageOcclusionRun, readImageOcclusionRun, readImageOcclusionShuffleSetting, shuffleArray, shuffleCardsByImage, validateOcclusionMasks, writeImageOcclusionRun, writeImageOcclusionShuffleSetting } from "../../lib/hub/image-occlusion.mjs";
import { DEFAULT_IMAGE_OCCLUSION_SOUND_SETTINGS, IMAGE_OCCLUSION_SOUND_EVENTS, IMAGE_OCCLUSION_SOUND_SETTINGS_KEY, playImageOcclusionSound, readImageOcclusionSoundSettings, writeImageOcclusionSoundSettings } from "../../lib/hub/image-occlusion-sounds.mjs";

const cards = [
  { id: "card-1", position: 0, x: .1, y: .1, width: .2, height: .2, answer: "Label one" },
  { id: "card-2", position: 1, x: .5, y: .5, width: .25, height: .25, answer: "Label two" },
];

test("Image Occlusion keyboard rating shortcuts map 1 through 4 to Again through Easy", () => {
  assert.deepEqual(["1", "2", "3", "4"].map(getImageOcclusionRatingFromKey), ["again", "hard", "good", "easy"]);
  assert.equal(getImageOcclusionRatingFromKey("5"), null);
});

test("rating an Image Occlusion card records the rating and immediately advances without losing prior responses", () => {
  const run = createImageOcclusionRun({ id: "set-1", image_path: "owner/image.png" }, cards);
  const nextRun = applyImageOcclusionRating(run, 0, "good");
  assert.equal(nextRun.index, 1);
  assert.deepEqual(nextRun.responses, [{ revealed: false, rating: "good", saved: false }, { revealed: false, rating: null, saved: false }]);
  assert.equal(applyImageOcclusionRating(nextRun, 1, "easy").index, 1);
  assert.equal(applyImageOcclusionRating(run, 0, "invalid"), run);
});

test("Image Occlusion sound settings default on, persist locally, clamp volume, and sound off is silent", () => {
  const values = new Map();
  const storage = { getItem: (key) => values.get(key) || null, setItem: (key, value) => values.set(key, value) };
  assert.deepEqual(readImageOcclusionSoundSettings(storage), DEFAULT_IMAGE_OCCLUSION_SOUND_SETTINGS);
  assert.equal(writeImageOcclusionSoundSettings(storage, { enabled: true, volume: 160 }), true);
  assert.deepEqual(readImageOcclusionSoundSettings(storage), { enabled: true, volume: 100 });
  assert.equal(writeImageOcclusionSoundSettings(storage, { enabled: false, volume: -10 }), true);
  assert.deepEqual(readImageOcclusionSoundSettings(storage), { enabled: false, volume: 0 });

  const createdOscillators = [];
  const mockParameter = () => ({ setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}, cancelScheduledValues() {}, setTargetAtTime() {} });
  class MockAudioContext {
    constructor() { this.state = "running"; this.currentTime = 1; this.destination = {}; }
    createOscillator() {
      const oscillator = { frequency: mockParameter(), connect() {}, start() {}, stop() { this.stopped = true; } };
      createdOscillators.push(oscillator);
      return oscillator;
    }
    createGain() { return { gain: mockParameter(), connect() {} }; }
    resume() { return Promise.resolve(); }
  }
  const windowLike = { AudioContext: MockAudioContext, localStorage: storage };
  assert.equal(IMAGE_OCCLUSION_SOUND_EVENTS.length, 10);
  assert.equal(playImageOcclusionSound("reveal", windowLike), false);
  assert.equal(createdOscillators.length, 0);
  writeImageOcclusionSoundSettings(storage, { enabled: true, volume: 35 });
  assert.equal(playImageOcclusionSound("reveal", windowLike), true);
  const beforeNext = createdOscillators.length;
  assert.equal(playImageOcclusionSound("next", windowLike), true);
  assert.ok(createdOscillators.slice(0, beforeNext).every((oscillator) => oscillator.stopped));
  assert.equal(playImageOcclusionSound("unknown", windowLike), false);
});

test("Image Occlusion masks require normalized bounds and an answer per card", () => {
  assert.equal(validateOcclusionMasks(cards).length, 2);
  assert.equal(validateOcclusionMasks([{ ...cards[0], rotation: -24 }])[0].rotation, -24);
  assert.throws(() => validateOcclusionMasks([{ ...cards[0], x: .9 }]), /Posisi mask/);
  assert.throws(() => validateOcclusionMasks([{ ...cards[0], rotation: 181 }]), /Sudut mask/);
  assert.throws(() => validateOcclusionMasks([{ ...cards[0], answer: " " }]), /Jawaban mask/);
});

test("mask-only cards may omit text answers while answer mode still requires them", () => {
  const masks = validateOcclusionMasks([{ ...cards[0], answer: "" }], "mask_only");
  assert.equal(masks[0].answer, null);
  assert.throws(() => validateOcclusionMasks([{ ...cards[0], answer: "" }], "answer"), /Jawaban mask/);
  assert.throws(() => validateOcclusionMasks(cards, "unknown"), /mode jawaban/i);
});

test("new Image Occlusion cards always get an id and existing card ids are preserved on save", () => {
  const images = [{
    imagePath: "owner/occlusion/image.png",
    masks: validateOcclusionMasks([
      { ...cards[0], id: null },
      { ...cards[1], id: "existing-card" },
    ]),
  }];
  const payloads = createImageOcclusionCardPayloads(
    images,
    "set-id",
    new Map([["owner/occlusion/image.png", { id: "image-id" }]]),
    new Set(["existing-card"]),
    () => "generated-card-id",
  );
  assert.equal(payloads[0].id, "generated-card-id");
  assert.equal(payloads[1].id, "existing-card");
  assert.ok(payloads.every((payload) => typeof payload.id === "string" && payload.id.length > 0));
  assert.deepEqual(payloads.map(({ position }) => position), [0, 1]);
});

test("new Image Occlusion images always get an explicit id and existing image ids are preserved on upsert", () => {
  const images = [
    { id: null, imagePath: "owner/occlusion/new-img.png" },
    { id: "existing-img", imagePath: "owner/occlusion/existing-img.png" },
  ];
  const payloads = createImageOcclusionImagePayloads(
    images,
    "set-id",
    new Set(["existing-img"]),
    () => "generated-img-id",
  );
  assert.equal(payloads[0].id, "generated-img-id");
  assert.equal(payloads[1].id, "existing-img");
  assert.ok(payloads.every((payload) => typeof payload.id === "string" && payload.id.length > 0));
  assert.deepEqual(payloads.map(({ position }) => position), [0, 1]);
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

test("mask rotation migration preserves existing masks with a neutral angle", async () => {
  const sql = await readFile(new URL("../../supabase/migrations/041-image-occlusion-mask-rotation.sql", import.meta.url), "utf8");
  assert.match(sql, /add column if not exists rotation_degrees smallint not null default 0/i);
  assert.match(sql, /check \(rotation_degrees between -180 and 180\)/i);
  assert.doesNotMatch(sql, /delete\s+from|truncate\s+table|drop\s+table/i);
});

test("Image Occlusion runs retain a separate source image path per card", () => {
  const set = { id: "set-1", title: "Anatomi", image_path: "owner/occlusion/a.png", images: [{ image_path: "owner/occlusion/a.png" }] };
  const run = createImageOcclusionRun(set, [
    { ...cards[0], image_id: "image-a", image_path: "owner/occlusion/a.png" },
    { ...cards[1], image_id: "image-b", image_path: "owner/occlusion/b.png" },
  ], "hide_one", { shuffle: false });
  assert.equal(run.cards[0].imagePath, "owner/occlusion/a.png");
  assert.equal(run.cards[1].imagePath, "owner/occlusion/b.png");
  const rotated = createImageOcclusionRun(set, [{ ...cards[0], rotation_degrees: 31 }]);
  assert.equal(rotated.cards[0].rotation, 31);
});

test("Image Occlusion study runs shuffle cards by default and preserve all cards and responses", () => {
  const set = { id: "set-1", title: "Anatomi", image_path: "owner/occlusion/a.png" };
  const testCards = [
    { id: "c-1", position: 0, x: .1, y: .1, width: .2, height: .2, answer: "A" },
    { id: "c-2", position: 1, x: .2, y: .2, width: .2, height: .2, answer: "B" },
    { id: "c-3", position: 2, x: .3, y: .3, width: .2, height: .2, answer: "C" },
    { id: "c-4", position: 3, x: .4, y: .4, width: .2, height: .2, answer: "D" },
    { id: "c-5", position: 4, x: .5, y: .5, width: .2, height: .2, answer: "E" },
  ];
  const run = createImageOcclusionRun(set, testCards);
  assert.equal(run.cards.length, 5);
  assert.equal(run.responses.length, 5);
  const ids = new Set(run.cards.map((c) => c.id));
  assert.equal(ids.size, 5);
  for (const c of testCards) {
    assert.ok(ids.has(c.id));
  }
  const reversedRun = createImageOcclusionRun(set, testCards, "hide_one", { random: () => 0 });
  assert.deepEqual(reversedRun.cards.map((c) => c.id), ["c-2", "c-3", "c-4", "c-5", "c-1"]);
  const unShuffled = createImageOcclusionRun(set, testCards, "hide_one", { shuffle: false });
  assert.deepEqual(unShuffled.cards.map((c) => c.id), ["c-1", "c-2", "c-3", "c-4", "c-5"]);
});

test("Image Occlusion grouped shuffle randomizes images and masks within each image, completing one image before the next", () => {
  const set = {
    id: "set-multi",
    title: "Multi-image anatomy",
    image_path: "owner/occlusion/img-a.png",
    images: [
      { id: "img-a", image_path: "owner/occlusion/img-a.png" },
      { id: "img-b", image_path: "owner/occlusion/img-b.png" },
      { id: "img-c", image_path: "owner/occlusion/img-c.png" },
    ],
  };

  const cardsMulti = [
    { id: "card-a1", image_id: "img-a", image_path: "owner/occlusion/img-a.png", position: 0, x: .1, y: .1, width: .2, height: .2, answer: "A1" },
    { id: "card-a2", image_id: "img-a", image_path: "owner/occlusion/img-a.png", position: 1, x: .2, y: .2, width: .2, height: .2, answer: "A2" },
    { id: "card-a3", image_id: "img-a", image_path: "owner/occlusion/img-a.png", position: 2, x: .3, y: .3, width: .2, height: .2, answer: "A3" },
    { id: "card-b1", image_id: "img-b", image_path: "owner/occlusion/img-b.png", position: 3, x: .1, y: .1, width: .2, height: .2, answer: "B1" },
    { id: "card-b2", image_id: "img-b", image_path: "owner/occlusion/img-b.png", position: 4, x: .2, y: .2, width: .2, height: .2, answer: "B2" },
    { id: "card-c1", image_id: "img-c", image_path: "owner/occlusion/img-c.png", position: 5, x: .1, y: .1, width: .2, height: .2, answer: "C1" },
    { id: "card-c2", image_id: "img-c", image_path: "owner/occlusion/img-c.png", position: 6, x: .2, y: .2, width: .2, height: .2, answer: "C2" },
    { id: "card-c3", image_id: "img-c", image_path: "owner/occlusion/img-c.png", position: 7, x: .3, y: .3, width: .2, height: .2, answer: "C3" },
    { id: "card-c4", image_id: "img-c", image_path: "owner/occlusion/img-c.png", position: 8, x: .4, y: .4, width: .2, height: .2, answer: "C4" },
  ];

  const groups = groupCardsByImage(cardsMulti);
  assert.equal(groups.length, 3);
  assert.equal(groups[0].length, 3);
  assert.equal(groups[1].length, 2);
  assert.equal(groups[2].length, 4);

  // 1. Grouped shuffle test: cards for each image must stay clustered
  const run = createImageOcclusionRun(set, cardsMulti, "hide_one", { shuffle: true });
  assert.equal(run.cards.length, 9);
  assert.equal(run.shuffle, true);

  // Helper checking no interleaving between images
  const seenImages = new Set();
  let currentImage = null;
  for (const card of run.cards) {
    if (card.imageId !== currentImage) {
      assert.ok(!seenImages.has(card.imageId), `Image ${card.imageId} appeared again after switching! Masks of one image must be completed before moving to another.`);
      seenImages.add(card.imageId);
      currentImage = card.imageId;
    }
  }
  assert.equal(seenImages.size, 3);

  // 2. Turn off shuffle: exact sequence is preserved
  const runUnshuffled = createImageOcclusionRun(set, cardsMulti, "hide_one", { shuffle: false });
  assert.equal(runUnshuffled.shuffle, false);
  assert.deepEqual(runUnshuffled.cards.map((c) => c.id), cardsMulti.map((c) => c.id));

  // 3. Shuffle setting read/write storage round-trip
  const store = new Map();
  const mockStorage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) };
  assert.equal(readImageOcclusionShuffleSetting(mockStorage), true); // default ON
  assert.equal(writeImageOcclusionShuffleSetting(mockStorage, false), true);
  assert.equal(readImageOcclusionShuffleSetting(mockStorage), false); // turned OFF
  assert.equal(writeImageOcclusionShuffleSetting(mockStorage, true), true);
  assert.equal(readImageOcclusionShuffleSetting(mockStorage), true); // turned ON
});

test("Image Occlusion study supports Space reveal and editor offers both card content modes", async () => {
  const study = await readFile(new URL("../../components/hub/ImageOcclusionStudyPage.jsx", import.meta.url), "utf8");
  const editor = await readFile(new URL("../../components/hub/ImageOcclusionWorkspace.jsx", import.meta.url), "utf8");
  assert.match(study, /event\.code !== "Space"/);
  assert.match(study, /pendingRatings/);
  assert.match(study, /getImageOcclusionRatingFromKey\(event\.key\)/);
  assert.match(study, /isContentEditable \|\| \["INPUT", "TEXTAREA", "SELECT"\]/);
  assert.match(study, /1 Again · 2 Hard · 3 Good · 4 Easy/);
  assert.match(study, /applyImageOcclusionRating\(current, targetIndex, rating\)/);
  assert.match(study, /Optimistically move to the next card; persistence runs in the background/);
  assert.doesNotMatch(study, /Menyimpan\.\.\./);
  assert.match(study, /is-mask-only-open/);
  assert.match(study, /playImageOcclusionSound\(rating, window\)/);
  assert.match(study, /sessionComplete/);
  assert.match(study, /hub-occlusion-completion-check/);
  assert.match(study, /responses\.map\(\(item\) => \(\{ \.\.\.item, revealed: false \}\)\)/);
  assert.match(study, /mask\.id === card\.id \? " is-current"/);
  assert.match(study, /hub-occlusion-study-mask-number/);
  const styles = await readFile(new URL("../../app/hub.css", import.meta.url), "utf8");
  assert.match(styles, /hub-occlusion-mask\.is-current \{[^}]*overflow:visible/);
  assert.match(styles, /hub-occlusion-study-mask-number[^}]*font-size:\.9rem/);
  assert.match(study, /aria-keyshortcuts="Space"/);
  assert.match(study, /Area gambar terbuka/);
  assert.match(editor, /value="answer">Mask \+ jawaban/);
  assert.match(editor, /value="mask_only">Mask saja/);
  assert.match(editor, /multiple accept="image\/png,image\/jpeg/);
  assert.match(editor, /hub-occlusion-image-strip/);
  assert.match(editor, /aria-label="Sudut rotasi mask"/);
  assert.match(editor, /rotate\(\$\{mask\.rotation \|\| 0\}deg\)/);
  assert.match(editor, /playImageOcclusionSound\("save", window\)/);
  assert.match(editor, /hub-occlusion-shuffle-button/);
  assert.match(editor, /readImageOcclusionShuffleSetting/);
  assert.match(styles, /hub-occlusion-shuffle-button/);
  const settings = await readFile(new URL("../../components/hub/SettingsPanel.jsx", import.meta.url), "utf8");
  assert.match(settings, /Sound Effects/);
  assert.match(settings, /Sound effect volume/);
});
