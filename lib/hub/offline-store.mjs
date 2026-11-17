// Offline support for academic practice: a queue for attempts made without signal,
// a snapshot of the question bank, cached question images, and a tolerant auth check.

export const OFFLINE_QUEUE_KEY = "4allx:academic-offline-queue:v1";
export const OFFLINE_QUEUE_EVENT = "hub:offline-queue";
export const IMAGE_CACHE_NAME = "4allx-academic-images-v1";
export const IMAGE_BUCKET = "academic-question-images";
const MAX_FAILURES = 3;

export function isNetworkError(error, online = typeof navigator === "undefined" ? true : navigator.onLine) {
  if (!online) return true;
  if (error instanceof TypeError) return true;
  return /failed to fetch|networkerror|network request failed|load failed|fetch failed/i.test(String(error?.message || ""));
}

// ── attempt queue ────────────────────────────────────────────────────────────

export function readQueue(storage) {
  try {
    const parsed = JSON.parse(storage?.getItem(OFFLINE_QUEUE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.filter((item) => item && typeof item.type === "string" && item.payload) : [];
  } catch {
    return [];
  }
}

function writeQueue(storage, queue) {
  try {
    storage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
    if (typeof window !== "undefined") window.dispatchEvent(new Event(OFFLINE_QUEUE_EVENT));
    return true;
  } catch {
    return false;
  }
}

export const queueSize = (storage) => readQueue(storage).length;

/** type: "mcq" | "essay" | "complete" | "rating". Returns false when the browser refuses to store it. */
export function enqueueOffline(storage, type, payload, now = new Date()) {
  const queue = readQueue(storage);
  queue.push({ id: `${now.getTime()}-${queue.length}`, type, payload, queuedAt: now.toISOString(), failures: 0 });
  return writeQueue(storage, queue);
}

const SENDERS = {
  mcq: (repository, payload) => repository.recordAttempt(payload),
  essay: (repository, payload) => repository.recordEssayAttempt(payload),
  complete: (repository, payload) => repository.completeSession(payload.sessionId, payload.summary),
  rating: (repository, payload, occlusionRepository) => occlusionRepository.rateCard(payload.cardId, payload.rating),
};

/**
 * Sends queued items in order. A network failure stops the run and keeps everything left.
 * Any other failure counts against the item, which is dropped after MAX_FAILURES tries so one
 * bad row cannot block the rest.
 */
export async function flushQueue({ storage, repository, occlusionRepository, online }) {
  const result = { sent: 0, dropped: 0, remaining: 0, error: "" };
  let queue = readQueue(storage);
  while (queue.length) {
    const [item, ...rest] = queue;
    const send = SENDERS[item.type];
    try {
      if (!send) throw new Error(`Unknown queue item type: ${item.type}`);
      await send(repository, item.payload, occlusionRepository);
      result.sent += 1;
      queue = rest;
    } catch (error) {
      if (isNetworkError(error, online)) { result.error = "Belum ada koneksi."; break; }
      const failures = (item.failures || 0) + 1;
      result.error = error?.message || "Sinkronisasi gagal.";
      if (failures >= MAX_FAILURES) { result.dropped += 1; queue = rest; }
      else { queue = [{ ...item, failures }, ...rest]; break; }
    }
    writeQueue(storage, queue);
  }
  writeQueue(storage, queue);
  result.remaining = queue.length;
  return result;
}

// ── auth tolerance ───────────────────────────────────────────────────────────

/** True when Supabase left a session in storage. Used only while offline, when it cannot refresh the token. */
export function hasStoredAuthSession(storage) {
  try {
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (!key || !/^sb-.+-auth-token$/.test(key)) continue;
      const value = JSON.parse(storage.getItem(key) || "null");
      if (value?.access_token && value?.refresh_token) return true;
    }
  } catch {
    return false;
  }
  return false;
}

// ── question snapshot (IndexedDB) ────────────────────────────────────────────

const DB_NAME = "4allx-academic-offline";
const STORE = "kv";

function openDb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") { reject(new Error("IndexedDB tidak tersedia.")); return; }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function idb(mode, run) {
  const db = await openDb();
  try {
    return await new Promise((resolve, reject) => {
      const request = run(db.transaction(STORE, mode).objectStore(STORE));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
}

export const saveQuestionSnapshot = (snapshot) => idb("readwrite", (store) => store.put({ ...snapshot, savedAt: new Date().toISOString() }, "question-bank")).catch(() => null);
export const loadQuestionSnapshot = () => idb("readonly", (store) => store.get("question-bank")).catch(() => null);

export const saveOcclusionSnapshot = (snapshot) => idb("readwrite", (store) => store.put({ ...snapshot, savedAt: new Date().toISOString() }, "image-occlusion")).catch(() => null);
export const loadOcclusionSnapshot = () => idb("readonly", (store) => store.get("image-occlusion")).catch(() => null);

// ── cached question images (Cache API) ───────────────────────────────────────

export const imageCacheKey = (path) => `/__academic-image/${encodeURIComponent(path)}`;

async function cacheOne(client, path) {
  const cache = await caches.open(IMAGE_CACHE_NAME);
  if (await cache.match(imageCacheKey(path))) return;
  const { data, error } = await client.storage.from(IMAGE_BUCKET).createSignedUrl(path, 300);
  if (error || !data?.signedUrl) return;
  const response = await fetch(data.signedUrl);
  if (response.ok) await cache.put(imageCacheKey(path), response);
}

/** Stores question images for offline use. Best effort: failures are skipped, never thrown. */
export async function cacheQuestionImages(client, paths, { limit = 120, concurrency = 3 } = {}) {
  if (typeof caches === "undefined") return 0;
  const queue = [...new Set(paths.filter(Boolean))].slice(0, limit);
  let done = 0;
  const worker = async () => {
    while (queue.length) {
      const path = queue.shift();
      try { await cacheOne(client, path); done += 1; } catch { /* skip this image */ }
    }
  };
  await Promise.all(Array.from({ length: concurrency }, worker));
  return done;
}

export async function getCachedImageUrl(path) {
  if (typeof caches === "undefined" || !path) return "";
  try {
    const response = await (await caches.open(IMAGE_CACHE_NAME)).match(imageCacheKey(path));
    return response ? URL.createObjectURL(await response.blob()) : "";
  } catch {
    return "";
  }
}
