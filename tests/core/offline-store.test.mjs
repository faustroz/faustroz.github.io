import assert from "node:assert/strict";
import test from "node:test";
import { enqueueOffline, flushQueue, hasStoredAuthSession, imageCacheKey, isNetworkError, OFFLINE_QUEUE_KEY, queueSize, readQueue } from "../../lib/hub/offline-store.mjs";

function memoryStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    get length() { return data.size; },
    key: (index) => [...data.keys()][index] ?? null,
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => { data.set(key, String(value)); },
  };
}

test("isNetworkError recognises offline state, TypeError and fetch failures only", () => {
  assert.equal(isNetworkError(new Error("anything"), false), true);
  assert.equal(isNetworkError(new TypeError("Failed to fetch"), true), true);
  assert.equal(isNetworkError({ message: "TypeError: NetworkError when attempting to fetch resource." }, true), true);
  assert.equal(isNetworkError({ message: "new row violates row-level security policy" }, true), false);
});

test("queue keeps insertion order and ignores corrupt storage", () => {
  const storage = memoryStorage();
  assert.equal(queueSize(storage), 0);
  assert.equal(enqueueOffline(storage, "mcq", { question_id: "q1" }, new Date(1000)), true);
  assert.equal(enqueueOffline(storage, "essay", { question_id: "q2" }, new Date(2000)), true);
  assert.deepEqual(readQueue(storage).map((item) => [item.type, item.payload.question_id]), [["mcq", "q1"], ["essay", "q2"]]);
  assert.equal(readQueue(memoryStorage({ [OFFLINE_QUEUE_KEY]: "{not json" })).length, 0);
  assert.equal(readQueue(memoryStorage({ [OFFLINE_QUEUE_KEY]: JSON.stringify([{ type: "mcq" }, { type: "mcq", payload: {} }]) })).length, 1);
});

test("flushQueue sends in order and removes what was sent", async () => {
  const storage = memoryStorage();
  enqueueOffline(storage, "mcq", { question_id: "q1" });
  enqueueOffline(storage, "essay", { question_id: "q2" });
  enqueueOffline(storage, "complete", { sessionId: "s1", summary: { score: 1 } });
  const sent = [];
  const repository = {
    recordAttempt: async (payload) => { sent.push(["mcq", payload.question_id]); },
    recordEssayAttempt: async (payload) => { sent.push(["essay", payload.question_id]); },
    completeSession: async (id, summary) => { sent.push(["complete", id, summary.score]); },
  };
  const result = await flushQueue({ storage, repository, online: true });
  assert.deepEqual(sent, [["mcq", "q1"], ["essay", "q2"], ["complete", "s1", 1]]);
  assert.deepEqual(result, { sent: 3, dropped: 0, remaining: 0, error: "" });
  assert.equal(queueSize(storage), 0);
});

test("flushQueue sends Image Occlusion ratings through the occlusion repository", async () => {
  const storage = memoryStorage();
  enqueueOffline(storage, "rating", { cardId: "c1", rating: "good" });
  enqueueOffline(storage, "rating", { cardId: "c2", rating: "again" });
  const rated = [];
  const result = await flushQueue({ storage, repository: {}, occlusionRepository: { rateCard: async (cardId, rating) => { rated.push([cardId, rating]); } }, online: true });
  assert.deepEqual(rated, [["c1", "good"], ["c2", "again"]]);
  assert.equal(result.sent, 2);
  assert.equal(queueSize(storage), 0);
});

test("flushQueue stops on a network error and keeps the rest", async () => {
  const storage = memoryStorage();
  enqueueOffline(storage, "mcq", { question_id: "q1" });
  enqueueOffline(storage, "mcq", { question_id: "q2" });
  let calls = 0;
  const repository = { recordAttempt: async () => { calls += 1; if (calls === 2) throw new TypeError("Failed to fetch"); } };
  const result = await flushQueue({ storage, repository, online: true });
  assert.equal(result.sent, 1);
  assert.equal(result.remaining, 1);
  assert.match(result.error, /koneksi/i);
  assert.deepEqual(readQueue(storage).map((item) => item.payload.question_id), ["q2"]);
});

test("flushQueue drops an item that keeps failing for a non-network reason", async () => {
  const storage = memoryStorage();
  enqueueOffline(storage, "mcq", { question_id: "bad" });
  enqueueOffline(storage, "mcq", { question_id: "good" });
  const repository = { recordAttempt: async (payload) => { if (payload.question_id === "bad") throw new Error("violates row-level security"); } };
  const first = await flushQueue({ storage, repository, online: true });
  assert.equal(first.remaining, 2); // one failure, kept for retry, order preserved
  await flushQueue({ storage, repository, online: true });
  const last = await flushQueue({ storage, repository, online: true });
  assert.equal(last.dropped, 1);
  assert.equal(last.sent, 1);
  assert.equal(queueSize(storage), 0);
});

test("hasStoredAuthSession only trusts a Supabase token entry with both tokens", () => {
  assert.equal(hasStoredAuthSession(memoryStorage()), false);
  assert.equal(hasStoredAuthSession(memoryStorage({ "sb-abc-auth-token": JSON.stringify({ access_token: "a" }) })), false);
  assert.equal(hasStoredAuthSession(memoryStorage({ "sb-abc-auth-token": "not json" })), false);
  assert.equal(hasStoredAuthSession(memoryStorage({ other: "1", "sb-abc-auth-token": JSON.stringify({ access_token: "a", refresh_token: "r" }) })), true);
});

test("imageCacheKey is a stable same-origin key that survives odd paths", () => {
  assert.equal(imageCacheKey("user/occlusion/a b.png"), "/__academic-image/user%2Focclusion%2Fa%20b.png");
});
