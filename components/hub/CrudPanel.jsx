"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, Pencil, Plus, RefreshCw, Trash2, X } from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
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

const formatCurrency = (value) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value || 0);
const localDate = (value) => new Date(`${value}T00:00:00`);
const dateKey = (value) => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
const neutralLabelColor = "#a1a1aa";

function safeLabelColor(value) {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value) ? value : neutralLabelColor;
}

function ColorLookupSelect({ field, rows, value, onChange, autoFocus }) {
  const selected = rows.find((row) => row[field.lookup.value] === value);
  const labelFor = (row) => field.lookup.label.map((key) => row[key]).filter(Boolean).join(" · ");

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button type="button" className="hub-color-select" autoFocus={autoFocus}>
          {selected ? <><i style={{ backgroundColor: safeLabelColor(selected.label_color || selected.color) }} aria-hidden="true" /><span>{labelFor(selected)}</span></> : <span>{value ? `${value} (archived)` : field.optional ? "Not assigned" : "Select an option"}</span>}
          <ChevronDown className="hub-color-select-caret" aria-hidden="true" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content className="hub-color-select-menu" align="start" sideOffset={6}>
          {field.optional && <DropdownMenu.Item className="hub-color-select-option" onSelect={() => onChange("")}><span>Not assigned</span></DropdownMenu.Item>}
          {rows.map((row) => {
            const optionValue = row[field.lookup.value];
            return (
              <DropdownMenu.Item key={`${field.name}-${optionValue}`} className="hub-color-select-option" onSelect={() => onChange(optionValue)}>
                <i style={{ backgroundColor: safeLabelColor(row.label_color || row.color) }} aria-hidden="true" />
                <span>{labelFor(row)}</span>
                {optionValue === value && <Check aria-hidden="true" />}
              </DropdownMenu.Item>
            );
          })}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

function advanceBudgetPeriod(date, period) {
  const next = new Date(date);
  if (period === "weekly") next.setDate(next.getDate() + 7);
  if (period === "monthly") {
    const day = next.getDate();
    next.setDate(1); next.setMonth(next.getMonth() + 1);
    next.setDate(Math.min(day, new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()));
  }
  if (period === "yearly") next.setFullYear(next.getFullYear() + 1);
  return next;
}

function budgetProgress(budget, expenses) {
  const limit = Number(budget.limit_amount || 0);
  const period = ["weekly", "monthly", "yearly"].includes(budget.period) ? budget.period : "monthly";
  const firstStart = budget.starts_on ? localDate(budget.starts_on) : null;
  const today = localDate(dateKey(new Date()));
  if (!firstStart || firstStart > today) return { spent: 0, remaining: limit, percent: 0, periodLabel: "UPCOMING" };
  let start = firstStart;
  let next = advanceBudgetPeriod(start, period);
  while (next <= today) { start = next; next = advanceBudgetPeriod(start, period); }
  const startKey = dateKey(start);
  const endKey = dateKey(next);
  const spent = expenses.filter((expense) => expense.category === budget.name && expense.spent_on >= startKey && expense.spent_on < endKey).reduce((total, expense) => total + Number(expense.amount || 0), 0);
  return { spent, remaining: limit - spent, percent: limit > 0 ? Math.min(100, (spent / limit) * 100) : 0, periodLabel: `${startKey} — ${endKey}` };
}

export default function CrudPanel({ table, title, description, fields, orderBy, ledger, filter, recordScope, fixedValues, onRecordsChange }) {
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
  const [ledgerDay, setLedgerDay] = useState("");
  const [ledgerSort, setLedgerSort] = useState("date-desc");
  const [ledgerProvider, setLedgerProvider] = useState("all");
  const [ledgerAccounts, setLedgerAccounts] = useState([]);
  const [budgetExpenses, setBudgetExpenses] = useState([]);
  const [recordFilterValue, setRecordFilterValue] = useState("all");
  const providerByAccountId = useMemo(() => Object.fromEntries(ledgerAccounts.map((account) => [account.id, account.bank_name])), [ledgerAccounts]);
  const filterOptions = useMemo(() => filter ? [...new Set(records.map((record) => String(record[filter.field] || "").trim()).filter(Boolean))].sort((left, right) => left.localeCompare(right, undefined, { numeric: true })) : [], [filter, records]);
  const filteredRecords = useMemo(() => !filter || recordFilterValue === "all" ? records : records.filter((record) => String(record[filter.field] || "") === recordFilterValue), [filter, recordFilterValue, records]);
  const visibleRecords = useMemo(() => ledger ? filterAndSortLedger(filteredRecords, { ...ledger, month: ledgerMonth, day: ledgerDay, provider: ledgerProvider, providerForRecord: (record) => providerByAccountId[record[ledger.accountField]], sort: ledgerSort }) : filteredRecords, [ledger, ledgerMonth, ledgerDay, ledgerProvider, ledgerSort, providerByAccountId, filteredRecords]);
  const budgetProgressById = useMemo(() => table === "budgets" ? Object.fromEntries(records.map((budget) => [budget.id, budgetProgress(budget, budgetExpenses)])) : {}, [table, records, budgetExpenses]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const allRecords = await repository.list();
      const nextRecords = recordScope
        ? allRecords.filter((record) => Object.entries(recordScope).every(([key, value]) => record[key] === value))
        : allRecords;
      setRecords(nextRecords);
      onRecordsChange?.(nextRecords);
    } catch (nextError) {
      setError(nextError.message);
    } finally {
      setLoading(false);
    }
  }, [repository, recordScope, onRecordsChange]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!ledger?.accountField) return undefined;
    let active = true;
    requireSupabase().from("bank_accounts").select("id,bank_name").is("deleted_at", null).order("bank_name").then(({ data, error }) => {
      if (!active) return;
      if (error) setError(error.message);
      else setLedgerAccounts(data || []);
    });
    return () => { active = false; };
  }, [ledger]);

  useEffect(() => {
    if (table !== "budgets") { setBudgetExpenses([]); return undefined; }
    let active = true;
    requireSupabase().from("expenses").select("category,amount,spent_on").is("deleted_at", null).then(({ data, error }) => {
      if (!active) return;
      if (error) setError(error.message);
      else setBudgetExpenses(data || []);
    });
    return () => { active = false; };
  }, [table]);

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
      const missingField = fields.find((field) => field.required && field.type !== "computed" && (form[field.name] === "" || form[field.name] === null || form[field.name] === undefined));
      if (missingField) throw new Error(`${missingField.label} is required.`);
      const values = { ...normalizeForm(fields, form), ...(fixedValues || {}) };
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

      {filter && <div className="hub-ledger-controls" aria-label={`${title} filters`}>
        <label><span>{filter.label}</span><select value={recordFilterValue} onChange={(event) => setRecordFilterValue(event.target.value)}><option value="all">All semesters</option>{filterOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
        <strong>{visibleRecords.length} {visibleRecords.length === 1 ? "RECORD" : "RECORDS"}</strong>
      </div>}

      {ledger && <div className="hub-ledger-controls" aria-label={`${title} filters and sort order`}>
        <label><span>MONTH</span><input type="month" value={ledgerMonth === "all" ? "" : ledgerMonth} onChange={(event) => { setLedgerMonth(event.target.value || "all"); setLedgerDay(""); }} /></label>
        <button type="button" className={ledgerMonth === "all" ? "is-active" : undefined} onClick={() => { setLedgerMonth("all"); setLedgerDay(""); }}>ALL TIME</button>
        <label><span>EXACT DATE</span><input type="date" value={ledgerDay} onChange={(event) => { const day = event.target.value; setLedgerDay(day); if (day) setLedgerMonth(day.slice(0, 7)); }} /></label>
        {ledgerDay && <button type="button" onClick={() => setLedgerDay("")}>CLEAR DATE</button>}
        <label><span>PROVIDER</span><select value={ledgerProvider} onChange={(event) => setLedgerProvider(event.target.value)}><option value="all">All banks & cash</option>{[...new Set(ledgerAccounts.map((account) => account.bank_name))].map((provider) => <option key={provider} value={provider}>{provider}</option>)}</select></label>
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
                ) : field.type === "lookup" && field.lookup.include?.some((column) => ["color", "label_color"].includes(column)) ? (
                  <ColorLookupSelect autoFocus={index === 0} field={field} rows={lookups[field.name] || []} value={form[field.name]} onChange={(value) => setForm({ ...form, [field.name]: value })} />
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
                  const lookupLabel = match && field.displayLookupLabel ? field.lookup.label.map((key) => match[key]).filter(Boolean).join(" · ") : (field.fallbackField && record[field.fallbackField]) || displayValue(field, record[field.name]);
                  return <div key={field.name}><span>{field.label}</span><strong className={color ? "hub-record-color-value" : undefined}>{color && <i style={{ backgroundColor: color }} aria-hidden="true" />}{lookupLabel}</strong></div>;
                })}
                {table === "budgets" && (() => {
                  const progress = budgetProgressById[record.id];
                  return <><div><span>SPENT</span><strong>{formatCurrency(progress.spent)}</strong><small className="hub-budget-period">{progress.periodLabel}</small></div><div className={progress.remaining < 0 ? "hub-budget-over" : undefined}><span>REMAINING</span><strong>{formatCurrency(progress.remaining)}</strong><i className="hub-budget-meter" aria-label={`${progress.percent.toFixed(0)}% of budget used`}><b style={{ width: `${progress.percent}%` }} /></i></div></>;
                })()}
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
