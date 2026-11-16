import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { normalizeSharedImageOcclusionSet } from "../../lib/hub/image-occlusion.mjs";
import {
  buildShareUrl,
  createShareLinkRepository,
  filterSharedQuestions,
  loadSharedContent,
  normalizeSharedQuestionBank,
  readShareTokenFromHash,
} from "../../lib/hub/share-links.mjs";

const TOKEN = "a".repeat(64);

test("share migration keeps links owner-private and exposes only shared content through RPC and signed storage", async () => {
  const sql = await readFile(new URL("../../supabase/migrations/045-academic-share-links.sql", import.meta.url), "utf8");
  assert.match(sql, /kind in \('image_occlusion_set', 'question_bank'\)/);
  assert.match(sql, /enable row level security/);
  assert.match(sql, /create policy "owner select" on public\.academic_share_links for select to authenticated using \(auth\.uid\(\) = user_id\)/);
  assert.match(sql, /token ~ '\^\[0-9a-f\]\{64\}\$'/);
  assert.match(sql, /get_shared_content\(p_token text\)/);
  assert.match(sql, /grant execute on function public\.get_shared_content\(text\) to anon, authenticated/);
  assert.match(sql, /revoke all on function public\.get_shared_image_occlusion_set\(text\) from public, anon, authenticated/);
  assert.match(sql, /bucket_id = 'academic-question-images' and public\.is_shared_academic_image\(name\)/);
  assert.match(sql, /q\.deleted_at is null/);
  assert.doesNotMatch(sql, /grant[^;]*academic_share_links[^;]*\banon\b/);
});

test("readShareTokenFromHash accepts only 64 lowercase hex characters", () => {
  assert.equal(readShareTokenFromHash(`#${TOKEN}`), TOKEN);
  assert.equal(readShareTokenFromHash(TOKEN), TOKEN);
  assert.equal(readShareTokenFromHash(""), null);
  assert.equal(readShareTokenFromHash("#"), null);
  assert.equal(readShareTokenFromHash(`#${"A".repeat(64)}`), null);
  assert.equal(readShareTokenFromHash(`#${"a".repeat(63)}`), null);
  assert.equal(readShareTokenFromHash(`#${TOKEN}&x=1`), null);
});

test("buildShareUrl puts the token in the hash of /share with no trailing slash (GitHub Pages 404s on /share/)", () => {
  assert.equal(buildShareUrl("https://faustroz.github.io/", TOKEN), `https://faustroz.github.io/share#${TOKEN}`);
  assert.equal(buildShareUrl("https://faustroz.github.io", TOKEN), `https://faustroz.github.io/share#${TOKEN}`);
});

test("normalizeSharedImageOcclusionSet orders cards and falls back to the legacy set image", () => {
  const legacy = normalizeSharedImageOcclusionSet({
    title: "Lama",
    image_path: "u/occlusion/legacy.png",
    images: [],
    cards: [
      { id: "c2", image_id: null, position: 1, x: 0.5, y: 0.5, width: 0.1, height: 0.1, rotation_degrees: 0, answer: "dua" },
      { id: "c1", image_id: null, position: 0, x: 0.1, y: 0.1, width: 0.2, height: 0.2, rotation_degrees: 15, answer: "satu" },
    ],
  });
  assert.deepEqual(legacy.cards.map((card) => card.id), ["c1", "c2"]);
  assert.equal(legacy.cards[0].imagePath, "u/occlusion/legacy.png");
  assert.equal(legacy.cards[0].rotation, 15);
  assert.deepEqual(legacy.imagePaths, ["u/occlusion/legacy.png"]);
  assert.equal(legacy.answerMode, "answer");
});

test("normalizeSharedImageOcclusionSet maps cards to their own image and keeps mask_only", () => {
  const set = normalizeSharedImageOcclusionSet({
    title: "Dua gambar",
    answer_mode: "mask_only",
    images: [{ id: "i1", image_path: "p/1.png", position: 0 }, { id: "i2", image_path: "p/2.png", position: 1 }],
    cards: [{ id: "c1", image_id: "i2", position: 0, x: 0, y: 0, width: 0.5, height: 0.5, rotation_degrees: 0, answer: null }],
  });
  assert.equal(set.answerMode, "mask_only");
  assert.equal(set.cards[0].imagePath, "p/2.png");
  assert.equal(set.cards[0].answer, "");
  assert.deepEqual(set.imagePaths, ["p/2.png"]);
});

test("question bank normalizer lists image paths and filters by block and text", () => {
  const bank = normalizeSharedQuestionBank({
    title: "Bank soal",
    questions: [
      { id: "q1", block: "Kardio", topic: "Aritmia", question_text: "Gambar EKG", image_path: "u/1.png", question_type: "mcq", options: { A: "x" } },
      { id: "q2", block: "Respi", topic: "Asma", question_text: "Definisi asma", image_path: null, question_type: "essay", options: {} },
    ],
  });
  assert.deepEqual(bank.imagePaths, ["u/1.png"]);
  assert.deepEqual(filterSharedQuestions(bank.questions, { block: "Kardio" }).map((q) => q.id), ["q1"]);
  assert.deepEqual(filterSharedQuestions(bank.questions, { query: "asma" }).map((q) => q.id), ["q2"]);
  assert.equal(normalizeSharedQuestionBank({ title: "x" }), null);
});

test("loadSharedContent dispatches by kind and signs only that content's images", async () => {
  const signedBuckets = [];
  const storage = {
    from: (bucket) => ({
      createSignedUrls: async (paths) => {
        signedBuckets.push(bucket);
        return { data: paths.map((path) => ({ path, signedUrl: `https://signed/${path}`, error: null })), error: null };
      },
    }),
  };
  const occlusion = {
    rpc: async () => ({
      data: { kind: "image_occlusion_set", payload: { title: "Set", images: [{ id: "i1", image_path: "p/1.png", position: 0 }], cards: [{ id: "c1", image_id: "i1", position: 0, x: 0, y: 0, width: 1, height: 1, rotation_degrees: 0, answer: "ok" }] } },
      error: null,
    }),
    storage,
  };
  const loaded = await loadSharedContent(occlusion, TOKEN);
  assert.equal(loaded.kind, "image_occlusion_set");
  assert.equal(loaded.cards[0].answer, "ok");
  assert.equal(loaded.imageUrls.get("p/1.png"), "https://signed/p/1.png");

  const bank = {
    rpc: async () => ({ data: { kind: "question_bank", payload: { title: "Bank soal", questions: [{ id: "q1", question_type: "essay", image_path: "u/9.png", options: {} }] } }, error: null }),
    storage,
  };
  const loadedBank = await loadSharedContent(bank, TOKEN);
  assert.equal(loadedBank.kind, "question_bank");
  assert.equal(loadedBank.imageUrls.get("u/9.png"), "https://signed/u/9.png");

  assert.deepEqual(signedBuckets, ["academic-question-images", "academic-question-images"]);
});

test("loadSharedContent reports a revoked or unknown link", async () => {
  const client = { rpc: async () => ({ data: null, error: null }), storage: { from: () => ({}) } };
  await assert.rejects(loadSharedContent(client, TOKEN), /Link tidak valid/);
});

test("createShareLinkRepository scopes module links to target_id null and item links to their id", async () => {
  const calls = [];
  const builder = (result) => {
    const query = {
      select: (...args) => { calls.push(["select", ...args]); return query; },
      eq: (...args) => { calls.push(["eq", ...args]); return query; },
      is: (...args) => { calls.push(["is", ...args]); return query; },
      delete: () => { calls.push(["delete"]); return query; },
      insert: (value) => { calls.push(["insert", value]); return query; },
      maybeSingle: async () => result,
      single: async () => result,
      then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
    };
    return query;
  };
  const client = { from: (table) => { calls.push(["from", table]); return builder({ data: { token: TOKEN }, error: null }); } };
  const repo = createShareLinkRepository(client);
  assert.equal(await repo.getShareLink("question_bank"), TOKEN);
  assert.deepEqual(calls.filter(([name]) => name === "is"), [["is", "target_id", null]]);
  calls.length = 0;
  assert.equal(await repo.createShareLink("image_occlusion_set", "set-1"), TOKEN);
  assert.deepEqual(calls.find(([name]) => name === "insert"), ["insert", { kind: "image_occlusion_set", target_id: "set-1" }]);
  calls.length = 0;
  await repo.revokeShareLink("question_bank");
  assert.deepEqual(calls.filter(([name]) => name === "is"), [["is", "target_id", null]]);
  assert.throws(() => createShareLinkRepository({}), /Supabase client/);
});

test("migration 046 adds the auscultation_lab kind and keeps one owner-private RPC", async () => {
  const sql = await readFile(new URL("../../supabase/migrations/046-auscultation-share-link.sql", import.meta.url), "utf8");
  assert.match(sql, /check \(kind in \('image_occlusion_set', 'question_bank', 'auscultation_lab'\)\)/);
  assert.match(sql, /\(kind in \('question_bank', 'auscultation_lab'\) and target_id is null\)/);
  assert.match(sql, /elsif v_link\.kind = 'auscultation_lab' then/);
  assert.match(sql, /grant execute on function public\.get_shared_content\(text\) to anon, authenticated/);
  assert.doesNotMatch(sql, /academic_drug_cards|academic_reference_values/);
});

test("loadSharedContent opens the auscultation lab without signing any image URLs", async () => {
  let signed = false;
  const client = {
    rpc: async () => ({ data: { kind: "auscultation_lab", payload: { title: "Auscultation Lab" } }, error: null }),
    storage: { from: () => ({ createSignedUrls: async () => { signed = true; return { data: [], error: null }; } }) },
  };
  const loaded = await loadSharedContent(client, TOKEN);
  assert.equal(loaded.kind, "auscultation_lab");
  assert.equal(loaded.title, "Auscultation Lab");
  assert.equal(loaded.imageUrls.size, 0);
  assert.equal(signed, false);
});
