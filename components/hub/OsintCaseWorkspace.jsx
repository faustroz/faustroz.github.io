"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, FilePlus2, Plus, Trash2 } from "lucide-react";
import DigitalFootprintGraph from "@/components/hub/DigitalFootprintGraph";
import { requireSupabase } from "@/lib/supabase/client";

const emptyCase = { title: "", notes: "", status: "active", tags: "" };
const emptyFinding = { finding_type: "identifier", label: "", value: "", source: "manual", confidence: "uncertain", notes: "", tags: "" };
const tags = (value) => String(value || "").split(",").map((item) => item.trim()).filter(Boolean).slice(0, 20);

export default function OsintCaseWorkspace() {
  const [cases, setCases] = useState([]);
  const [activeId, setActiveId] = useState("");
  const [findings, setFindings] = useState([]);
  const [caseForm, setCaseForm] = useState(emptyCase);
  const [findingForm, setFindingForm] = useState(emptyFinding);
  const [view, setView] = useState("timeline");
  const [error, setError] = useState("");
  const activeCase = cases.find((item) => item.id === activeId);

  const loadCases = useCallback(async () => {
    const { data, error: loadError } = await requireSupabase().from("osint_cases").select("id,title,notes,status,tags,created_at,updated_at").order("updated_at", { ascending: false });
    if (loadError) return setError(loadError.message);
    setCases(data || []);
    setActiveId((current) => data?.some((item) => item.id === current) ? current : data?.[0]?.id || "");
  }, []);

  const loadFindings = useCallback(async () => {
    if (!activeId) return setFindings([]);
    const { data, error: loadError } = await requireSupabase().from("osint_case_findings").select("*").eq("case_id", activeId).order("observed_at", { ascending: false });
    if (loadError) return setError(loadError.message);
    setFindings(data || []);
  }, [activeId]);

  useEffect(() => { loadCases(); }, [loadCases]);
  useEffect(() => { loadFindings(); }, [loadFindings]);
  useEffect(() => {
    const refresh = (event) => { loadCases(); if (!event.detail?.caseId || event.detail.caseId === activeId) loadFindings(); };
    window.addEventListener("osint-case-updated", refresh);
    return () => window.removeEventListener("osint-case-updated", refresh);
  }, [activeId, loadCases, loadFindings]);

  const createCase = async (event) => {
    event.preventDefault(); setError("");
    const { data, error: saveError } = await requireSupabase().from("osint_cases").insert({ title: caseForm.title.trim(), notes: caseForm.notes.trim(), status: caseForm.status, tags: tags(caseForm.tags) }).select("id").single();
    if (saveError) return setError(saveError.message);
    setCaseForm(emptyCase); await loadCases(); setActiveId(data.id);
  };
  const updateStatus = async (status) => {
    const { error: saveError } = await requireSupabase().from("osint_cases").update({ status }).eq("id", activeId);
    if (saveError) return setError(saveError.message);
    loadCases();
  };
  const addFinding = async (event) => {
    event.preventDefault();
    const { error: saveError } = await requireSupabase().from("osint_case_findings").insert({ case_id: activeId, finding_type: findingForm.finding_type, label: findingForm.label.trim(), value: findingForm.value.trim(), source: findingForm.source.trim() || "manual", confidence: findingForm.confidence, notes: findingForm.notes.trim(), tags: tags(findingForm.tags) });
    if (saveError) return setError(saveError.message);
    setFindingForm(emptyFinding); loadFindings(); loadCases();
  };
  const deleteFinding = async (id) => {
    if (!window.confirm("Permanently delete this finding? This cannot be recovered.")) return;
    const { error: deleteError } = await requireSupabase().from("osint_case_findings").delete().eq("id", id).eq("case_id", activeId);
    if (deleteError) return setError(deleteError.message);
    loadFindings();
  };
  const deleteCase = async () => {
    if (!window.confirm(`Permanently delete “${activeCase.title}” and all of its findings? This cannot be recovered.`)) return;
    const { error: deleteError } = await requireSupabase().from("osint_cases").delete().eq("id", activeId);
    if (deleteError) return setError(deleteError.message);
    setActiveId(""); setFindings([]); loadCases();
  };
  const exportCase = () => {
    const payload = { schema: "4allx.osint-case.v1", exported_at: new Date().toISOString(), case: activeCase, findings };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob); const link = document.createElement("a");
    link.href = url; link.download = `osint-case-${activeCase.title.toLowerCase().replace(/[^a-z0-9]+/g, "-") || activeCase.id}.json`; link.click(); URL.revokeObjectURL(url);
  };

  return <section className="hub-osint-panel hub-osint-cases" aria-labelledby="case-workspace-heading">
    <header className="hub-osint-section-head"><div><span>OWNER-SCOPED / EXPLICIT SAVE ONLY</span><h2 id="case-workspace-heading">OSINT Case Workspace</h2><p>Lookup results are never added automatically. Saved cases are private, RLS-protected, and permanently deleted when requested.</p></div><FilePlus2 aria-hidden="true" /></header>
    {error && <p className="hub-data-error" role="alert">{error}</p>}
    <form className="hub-osint-case-create" onSubmit={createCase}><input required maxLength={160} placeholder="Case title" value={caseForm.title} onChange={(event) => setCaseForm({ ...caseForm, title: event.target.value })} /><input maxLength={480} placeholder="Notes" value={caseForm.notes} onChange={(event) => setCaseForm({ ...caseForm, notes: event.target.value })} /><input maxLength={240} placeholder="Tags, comma separated" value={caseForm.tags} onChange={(event) => setCaseForm({ ...caseForm, tags: event.target.value })} /><button type="submit"><Plus /> CREATE CASE</button></form>
    {cases.length ? <div className="hub-osint-case-layout"><aside><label>ACTIVE CASE<select value={activeId} onChange={(event) => setActiveId(event.target.value)}>{cases.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>{activeCase && <div className="hub-osint-case-summary"><strong>{activeCase.title}</strong><p>{activeCase.notes || "No case notes."}</p><div>{activeCase.tags?.map((tag) => <span key={tag}>{tag}</span>)}</div><select aria-label="Case status" value={activeCase.status} onChange={(event) => updateStatus(event.target.value)}><option value="active">Active</option><option value="paused">Paused</option><option value="closed">Closed</option></select><button type="button" onClick={exportCase}><Download /> EXPORT JSON</button><button className="is-danger" type="button" onClick={deleteCase}><Trash2 /> DELETE CASE PERMANENTLY</button></div>}</aside><div className="hub-osint-case-main"><nav><button className={view === "timeline" ? "is-active" : ""} type="button" onClick={() => setView("timeline")}>TIMELINE</button><button className={view === "relationships" ? "is-active" : ""} type="button" onClick={() => setView("relationships")}>RELATIONSHIPS</button><button className={view === "manual" ? "is-active" : ""} type="button" onClick={() => setView("manual")}>MANUAL FINDING</button></nav>{view === "timeline" && <div className="hub-osint-timeline">{findings.length ? findings.map((item) => <article key={item.id}><time>{new Date(item.observed_at).toLocaleString()}</time><div><span>{item.confidence} / {item.source}</span><strong>{item.label}</strong><p>{item.value}</p>{item.notes && <small>{item.notes}</small>}</div><button type="button" onClick={() => deleteFinding(item.id)} aria-label={`Permanently delete ${item.label}`}><Trash2 /></button></article>) : <div className="hub-data-state">NO SAVED FINDINGS</div>}</div>}{view === "relationships" && <DigitalFootprintGraph findings={findings} title={activeCase.title} />}{view === "manual" && <form className="hub-osint-finding-form" onSubmit={addFinding}><label>TYPE<select value={findingForm.finding_type} onChange={(event) => setFindingForm({ ...findingForm, finding_type: event.target.value })}>{["identifier","username","profile","domain","email","phone","platform","other"].map((item) => <option key={item}>{item}</option>)}</select></label><label>CONFIDENCE<select value={findingForm.confidence} onChange={(event) => setFindingForm({ ...findingForm, confidence: event.target.value })}><option value="confirmed">Confirmed fact</option><option value="possible">Possible match</option><option value="uncertain">Uncertain</option></select></label><label>LABEL<input required maxLength={160} value={findingForm.label} onChange={(event) => setFindingForm({ ...findingForm, label: event.target.value })} /></label><label>VALUE<input required maxLength={1000} value={findingForm.value} onChange={(event) => setFindingForm({ ...findingForm, value: event.target.value })} /></label><label>SOURCE<input maxLength={80} value={findingForm.source} onChange={(event) => setFindingForm({ ...findingForm, source: event.target.value })} /></label><label>NOTES<textarea maxLength={2000} value={findingForm.notes} onChange={(event) => setFindingForm({ ...findingForm, notes: event.target.value })} /></label><label>TAGS<input maxLength={240} value={findingForm.tags} onChange={(event) => setFindingForm({ ...findingForm, tags: event.target.value })} /></label><button type="submit"><Plus /> ADD FINDING</button></form>}</div></div> : <div className="hub-data-state">NO CASES — CREATE THE FIRST CASE ABOVE</div>}
  </section>;
}
