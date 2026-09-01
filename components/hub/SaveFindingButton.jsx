"use client";

import { useEffect, useState } from "react";
import { Archive, Check, X } from "lucide-react";
import { requireSupabase } from "@/lib/supabase/client";

const cleanFinding = (finding) => ({
  finding_type: finding.finding_type || "other",
  label: String(finding.label || "Finding").trim().slice(0, 160),
  value: String(finding.value || "").trim().slice(0, 1000),
  source: String(finding.source || "manual").trim().slice(0, 80),
  confidence: ["confirmed", "possible", "uncertain"].includes(finding.confidence) ? finding.confidence : "uncertain",
  url: String(finding.url || "").trim().slice(0, 1000),
  notes: String(finding.notes || "").trim().slice(0, 2000),
  tags: Array.isArray(finding.tags) ? finding.tags.map((tag) => String(tag).trim().slice(0, 48)).filter(Boolean).slice(0, 20) : [],
  metadata: finding.metadata && typeof finding.metadata === "object" ? finding.metadata : {},
  observed_at: finding.observed_at || new Date().toISOString(),
});

export default function SaveFindingButton({ finding, findings, label = "ADD TO CASE" }) {
  const rows = (findings || [finding]).filter(Boolean);
  const [open, setOpen] = useState(false);
  const [cases, setCases] = useState([]);
  const [caseId, setCaseId] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (!open) return;
    let active = true;
    requireSupabase().from("osint_cases").select("id,title,status").order("updated_at", { ascending: false }).then(({ data, error }) => {
      if (!active) return;
      if (error) setStatus(error.message);
      else { setCases(data || []); setCaseId(data?.[0]?.id || ""); }
    });
    return () => { active = false; };
  }, [open]);

  const save = async () => {
    if (!caseId || !rows.length) return;
    setStatus("SAVING…");
    const payload = rows.map((row) => ({ ...cleanFinding(row), case_id: caseId }));
    const { error } = await requireSupabase().from("osint_case_findings").insert(payload);
    if (error) return setStatus(error.message);
    setStatus("SAVED");
    window.dispatchEvent(new CustomEvent("osint-case-updated", { detail: { caseId } }));
    window.setTimeout(() => setOpen(false), 500);
  };

  return <div className="hub-osint-save"><button type="button" onClick={() => { setOpen(true); setStatus(""); }} disabled={!rows.length}><Archive /> {label}</button>{open && <div className="hub-osint-save-popover"><header><span>EXPLICIT PERSISTENCE</span><button type="button" onClick={() => setOpen(false)} aria-label="Close case selector"><X /></button></header>{cases.length ? <><label>CASE<select value={caseId} onChange={(event) => setCaseId(event.target.value)}>{cases.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label><button type="button" onClick={save} disabled={!caseId || status === "SAVING…"}><Check /> SAVE {rows.length > 1 ? `${rows.length} FINDINGS` : "FINDING"}</button></> : <p>No case exists yet. Create one in the OSINT Case Workspace.</p>}{status && <small>{status}</small>}</div>}</div>;
}
