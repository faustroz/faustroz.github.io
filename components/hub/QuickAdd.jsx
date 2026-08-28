"use client";

import { useMemo, useState } from "react";
import { Check, Plus, X } from "lucide-react";
import { FINANCE_CHANNELS, MEMORY_CHANNELS, PROJECT_CHANNELS, STUDY_CHANNELS } from "@/lib/hub/module-config.mjs";
import { createCrudRepository } from "@/lib/hub/crud.mjs";
import { isSupabaseConfigured, supabase } from "@/lib/supabase/client";

const OPTIONS = [FINANCE_CHANNELS.find(({ id }) => id === "expenses"), FINANCE_CHANNELS.find(({ id }) => id === "income"), PROJECT_CHANNELS[1], STUDY_CHANNELS[2], STUDY_CHANNELS[0], MEMORY_CHANNELS[0]];
const initial = (fields) => Object.fromEntries(fields.map((field) => [field.name, field.type === "checkbox" ? false : field.defaultValue ?? ""]));

export default function QuickAdd() {
  const [open, setOpen] = useState(false); const [kind, setKind] = useState(OPTIONS[0].id); const config = OPTIONS.find((item) => item.id === kind) || OPTIONS[0];
  const [form, setForm] = useState(() => initial(config.fields)); const [status, setStatus] = useState("");
  const repository = useMemo(() => supabase ? createCrudRepository(supabase, config.table, { orderBy: config.orderBy }) : null, [config]);
  const choose = (id) => { const next = OPTIONS.find((item) => item.id === id); setKind(id); setForm(initial(next.fields)); };
  const save = async (event) => { event.preventDefault(); setStatus("WRITING…"); try {
    const values = Object.fromEntries(config.fields.map((field) => [field.name, field.type === "number" ? (form[field.name] === "" ? null : Number(form[field.name])) : field.type === "tags" ? String(form[field.name]).split(",").map((x) => x.trim()).filter(Boolean) : field.optional && form[field.name] === "" ? null : form[field.name]]));
    if (!repository) throw new Error("Supabase is not configured.");
    await repository.create(values); setOpen(false); setForm(initial(config.fields));
  } catch (error) { setStatus(error.message); return; } setStatus(""); };
  return <>
    <button className="hub-quick-add-trigger" type="button" onClick={() => setOpen(true)} aria-label="Quick add private record" disabled={!isSupabaseConfigured}><Plus /> <span>ADD</span></button>
    {open && <div className="hub-crud-modal-backdrop" onMouseDown={() => setOpen(false)}><form className="hub-crud-form hub-crud-modal hub-quick-add" onSubmit={save} onMouseDown={(event) => event.stopPropagation()}><div className="hub-crud-form-head"><span>QUICK ADD / PRIVATE</span><button type="button" onClick={() => setOpen(false)} aria-label="Close quick add"><X /></button></div>
      <label><span>TYPE</span><select value={kind} onChange={(event) => choose(event.target.value)}>{OPTIONS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
      <div className="hub-form-grid">{config.fields.map((field, index) => <label key={field.name} className={field.type === "textarea" ? "hub-field-wide" : undefined}><span>{field.label}</span>{field.type === "textarea" ? <textarea autoFocus={index === 0} required={field.required} value={form[field.name]} onChange={(e) => setForm({ ...form, [field.name]: e.target.value })} /> : field.type === "select" ? <select required={field.required} value={form[field.name]} onChange={(e) => setForm({ ...form, [field.name]: e.target.value })}>{field.options.map((x) => <option key={x}>{x}</option>)}</select> : <input autoFocus={index === 0} type={field.type === "tags" ? "text" : field.type || "text"} required={field.required} min={field.min} max={field.max} value={form[field.name]} onChange={(e) => setForm({ ...form, [field.name]: e.target.value })} />}</label>)}</div>
      {status && <p className="hub-data-error">{status}</p>}<button className="hub-save-button" type="submit"><Check /> COMMIT ENTRY</button>
    </form></div>}
  </>;
}
