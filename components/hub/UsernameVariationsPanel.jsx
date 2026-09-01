"use client";

import { useMemo, useState } from "react";
import { CheckCheck, ScanSearch, WandSparkles, X } from "lucide-react";
import SaveFindingButton from "@/components/hub/SaveFindingButton";
import { generateUsernameVariations, normalizeUsernameResponse, usernameFinding } from "@/lib/hub/osint.mjs";
import { requireSupabase } from "@/lib/supabase/client";

const statusLabel = { queued: "QUEUED", running: "SCANNING", complete: "COMPLETE", failed: "FAILED" };

export default function UsernameVariationsPanel({ onFindings }) {
  const [input, setInput] = useState("");
  const variations = useMemo(() => generateUsernameVariations(input), [input]);
  const [selected, setSelected] = useState([]);
  const [results, setResults] = useState([]);
  const [progress, setProgress] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const toggle = (value) => setSelected((current) => current.includes(value) ? current.filter((item) => item !== value) : current.length < 5 ? [...current, value] : current);
  const generate = () => { setSelected(variations.slice(0, 3)); setResults([]); setProgress({}); setError(""); };
  const selectAll = () => setSelected(variations.slice(0, 5));
  const clear = () => setSelected([]);
  const scan = async () => {
    setLoading(true); setError(""); setResults([]);
    setProgress(Object.fromEntries(selected.map((username) => [username, "queued"])));
    const collected = [];
    for (const username of selected) {
      setProgress((current) => ({ ...current, [username]: "running" }));
      const { data, error: invokeError } = await requireSupabase().functions.invoke("username-lookup", { body: { username, topSites: 20 } });
      if (invokeError || data?.error) {
        const failed = { username, error: data?.error || invokeError?.message || "Scan failed." };
        collected.push(failed); setResults([...collected]); setProgress((current) => ({ ...current, [username]: "failed" })); continue;
      }
      const normalized = normalizeUsernameResponse(data);
      const findings = normalized.results.filter((item) => item.possible || item.suspicious).map((item) => usernameFinding(username, item));
      collected.push({ username, normalized, findings });
      setResults([...collected]); setProgress((current) => ({ ...current, [username]: "complete" }));
    }
    setLoading(false);
    const graphFindings = collected.flatMap((item) => item.findings || []);
    onFindings?.(graphFindings);
    if (!collected.length || collected.every((item) => item.error)) setError("No variation scan completed. Review each failed row and try again.");
  };

  return <section className="hub-osint-panel" aria-labelledby="username-variations-heading">
    <header className="hub-osint-section-head"><div><span>CONTROLLED PERMUTATIONS</span><h2 id="username-variations-heading">Username Variations</h2><p>Generate a compact set of useful variants. Select up to five for the existing 20-site quick scan.</p></div><WandSparkles aria-hidden="true" /></header>
    <div className="hub-osint-inline-form"><label>BASE USERNAME<input value={input} maxLength={64} autoCapitalize="none" autoComplete="off" spellCheck="false" onChange={(event) => setInput(event.target.value)} placeholder="made.ferdy" /></label><button type="button" onClick={generate} disabled={!variations.length}>GENERATE</button></div>
    {variations.length > 0 && <><div className="hub-osint-selection-tools"><button type="button" onClick={selectAll}><CheckCheck /> SELECT ALL <span>MAX 5</span></button><button type="button" onClick={clear} disabled={!selected.length}><X /> CLEAR</button><small>{selected.length} / 5 selected</small></div><div className="hub-osint-variation-grid">{variations.map((value) => <label key={value} className={selected.includes(value) ? "is-selected" : ""}><input type="checkbox" checked={selected.includes(value)} onChange={() => toggle(value)} /><span>@{value}</span></label>)}</div><div className="hub-osint-action-row"><small>Scans run one at a time to preserve the existing private-provider workflow.</small><button type="button" onClick={scan} disabled={!selected.length || loading}><ScanSearch /> {loading ? "SCANNING…" : "SCAN SELECTED"}</button></div></>}
    {error && <p className="hub-data-error" role="alert">{error}</p>}
    {selected.some((username) => progress[username]) && <div className="hub-osint-scan-progress" aria-live="polite">{selected.map((username) => progress[username] && <div key={username} className={`is-${progress[username]}`}><strong>@{username}</strong><span>{statusLabel[progress[username]]}</span></div>)}</div>}
    {results.length > 0 && <div className="hub-osint-variation-results">{results.map((item) => <article key={item.username}><div><strong>@{item.username}</strong><span>{item.error ? item.error : `${item.normalized.foundCount ?? item.findings.length} possible · ${item.normalized.checkedCount ?? "?"} checked`}</span></div>{item.findings?.length > 0 && <SaveFindingButton findings={item.findings} label="ADD RESULTS TO CASE" />}</article>)}</div>}
  </section>;
}
