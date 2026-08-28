"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Pencil, Plus, RefreshCw, Trash2, X } from "lucide-react";
import { createCrudRepository } from "@/lib/hub/crud.mjs";
import { requireSupabase } from "@/lib/supabase/client";

function emptyForm(fields) {
  return Object.fromEntries(
    fields.map((field) => [field.name, field.type === "checkbox" ? false : field.defaultValue ?? ""])
  );
}

function normalizeForm(fields, form) {
  return Object.fromEntries(
    fields.map((field) => {
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

export default function CrudPanel({ table, title, description, fields, orderBy }) {
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

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setRecords(await repository.list());
    } catch (nextError) {
      setError(nextError.message);
    } finally {
      setLoading(false);
    }
  }, [repository]);

  useEffect(() => { load(); }, [load]);

  const reset = () => {
    setForm(emptyForm(fields));
    setEditingId(null);
    setFormOpen(false);
  };

  const edit = (record) => {
    setEditingId(record.id);
    setForm(
      Object.fromEntries(
        fields.map((field) => [
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

      {formOpen && (
        <form className="hub-crud-form" onSubmit={save}>
          <div className="hub-crud-form-head"><span>{editingId ? "EDIT RECORD" : "CREATE RECORD"}</span><button type="button" onClick={reset} aria-label="Close form"><X /></button></div>
          <div className="hub-form-grid">
            {fields.map((field) => (
              <label key={field.name} className={field.type === "textarea" ? "hub-field-wide" : undefined}>
                <span>{field.label}</span>
                {field.type === "textarea" ? (
                  <textarea required={field.required} value={form[field.name]} onChange={(event) => setForm({ ...form, [field.name]: event.target.value })} />
                ) : field.type === "select" ? (
                  <select required={field.required} value={form[field.name]} onChange={(event) => setForm({ ...form, [field.name]: event.target.value })}>
                    {field.options.map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                ) : field.type === "checkbox" ? (
                  <input type="checkbox" checked={Boolean(form[field.name])} onChange={(event) => setForm({ ...form, [field.name]: event.target.checked })} />
                ) : (
                  <input type={field.type === "tags" ? "text" : field.type || "text"} min={field.min} max={field.max} required={field.required} value={form[field.name]} onChange={(event) => setForm({ ...form, [field.name]: event.target.value })} />
                )}
              </label>
            ))}
          </div>
          {error && <p className="hub-data-error" role="alert">{error}</p>}
          <button className="hub-save-button" type="submit" disabled={saving}><Check aria-hidden="true" /> {saving ? "WRITING…" : "COMMIT ENTRY"}</button>
        </form>
      )}

      {!formOpen && error && <p className="hub-data-error" role="alert">{error}</p>}
      {loading ? (
        <div className="hub-data-state"><RefreshCw className="hub-spin" /> READING PRIVATE TABLE</div>
      ) : records.length === 0 ? (
        <div className="hub-data-state">NO RECORDS / CHANNEL READY</div>
      ) : (
        <div className="hub-record-grid">
          {records.map((record, index) => (
            <article className="hub-record" key={record.id}>
              <div className="hub-record-index">{String(index + 1).padStart(2, "0")}</div>
              <div className="hub-record-values">
                {fields.slice(0, 5).map((field) => (
                  <div key={field.name}><span>{field.label}</span><strong>{displayValue(field, record[field.name])}</strong></div>
                ))}
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
