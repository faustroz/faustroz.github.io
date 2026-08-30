"use client";

import { useState } from "react";
import { Phone, Search, Tags, Gauge } from "lucide-react";
import { requireSupabase } from "@/lib/supabase/client";

const quotaNumber = (value) => typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;

export default function PhoneLookupPanel() {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const quota = result?.quota;
  const searchQuota = quota?.search;
  const remaining = quotaNumber(searchQuota?.remaining);
  const limit = quotaNumber(searchQuota?.limit);
  const used = quotaNumber(searchQuota?.used);
  const renewDate = typeof quota?.renewDate === "string" && quota.renewDate.trim() ? quota.renewDate : null;
  const hasQuotaResult = result?.kind === "quota" || Boolean(quota);

  const run = async (action) => {
    setLoading(action); setError(""); setResult(null);
    const { data, error: invokeError } = await requireSupabase().functions.invoke("phone-lookup", { body: action === "quota" ? { action } : { action, phone } });
    setLoading("");
    if (invokeError || data?.error) return setError(data?.error || invokeError.message || "Lookup failed.");
    setResult(data?.result || null);
  };

  const quotaSummary = remaining !== null && limit !== null
    ? `${remaining} / ${limit} searches remaining`
    : remaining !== null
      ? `${remaining} searches remaining`
      : "Search quota unavailable";

  return <section className="hub-phone-lookup"><div className="hub-phone-input"><label><span>PHONE NUMBER / ONE AT A TIME</span><input type="tel" autoComplete="tel" inputMode="tel" placeholder="08… or +62…" value={phone} onChange={(event) => setPhone(event.target.value)} /></label><Phone aria-hidden="true" /></div><div className="hub-phone-actions"><button type="button" disabled={Boolean(loading)} onClick={() => run("profile")}><Search /> {loading === "profile" ? "CHECKING…" : "PROFILE"}</button><button type="button" disabled={Boolean(loading)} onClick={() => run("tags")}><Tags /> {loading === "tags" ? "CHECKING…" : "TAGS"}</button><button type="button" disabled={Boolean(loading)} onClick={() => run("quota")}><Gauge /> {loading === "quota" ? "CHECKING…" : "QUOTA"}</button></div>{error && <p className="hub-data-error" role="alert">{error}</p>}{result?.kind === "profile" && <article className="hub-phone-result"><span>PROFILE / EPHEMERAL</span><strong>{result.displayName || "No display name"}</strong><p>{result.phone} · {result.tagCount} tags{result.email ? ` · ${result.email}` : ""}</p></article>}{result?.kind === "tags" && <article className="hub-phone-result"><span>TAGS / EPHEMERAL</span><strong>{result.tagCount} tags</strong><p>{result.tags?.length ? result.tags.join(" · ") : "No tags returned"}</p></article>}{hasQuotaResult && <article className="hub-phone-result"><span>QUOTA / EPHEMERAL</span><strong>{quotaSummary}</strong>{used !== null && <p>{used} searches used</p>}{renewDate && <p>Renews {renewDate}</p>}</article>}<p className="hub-phone-note">Results are shown only for this session and are not saved to Personal Hub.</p></section>;
}
