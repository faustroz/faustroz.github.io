"use client";

import { useEffect, useMemo, useState } from "react";
import { Copy, Link2 } from "lucide-react";
import { requireSupabase } from "@/lib/supabase/client";
import { buildShareUrl, createShareLinkRepository } from "@/lib/hub/share-links.mjs";

export default function ShareLinkPanel({ kind, targetId = null, title, hint = "" }) {
  const repository = useMemo(() => createShareLinkRepository(requireSupabase()), []);
  const [token, setToken] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    repository.getShareLink(kind, targetId)
      .then((value) => { if (active) { setToken(value); setLoaded(true); } })
      .catch((loadError) => { if (active) { setError(loadError?.message || "Status link gagal dimuat."); setLoaded(true); } });
    return () => { active = false; };
  }, [repository, kind, targetId]);

  const url = token && typeof window !== "undefined" ? buildShareUrl(window.location.origin, token) : "";

  const createLink = async () => {
    setBusy(true); setError("");
    try { setToken(await repository.createShareLink(kind, targetId)); }
    catch (shareError) { setError(shareError?.message || "Link gagal dibuat."); }
    finally { setBusy(false); }
  };

  const revokeLink = async () => {
    if (!window.confirm(`Cabut link “${title}”? Link yang sudah dibagikan tidak bisa dipakai lagi.`)) return;
    setBusy(true); setError("");
    try { await repository.revokeShareLink(kind, targetId); setToken(null); setCopied(false); }
    catch (shareError) { setError(shareError?.message || "Link gagal dicabut."); }
    finally { setBusy(false); }
  };

  const copyLink = async () => {
    setError("");
    try { await navigator.clipboard.writeText(url); setCopied(true); }
    catch { setError("Salin otomatis tidak tersedia. Pilih link lalu salin manual."); }
  };

  return <div className="hub-share-panel">
    {!loaded ? <span>Memeriksa link…</span> : token ? <>
      <input readOnly value={url} aria-label={`Link berbagi ${title}`} onFocus={(event) => event.target.select()} />
      <div className="hub-share-actions">
        <button type="button" className="hub-share-button" onClick={copyLink}><Copy size={14} aria-hidden="true" /> {copied ? "Tersalin" : "Salin link"}</button>
        <button type="button" className="hub-share-button" onClick={revokeLink} disabled={busy}>Cabut link</button>
      </div>
    </> : <button type="button" className="hub-share-button hub-share-button--primary" onClick={createLink} disabled={busy}><Link2 size={14} aria-hidden="true" /> Buat link publik</button>}
    <small>{hint || `Siapa pun yang punya link bisa membuka ${title} tanpa login. Link memuat domain situs ini. Tamu hanya membaca; progres belajar mereka tidak disimpan.`}</small>
    {error && <p className="hub-data-error" role="alert">{error}</p>}
  </div>;
}
