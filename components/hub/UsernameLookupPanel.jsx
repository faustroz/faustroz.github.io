"use client";

import { useState } from "react";
import { AtSign, ExternalLink, Search, ShieldAlert } from "lucide-react";
import { requireSupabase } from "@/lib/supabase/client";

const number = (value) => typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
const text = (value, limit = 240) => typeof value === "string" ? value.trim().slice(0, limit) : "";
const resultsFrom = (value) => Array.isArray(value) ? value : Array.isArray(value?.results) ? value.results : Array.isArray(value?.sites) ? value.sites : Array.isArray(value?.data) ? value.data : [];
const tagsFrom = (value) => Array.isArray(value) ? value.map((tag) => text(typeof tag === "string" ? tag : tag?.name || tag?.tag, 64)).filter(Boolean) : [];

function normalizeResult(item, index) {
  const source = item && typeof item === "object" ? item : {};
  const statusValue = source.status ?? source.state ?? source.result ?? source.found ?? source.exists;
  const rawStatus = typeof statusValue === "boolean" ? (statusValue ? "found" : "not found") : text(statusValue, 80).toLowerCase();
  const httpStatus = number(source.httpStatus ?? source.http_status ?? source.statusCode ?? source.status_code);
  const suspicious = httpStatus === 429 || /block|rate|captcha|uncertain|unknown|error|fail/.test(rawStatus);
  const possible = Boolean(source.found ?? source.exists ?? source.isFound ?? source.is_found)
    || /found|claimed|available|possible|exists/.test(rawStatus);

  return {
    id: text(source.id || source.site || source.name || source.site_name, 100) || `site-${index}`,
    site: text(source.site || source.name || source.site_name || source.platform, 100) || "Unnamed site",
    url: text(source.url || source.profileUrl || source.profile_url || source.link, 500),
    httpStatus,
    tags: tagsFrom(source.tags || source.categories),
    suspicious,
    label: suspicious ? "Needs review" : possible ? "Possible / Found" : rawStatus ? rawStatus : "Not reported",
  };
}

function normalizeResponse(data) {
  const payload = data?.result || data?.data || data || {};
  const responseUsername = text(payload.username || payload.query || payload.handle, 64);
  const foundCount = number(payload.foundCount ?? payload.found_count ?? payload.found ?? payload.matches);
  const checkedCount = number(payload.checkedCount ?? payload.checked_count ?? payload.checked ?? payload.total);
  return {
    username: responseUsername,
    foundCount,
    checkedCount,
    results: resultsFrom(payload).map(normalizeResult),
  };
}

export default function UsernameLookupPanel() {
  const [username, setUsername] = useState("");
  const [topSites, setTopSites] = useState("20");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const run = async (event) => {
    event.preventDefault();
    setLoading(true); setError(""); setResult(null);
    const { data, error: invokeError } = await requireSupabase().functions.invoke("username-lookup", {
      body: { username, topSites: Number(topSites) },
    });
    setLoading(false);
    if (invokeError || data?.error) return setError(data?.error || invokeError?.message || "Username lookup failed.");
    setResult(normalizeResponse(data));
  };

  return <section className="hub-username-lookup hub-reveal hub-reveal--2" aria-labelledby="username-lookup-heading">
    <header className="hub-username-heading"><div><span>USERNAME INTELLIGENCE / EPHEMERAL</span><h2 id="username-lookup-heading">Username Lookup</h2><p>Maigret matches are possible leads, never identity confirmation. Results are private to this session.</p></div></header>
    <form className="hub-username-form" onSubmit={run}>
      <label><span>USERNAME</span><div><AtSign aria-hidden="true" /><input required autoComplete="off" autoCapitalize="none" spellCheck="false" maxLength="64" placeholder="4allx" value={username} onChange={(event) => setUsername(event.target.value)} /></div></label>
      <label><span>SITES TO CHECK</span><select value={topSites} onChange={(event) => setTopSites(event.target.value)}><option value="20">20 sites</option><option value="50">50 sites</option><option value="100">100 sites</option><option value="200">200 sites</option></select></label>
      <button type="submit" disabled={loading}><Search aria-hidden="true" /> {loading ? "CHECKING…" : "LOOK UP"}</button>
    </form>
    {error && <p className="hub-data-error" role="alert">{error}</p>}
    {result && <div className="hub-username-results"><header><span>QUERY / @{result.username || username.trim()}</span><strong>{result.foundCount === null ? "Found count not reported" : `${result.foundCount} possible / found`}</strong><p>{result.checkedCount === null ? "Checked count not reported by provider" : `${result.checkedCount} sites checked`}</p></header>{result.results.length ? <div className="hub-username-result-list">{result.results.map((item) => <article className={`hub-username-result${item.suspicious ? " hub-username-result--review" : ""}`} key={item.id}><div><span>SITE</span><strong>{item.site}</strong></div><div><span>STATUS</span><strong>{item.label}</strong></div><div><span>HTTP</span><strong>{item.httpStatus === null ? "—" : item.httpStatus}</strong></div>{item.tags.length > 0 && <div className="hub-username-tags">{item.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>}{item.suspicious && <p><ShieldAlert aria-hidden="true" /> Rate-limited, blocked, or uncertain — verify manually.</p>}{item.url && <a href={item.url} target="_blank" rel="noreferrer">Open result <ExternalLink aria-hidden="true" /></a>}</article>)}</div> : <div className="hub-data-state">NO SITE RESULTS REPORTED</div>}</div>}
  </section>;
}
