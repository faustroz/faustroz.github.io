"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, FilePlus2, Plus, Trash2, Unlink } from "lucide-react";
import DigitalFootprintGraph from "@/components/hub/DigitalFootprintGraph";
import { requireSupabase } from "@/lib/supabase/client";

const emptyCase = { title: "", notes: "", status: "active", tags: "" };
const emptyFinding = { finding_type: "identifier", label: "", value: "", source: "manual", confidence: "uncertain", notes: "", tags: "" };
const tags = (value) => String(value || "").split(",").map((item) => item.trim()).filter(Boolean).slice(0, 20);
const identifierTypes = new Set(["identifier", "username", "phone", "email", "domain"]);

export default function OsintCaseWorkspace() {
  const [cases, setCases] = useState([]);
  const [activeId, setActiveId] = useState("");
  const [findings, setFindings] = useState([]);
  const [selected, setSelected] = useState([]);
  const [caseForm, setCaseForm] = useState(emptyCase);
  const [findingForm, setFindingForm] = useState(emptyFinding);
  const [view, setView] = useState("overview");
  const [error, setError] = useState("");
  const activeCase = cases.find((item) => item.id === activeId);
  const identifiers = useMemo(() => findings.filter((item) => identifierTypes.has(item.finding_type)), [findings]);
  const sources = useMemo(() => [...new Set(findings.map((item) => item.source).filter(Boolean))], [findings]);
  const findingTags = useMemo(() => [...new Set(findings.flatMap((item) => item.tags || []))], [findings]);

  const loadCases = useCallback(async () => {
    const { data, error: loadError } = await requireSupabase().from("osint_cases").select("id,title,notes,status,tags,created_at,updated_at").order("updated_at", { ascending: false });
    if (loadError) return setError(loadError.message);
    setCases(data || []); setActiveId((current) => data?.some((item) => item.id === current) ? current : data?.[0]?.id || "");
  }, []);
  const loadFindings = useCallback(async () => {
    if (!activeId) return setFindings([]);
    const { data, error: loadError } = await requireSupabase().from("osint_case_findings").select("*").eq("case_id", activeId).order("observed_at", { ascending: false });
    if (loadError) return setError(loadError.message);
    setFindings(data || []); setSelected([]);
  }, [activeId]);

  useEffect(() => { loadCases(); }, [loadCases]);
  useEffect(() => { loadFindings(); }, [loadFindings]);
  useEffect(() => {
    const refresh = (event) => { loadCases(); if (!event.detail?.caseId || event.detail.caseId === activeId) loadFindings(); };
    window.addEventListener("osint-case-updated", refresh); return () => window.removeEventListener("osint-case-updated", refresh);
  }, [activeId, loadCases, loadFindings]);

  const createCase = async (event) => {
    event.preventDefault(); setError("");
    const { data, error: saveError } = await requireSupabase().from("osint_cases").insert({ title: caseForm.title.trim(), notes: caseForm.notes.trim(), status: caseForm.status, tags: tags(caseForm.tags) }).select("id").single();
    if (saveError) return setError(saveError.message);
    setCaseForm(emptyCase); await loadCases(); setActiveId(data.id); setView("overview");
  };
  const updateStatus = async (status) => {
    const { error: saveError } = await requireSupabase().from("osint_cases").update({ status }).eq("id", activeId);
    if (saveError) return setError(saveError.message); loadCases();
  };
  const addFinding = async (event) => {
    event.preventDefault();
    const { error: saveError } = await requireSupabase().from("osint_case_findings").insert({ case_id: activeId, finding_type: findingForm.finding_type, label: findingForm.label.trim(), value: findingForm.value.trim(), source: findingForm.source.trim() || "manual", confidence: findingForm.confidence, notes: findingForm.notes.trim(), tags: tags(findingForm.tags) });
    if (saveError) return setError(saveError.message);
    setFindingForm(emptyFinding); loadFindings(); loadCases();
  };
  const removeSelected = async () => {
    if (!selected.length || !window.confirm(`Remove ${selected.length} selected ${selected.length === 1 ? "finding" : "findings"} from this Case? This removes only the saved Case copies and does not modify provider data.`)) return;
    const { error: removeError } = await requireSupabase().from("osint_case_findings").delete().eq("case_id", activeId).in("id", selected);
    if (removeError) return setError(removeError.message); loadFindings(); loadCases();
  };
  const deleteCase = async () => {
    if (!window.confirm(`Permanently delete “${activeCase.title}” and all saved findings? This cannot be recovered.`)) return;
    const { error: deleteError } = await requireSupabase().from("osint_cases").delete().eq("id", activeId);
    if (deleteError) return setError(deleteError.message); setActiveId(""); setFindings([]); loadCases();
  };
  const exportCase = () => {
    const payload = { schema: "4allx.osint-case.v1", exported_at: new Date().toISOString(), case: activeCase, findings };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }); const url = URL.createObjectURL(blob); const link = document.createElement("a");
    link.href = url; link.download = `osint-case-${activeCase.title.toLowerCase().replace(/[^a-z0-9]+/g, "-") || activeCase.id}.json`; link.click(); URL.revokeObjectURL(url);
  };
  const toggleFinding = (id) => setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);

  return <section className="hub-osint-panel hub-osint-cases" aria-labelledby="case-workspace-heading">
    <header className="hub-osint-section-head"><div><span>OWNER-SCOPED / EXPLICIT SAVE ONLY</span><h2 id="case-workspace-heading">OSINT Case Workspace</h2><p>Lookup results enter a Case only when explicitly saved. Removing a finding affects only its saved Case copy.</p></div><FilePlus2 aria-hidden="true" /></header>
    {error && <p className="hub-data-error" role="alert">{error}</p>}
    <form className="hub-osint-case-create" onSubmit={createCase}><input required maxLength={160} placeholder="Case title" aria-label="Case title" value={caseForm.title} onChange={(event) => setCaseForm({ ...caseForm, title: event.target.value })} /><input maxLength={480} placeholder="Notes" aria-label="Case notes" value={caseForm.notes} onChange={(event) => setCaseForm({ ...caseForm, notes: event.target.value })} /><input maxLength={240} placeholder="Tags, comma separated" aria-label="Case tags" value={caseForm.tags} onChange={(event) => setCaseForm({ ...caseForm, tags: event.target.value })} /><button type="submit"><Plus /> CREATE CASE</button></form>
    {cases.length ? <div className="hub-osint-case-layout"><aside><label>ACTIVE CASE<select value={activeId} onChange={(event) => { setActiveId(event.target.value); setView("overview"); }}>{cases.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>{activeCase && <div className="hub-osint-case-summary"><strong>{activeCase.title}</strong><p>{activeCase.notes || "No case notes."}</p><div>{activeCase.tags?.map((tag) => <span key={tag}>{tag}</span>)}</div><select aria-label="Case status" value={activeCase.status} onChange={(event) => updateStatus(event.target.value)}><option value="active">Active</option><option value="paused">Paused</option><option value="closed">Closed</option></select><button type="button" onClick={exportCase}><Download /> EXPORT JSON</button><button className="is-danger" type="button" onClick={deleteCase}><Trash2 /> DELETE CASE PERMANENTLY</button></div>}</aside><div className="hub-osint-case-main"><nav aria-label="Case workspace views">{[["overview","OVERVIEW"],["findings","FINDINGS"],["timeline","TIMELINE"],["graph","GRAPH"]].map(([key,label]) => <button key={key} className={view === key ? "is-active" : ""} type="button" onClick={() => setView(key)}>{label}</button>)}</nav>
      {view === "overview" && <div className="hub-osint-overview"><dl><div><dt>FINDINGS</dt><dd>{findings.length}</dd></div><div><dt>IDENTIFIERS</dt><dd>{identifiers.length}</dd></div><div><dt>SOURCES</dt><dd>{sources.length}</dd></div><div><dt>STATUS</dt><dd>{activeCase.status}</dd></div></dl><section><h3>Identifiers</h3>{identifiers.length ? <ul>{identifiers.map((item) => <li key={item.id}><span>{item.finding_type}</span><strong>{item.value || item.label}</strong><time>{new Date(item.observed_at).toLocaleString()}</time></li>)}</ul> : <p>No identifiers saved.</p>}</section><section><h3>Sources & tags</h3><div className="hub-osint-overview-chips">{sources.map((item) => <span key={`source-${item}`}>{item}</span>)}{findingTags.map((item) => <span key={`tag-${item}`}>#{item}</span>)}</div>{activeCase.notes && <p>{activeCase.notes}</p>}<small>Created {new Date(activeCase.created_at).toLocaleString()} · Updated {new Date(activeCase.updated_at).toLocaleString()}</small></section></div>}
      {view === "findings" && <div className="hub-osint-findings"><div className="hub-osint-findings-tools"><label><input type="checkbox" checked={Boolean(findings.length) && selected.length === findings.length} onChange={(event) => setSelected(event.target.checked ? findings.map((item) => item.id) : [])} /> SELECT ALL</label><span>{selected.length} selected</span><button type="button" onClick={removeSelected} disabled={!selected.length}><Unlink /> REMOVE FROM CASE</button></div>{findings.length ? <div className="hub-osint-finding-list">{findings.map((item) => <article key={item.id} className={selected.includes(item.id) ? "is-selected" : ""}><input type="checkbox" aria-label={`Select ${item.label}`} checked={selected.includes(item.id)} onChange={() => toggleFinding(item.id)} /><div><span>{item.confidence} / {item.finding_type}</span><strong>{item.label}</strong><p>{item.value}</p>{item.notes && <small>{item.notes}</small>}<footer><span>{item.source}</span>{item.tags?.map((tag) => <span key={tag}>#{tag}</span>)}<time>{new Date(item.observed_at).toLocaleString()}</time></footer></div></article>)}</div> : <div className="hub-data-state">NO SAVED FINDINGS</div>}<details className="hub-osint-manual"><summary>ADD MANUAL FINDING</summary><form className="hub-osint-finding-form" onSubmit={addFinding}><label>TYPE<select value={findingForm.finding_type} onChange={(event) => setFindingForm({ ...findingForm, finding_type: event.target.value })}>{["identifier","username","profile","domain","email","phone","platform","other"].map((item) => <option key={item}>{item}</option>)}</select></label><label>CONFIDENCE<select value={findingForm.confidence} onChange={(event) => setFindingForm({ ...findingForm, confidence: event.target.value })}><option value="confirmed">Confirmed fact</option><option value="possible">Possible match</option><option value="uncertain">Uncertain</option></select></label><label>LABEL<input required maxLength={160} value={findingForm.label} onChange={(event) => setFindingForm({ ...findingForm, label: event.target.value })} /></label><label>VALUE<input required maxLength={1000} value={findingForm.value} onChange={(event) => setFindingForm({ ...findingForm, value: event.target.value })} /></label><label>SOURCE<input maxLength={80} value={findingForm.source} onChange={(event) => setFindingForm({ ...findingForm, source: event.target.value })} /></label><label>NOTES<textarea maxLength={2000} value={findingForm.notes} onChange={(event) => setFindingForm({ ...findingForm, notes: event.target.value })} /></label><label>TAGS<input maxLength={240} value={findingForm.tags} onChange={(event) => setFindingForm({ ...findingForm, tags: event.target.value })} /></label><button type="submit"><Plus /> ADD FINDING</button></form></details></div>}
      {view === "timeline" && <div className="hub-osint-timeline">{findings.length ? findings.map((item) => <article key={item.id}><time>{new Date(item.observed_at).toLocaleString()}</time><div><span>{item.confidence} / {item.source}</span><strong>{item.label}</strong><p>{item.value}</p>{item.notes && <small>{item.notes}</small>}</div></article>) : <div className="hub-data-state">NO SAVED FINDINGS</div>}</div>}
      {view === "graph" && <DigitalFootprintGraph findings={findings} title={activeCase.title} />}
    </div></div> : <div className="hub-data-state">NO CASES — CREATE THE FIRST CASE ABOVE</div>}
  </section>;
}
