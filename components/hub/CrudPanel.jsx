"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Pencil, Plus, RefreshCw, Trash2, X } from "lucide-react";
import { createCrudRepository } from "@/lib/hub/crud.mjs";
import { currentLedgerMonth, filterAndSortLedger } from "@/lib/hub/ledger.mjs";
import { requireSupabase } from "@/lib/supabase/client";

function emptyForm(fields) {
  return Object.fromEntries(
    fields.filter((field) => field.type !== "computed").map((field) => [field.name, field.type === "checkbox" ? false : field.defaultValue ?? ""])
  );
}

function normalizeForm(fields, form) {
  return Object.fromEntries(
    fields.filter((field) => field.type !== "computed").map((field) => {
      const value = form[field.name];
      if (field.type === "number") {
        return [field.name, value === "" ? null : Number(value)];
      }
      if (field.type === "checkbox") return [field.name, Boolean(value)];
      if (field.type === "tags") {
        return [field.name, String(value).split(",").map((tag) => tag.trim()).filter(Boolean)];
      }
      if (field.optional && value === "") return [field.name, null];
      return [field.name, value];
    })
  );
}

function displayValue(field, value) {
  if (field.type === "checkbox") return value ? "ACTIVE" : "PAUSED";
  if (field.type === "tags") return Array.isArray(value) ? value.join(" / ") : "—";
  if (field.type === "number" && field.format === "currency") {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value || 0);
  }
  if (field.suffix && value !== null && value !== undefined && value !== "") return `${value}${field.suffix}`;
  return value || "—";
}

export default function CrudPanel({ table, title, description, fields, orderBy, ledger, onRecordsChange }) {
  const repository = useMemo(
    () => createCrudRepository(requireSupabase(), table, { orderBy }),
    [table, orderBy]
  );
  const [records, setRecords] = useState([]);
  const [form, setForm] = useState(() => emptyForm(fields));
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [lookups, setLookups] = useState({});
  const [ledgerMonth, setLedgerMonth] = useState(() => currentLedgerMonth());
  const [ledgerSort, setLedgerSort] = useState("date-desc");
  const visibleRecords = useMemo(() => ledger ? filterAndSortLedger(records, { ...ledger, month: ledgerMonth, sort: ledgerSort }) : records, [ledger, ledgerMonth, ledgerSort, records]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const nextRecords = await repository.list();
      setRecords(nextRecords);
      onRecordsChange?.(nextRecords);
    } catch (nextError) {
      setError(nextError.message);
    } finally {
      setLoading(false);
    }
  }, [repository, onRecordsChange]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const lookupFields = fields.filter((field) => field.type === "lookup");
    if (!lookupFields.length) return undefined;
    let active = true;
    const loadLookups = async () => {
      try {
        const entries = await Promise.all(lookupFields.map(async (field) => {
          const columns = [...new Set([field.lookup.value, ...field.lookup.label, ...(field.lookup.include || []), ...(field.lookup.kinds ? ["kind"] : [])])].join(",");
          const { data, error } = await requireSupabase().from(field.lookup.table).select(columns).order(field.lookup.value);
          if (error) throw error;
          const rows = (data || []).filter((row) => !field.lookup.kinds || field.lookup.kinds.includes(row.kind));
          return [field.name, rows];
        }));
        if (active) setLookups(Object.fromEntries(entries));
      } catch (nextError) {
        if (active) setError(nextError.message);
      }
    };
    loadLookups();
    return () => { active = false; };
  }, [fields]);

  const reset = () => {
    setForm(emptyForm(fields));
    setEditingId(null);
    setFormOpen(false);
  };

  const closeForm = () => {
    if (!saving) reset();
  };

  useEffect(() => {
    if (!formOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event) => {
      if (event.key === "Escape" && !saving) {
        setForm(emptyForm(fields));
        setEditingId(null);
        setFormOpen(false);
      }
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [fields, formOpen, saving]);

  const edit = (record) => {
    setEditingId(record.id);
    setForm(
      Object.fromEntries(
        fields.filter((field) => field.type !== "computed").map((field) => [
          field.name,
          field.type === "tags" ? (record[field.name] || []).join(", ") : record[field.name] ?? "",
        ])
      )
    );
    setFormOpen(true);
  };

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const values = normalizeForm(fields, form);
      if (editingId) await repository.update(editingId, values);
      else await repository.create(values);
      reset();
      await load();
    } catch (nextError) {
      setError(nextError.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (record) => {
    if (!window.confirm(`Delete ${record.title || record.name || "this record"}?`)) return;
    setError("");
    try {
      await repository.remove(record.id);
      setRecords((current) => current.filter(({ id }) => id !== record.id));
    } catch (nextError) {
      setError(nextError.message);
    }
  };

  return (
    <section className="hub-crud-panel">
      <header className="hub-crud-heading">
        <div><span>DATA CHANNEL / {table.toUpperCase()}</span><h2>{title}</h2><p>{description}</p></div>
        <button type="button" onClick={() => { reset(); setFormOpen(true); }}><Plus aria-hidden="true" /> NEW ENTRY</button>
      </header>

      {ledger && <div className="hub-ledger-controls" aria-label={`${title} filters and sort order`}>
        <label><span>MONTH</span><input type="month" value={ledgerMonth === "all" ? "" : ledgerMonth} onChange={(event) => setLedgerMonth(event.target.value || "all")} /></label>
        <button type="button" className={ledgerMonth === "all" ? "is-active" : undefined} onClick={() => setLedgerMonth("all")}>ALL TIME</button>
        <label><span>SORT</span><select value={ledgerSort} onChange={(event) => setLedgerSort(event.target.value)}><option value="date-desc">Date · newest</option><option value="date-asc">Date · oldest</option><option value="amount-desc">Amount · highest</option><option value="amount-asc">Amount · lowest</option></select></label>
        <strong>{visibleRecords.length} {visibleRecords.length === 1 ? "ENTRY" : "ENTRIES"}</strong>
      </div>}

      {formOpen && (
        <div className="hub-crud-modal-backdrop" onMouseDown={closeForm}>
        <form className="hub-crud-form hub-crud-modal" onSubmit={save} role="dialog" aria-modal="true" aria-label={editingId ? `Edit ${title}` : `Create ${title}`} onMouseDown={(event) => event.stopPropagation()}>
          <div className="hub-crud-form-head"><span>{editingId ? "EDIT RECORD" : "CREATE RECORD"}</span><button type="button" onClick={closeForm} disabled={saving} aria-label="Close form"><X /></button></div>
          <div className="hub-form-grid">
            {fields.filter((field) => field.type !== "computed").map((field, index) => (
              <label key={field.name} className={field.type === "textarea" ? "hub-field-wide" : undefined}>
                <span>{field.label}</span>
                {field.type === "textarea" ? (
                  <textarea autoFocus={index === 0} required={field.required} value={form[field.name]} onChange={(event) => setForm({ ...form, [field.name]: event.target.value })} />
                ) : field.type === "lookup" ? (
                  <select autoFocus={index === 0} required={field.required} value={form[field.name]} onChange={(event) => setForm({ ...form, [field.name]: event.target.value })}>
                    <option value="">{field.optional ? "Not assigned" : "Select an option"}</option>
                    {form[field.name] && !(lookups[field.name] || []).some((row) => row[field.lookup.value] === form[field.name]) && <option value={form[field.name]}>{form[field.name]} (archived)</option>}
                    {(lookups[field.name] || []).map((row) => <option key={`${field.name}-${row[field.lookup.value]}`} value={row[field.lookup.value]} style={row.color ? { color: row.color } : undefined}>{row.color ? "● " : ""}{field.lookup.label.map((key) => row[key]).filter(Boolean).join(" · ")}</option>)}
                  </select>
                ) : field.type === "select" ? (
                  <select autoFocus={index === 0} required={field.required} value={form[field.name]} onChange={(event) => setForm({ ...form, [field.name]: event.target.value })}>
                    {field.options.map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                ) : field.type === "checkbox" ? (
                  <input autoFocus={index === 0} type="checkbox" checked={Boolean(form[field.name])} onChange={(event) => setForm({ ...form, [field.name]: event.target.checked })} />
                ) : (
                  <input autoFocus={index === 0} type={field.type === "tags" ? "text" : field.type || "text"} inputMode={field.inputMode} placeholder={field.placeholder} min={field.min} max={field.max} step={field.step} required={field.required} value={form[field.name]} onChange={(event) => setForm({ ...form, [field.name]: event.target.value })} />
                )}
              </label>
            ))}
          </div>
          {error && <p className="hub-data-error" role="alert">{error}</p>}
          <button className="hub-save-button" type="submit" disabled={saving}><Check aria-hidden="true" /> {saving ? "WRITING…" : "COMMIT ENTRY"}</button>
        </form>
        </div>
      )}

      {!formOpen && error && <p className="hub-data-error" role="alert">{error}</p>}
      {loading ? (
        <div className="hub-data-state"><RefreshCw className="hub-spin" /> READING PRIVATE TABLE</div>
      ) : records.length === 0 ? (
        <div className="hub-data-state">NO RECORDS / CHANNEL READY</div>
      ) : visibleRecords.length === 0 ? (
        <div className="hub-data-state">NO ENTRIES FOR THIS MONTH</div>
      ) : (
        <div className="hub-record-grid">
          {visibleRecords.map((record, index) => (
            <article className="hub-record" key={record.id}>
              <div className="hub-record-index">{String(index + 1).padStart(2, "0")}</div>
              <div className="hub-record-values">
                {fields.slice(0, 5).map((field) => {
                  const match = field.type === "lookup" ? (lookups[field.name] || []).find((row) => row[field.lookup.value] === record[field.name]) : null;
                  const color = field.type === "color" ? record[field.name] : match?.color;
                  return <div key={field.name}><span>{field.label}</span><strong className={color ? "hub-record-color-value" : undefined}>{color && <i style={{ backgroundColor: color }} aria-hidden="true" />}{displayValue(field, record[field.name])}</strong></div>;
                })}
              </div>
              <div className="hub-record-actions">
                <button type="button" onClick={() => edit(record)} aria-label={`Edit ${record.title || record.name || "record"}`}><Pencil /></button>
                <button type="button" onClick={() => remove(record)} aria-label={`Delete ${record.title || record.name || "record"}`}><Trash2 /></button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
