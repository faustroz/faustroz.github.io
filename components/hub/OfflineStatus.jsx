"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CloudOff, RefreshCw } from "lucide-react";
import { requireSupabase } from "@/lib/supabase/client";
import { createQuestionRepository } from "@/lib/hub/question-bank.mjs";
import { createImageOcclusionRepository } from "@/lib/hub/image-occlusion.mjs";
import { flushQueue, OFFLINE_QUEUE_EVENT, queueSize } from "@/lib/hub/offline-store.mjs";

/** Shows offline state and syncs queued attempts as soon as the connection returns. */
export default function OfflineStatus({ snapshotAt = "" }) {
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);
  const [message, setMessage] = useState("");
  const syncing = useRef(false);

  const refresh = useCallback(() => setPending(queueSize(window.localStorage)), []);

  const sync = useCallback(async () => {
    if (syncing.current || !navigator.onLine || !queueSize(window.localStorage)) return;
    syncing.current = true;
    try {
      const client = requireSupabase();
      const result = await flushQueue({ storage: window.localStorage, repository: createQuestionRepository(client), occlusionRepository: createImageOcclusionRepository(client) });
      setMessage(result.sent ? `${result.sent} jawaban tersinkron.` : result.error);
    } catch (error) {
      setMessage(error?.message || "Sinkronisasi gagal.");
    } finally {
      syncing.current = false;
      refresh();
    }
  }, [refresh]);

  useEffect(() => {
    setOnline(navigator.onLine);
    refresh();
    sync();
    const goOnline = () => { setOnline(true); sync(); };
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    window.addEventListener(OFFLINE_QUEUE_EVENT, refresh);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
      window.removeEventListener(OFFLINE_QUEUE_EVENT, refresh);
    };
  }, [refresh, sync]);

  if (online && !pending && !message && !snapshotAt) return null;
  const snapshotLabel = snapshotAt ? new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(new Date(snapshotAt)) : "";

  return (
    <div className={`hub-offline-status${online ? "" : " is-offline"}`} role="status" aria-live="polite">
      {online ? <RefreshCw aria-hidden="true" /> : <CloudOff aria-hidden="true" />}
      <span>
        {online ? "ONLINE" : "OFFLINE"}
        {snapshotLabel ? ` · bank soal dari cache ${snapshotLabel}` : ""}
        {pending ? ` · ${pending} jawaban menunggu sinkron` : ""}
        {message ? ` · ${message}` : ""}
      </span>
      {online && pending > 0 && <button type="button" onClick={sync}>Sinkronkan</button>}
    </div>
  );
}
