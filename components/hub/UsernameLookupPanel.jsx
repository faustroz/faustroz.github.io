"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AtSign, ExternalLink, Search, ShieldAlert } from "lucide-react";
import SaveFindingButton from "@/components/hub/SaveFindingButton";
import { normalizeUsernameResponse, usernameFinding } from "@/lib/hub/osint.mjs";
import { requireSupabase } from "@/lib/supabase/client";

export default function UsernameLookupPanel({ onFindings }) {
  const searchParams = useSearchParams();
  const [username, setUsername] = useState("");
  const [topSites, setTopSites] = useState("20");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const requested = searchParams.get("username")?.trim();
    if (requested) setUsername(requested.slice(0, 64));
  }, [searchParams]);

  const run = async (event) => {
    event.preventDefault();
    setLoading(true); setError(""); setResult(null);
    const { data, error: invokeError } = await requireSupabase().functions.invoke("username-lookup", { body: { username, topSites: Number(topSites) } });
    setLoading(false);
    if (invokeError || data?.error) return setError(data?.error || invokeError?.message || "Username lookup failed.");
    const normalized = normalizeUsernameResponse(data);
    setResult(normalized);
    onFindings?.(normalized.results.filter((item) => item.possible || item.suspicious).map((item) => usernameFinding(normalized.username || username.trim(), item)));
  };

  return <section className="hub-username-lookup hub-reveal hub-reveal--2" aria-labelledby="username-lookup-heading">
    <header className="hub-username-heading"><div><span>USERNAME INTELLIGENCE / EPHEMERAL</span><h2 id="username-lookup-heading">Username Lookup</h2><p>Maigret matches are possible leads, never identity confirmation. Results remain private unless you explicitly add one to a case.</p></div></header>
    <form className="hub-username-form" onSubmit={run}>
      <label><span>USERNAME</span><div><AtSign aria-hidden="true" /><input required autoComplete="off" autoCapitalize="none" spellCheck="false" maxLength="64" placeholder="4allx" value={username} onChange={(event) => setUsername(event.target.value)} /></div></label>
      <label><span>SITES TO CHECK</span><select value={topSites} onChange={(event) => setTopSites(event.target.value)}><option value="20">20 sites</option><option value="50">50 sites</option><option value="100">100 sites</option><option value="200">200 sites</option></select></label>
      <button type="submit" disabled={loading}><Search aria-hidden="true" /> {loading ? "CHECKING…" : "LOOK UP"}</button>
    </form>
    {error && <p className="hub-data-error" role="alert">{error}</p>}
    {result && <div className="hub-username-results"><header><span>QUERY / @{result.username || username.trim()}</span><strong>{result.foundCount === null ? "Found count not reported" : `${result.foundCount} possible / found`}</strong><p>{result.checkedCount === null ? "Checked count not reported by provider" : `${result.checkedCount} sites checked`}</p></header>{result.results.length ? <div className="hub-username-result-list">{result.results.map((item) => <article className={`hub-username-result${item.suspicious ? " hub-username-result--review" : ""}`} key={item.id}><div><span>SITE</span><strong>{item.site}</strong></div><div><span>STATUS</span><strong>{item.label}</strong></div><div><span>HTTP</span><strong>{item.httpStatus === null ? "—" : item.httpStatus}</strong></div>{item.tags.length > 0 && <div className="hub-username-tags">{item.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>}{item.suspicious && <p><ShieldAlert aria-hidden="true" /> Rate-limited, blocked, or uncertain — verify manually.</p>}<div className="hub-osint-result-actions">{item.url && <a href={item.url} target="_blank" rel="noreferrer">Open result <ExternalLink aria-hidden="true" /></a>}{(item.possible || item.suspicious) && <SaveFindingButton finding={usernameFinding(result.username || username.trim(), item)} />}</div></article>)}</div> : <div className="hub-data-state">NO SITE RESULTS REPORTED</div>}</div>}
  </section>;
}
