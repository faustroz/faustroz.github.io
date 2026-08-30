"use client";

import { useCallback, useEffect, useState } from "react";
import { RotateCcw, Trash2 } from "lucide-react";
import { requireSupabase } from "@/lib/supabase/client";

const tables = [["expenses", "Expenses"], ["income_entries", "Income"], ["financial_goals", "Goals"], ["bank_accounts", "Balances"], ["finance_categories", "Categories"], ["budgets", "Budgets"], ["subscriptions", "Subscriptions"], ["study_topics", "Topics"], ["study_exams", "Exams"], ["study_flashcards", "Flashcards"], ["academic_records", "Academic"], ["hub_projects", "Projects"], ["project_tasks", "Tasks"], ["project_changelog", "Changelog"], ["vault_documents", "Vault"]];
const title = (row) => row.title || row.name || row.course_name || row.file_name || row.front || "Private record";

export default function TrashPanel() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [deletingAll, setDeletingAll] = useState(false);
  const load = useCallback(async () => {
    try {
      const client = requireSupabase();
      const groups = await Promise.all(tables.map(async ([table, label]) => {
        const { data, error: queryError } = await client.from(table).select("*").not("deleted_at", "is", null).order("deleted_at", { ascending: false });
        if (queryError) throw queryError;
        return (data || []).map((row) => ({ table, label, row }));
      }));
      setItems(groups.flat().sort((a, b) => new Date(b.row.deleted_at) - new Date(a.row.deleted_at)));
    } catch (loadError) { setError(loadError.message); }
  }, []);

  useEffect(() => { load(); }, [load]);
  const restore = async (item) => {
    const { error: restoreError } = await requireSupabase().from(item.table).update({ deleted_at: null }).eq("id", item.row.id);
    if (restoreError) return setError(restoreError.message);
    load();
  };
  const remove = async (item) => {
    if (!window.confirm("Permanently delete this record? This cannot be undone.")) return;
    const client = requireSupabase();
    if (item.table === "vault_documents") {
      const { error: storageError } = await client.storage.from("document-vault").remove([item.row.storage_path]);
      if (storageError) return setError(storageError.message);
    }
    const { error: deleteError } = await client.from(item.table).delete().eq("id", item.row.id);
    if (deleteError) return setError(deleteError.message);
    load();
  };
  const removeAll = async () => {
    if (!items.length || !window.confirm(`Permanently delete all ${items.length} Trash items? This cannot be undone.`)) return;
    setDeletingAll(true); setError("");
    try {
      const client = requireSupabase();
      const vaultPaths = items.filter(({ table }) => table === "vault_documents").map(({ row }) => row.storage_path).filter(Boolean);
      if (vaultPaths.length) {
        const { error: storageError } = await client.storage.from("document-vault").remove(vaultPaths);
        if (storageError) throw storageError;
      }
      await Promise.all(tables.map(async ([table]) => {
        const { error: deleteError } = await client.from(table).delete().not("deleted_at", "is", null);
        if (deleteError) throw deleteError;
      }));
      await load();
    } catch (deleteError) { setError(deleteError.message); } finally { setDeletingAll(false); }
  };

  return <section className="hub-crud-panel"><header className="hub-crud-heading"><div><span>RECOVERY / 30 DAYS</span><h2>Trash</h2><p>Deleted Hub records can be restored for 30 days. After that, the cleanup job permanently removes them.</p></div>{items.length > 0 && <button type="button" className="hub-danger-action" onClick={removeAll} disabled={deletingAll}><Trash2 /> {deletingAll ? "DELETING…" : "DELETE ALL"}</button>}</header>{error && <p className="hub-data-error">{error}</p>}{items.length ? <div className="hub-record-grid">{items.map((item, index) => <article className="hub-record" key={`${item.table}-${item.row.id}`}><div className="hub-record-index">{String(index + 1).padStart(2, "0")}</div><div className="hub-record-values"><div><span>MODULE</span><strong>{item.label}</strong></div><div><span>RECORD</span><strong>{title(item.row)}</strong></div><div><span>EXPIRES</span><strong>{new Date(new Date(item.row.deleted_at).getTime() + 30 * 864e5).toLocaleDateString("id-ID")}</strong></div></div><div className="hub-record-actions"><button type="button" onClick={() => restore(item)} aria-label="Restore"><RotateCcw /></button><button type="button" onClick={() => remove(item)} aria-label="Delete permanently"><Trash2 /></button></div></article>)}</div> : <div className="hub-data-state">TRASH EMPTY / RECOVERY READY</div>}</section>;
}
