"use client";

import { useCallback, useEffect, useState } from "react";
import { Clock3 } from "lucide-react";
import { requireSupabase } from "@/lib/supabase/client";

function formatTimestamp(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default function FinanceLastUpdated() {
  const [state, setState] = useState({ loading: true, expense: null });

  const load = useCallback(async () => {
    try {
      const { data, error } = await requireSupabase()
        .from("expenses")
        .select("title,created_at")
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      setState({ loading: false, expense: data || null });
    } catch {
      // Keep the Finance workspace usable if a timestamp projection is not
      // available yet; this indicator never invents a last-update value.
      setState({ loading: false, expense: null });
    }
  }, []);

  useEffect(() => {
    load();
    const channel = requireSupabase()
      .channel("finance-last-expense")
      .on("postgres_changes", { event: "*", schema: "public", table: "expenses" }, load)
      .subscribe();
    return () => { requireSupabase().removeChannel(channel); };
  }, [load]);

  const timestamp = state.expense ? formatTimestamp(state.expense.created_at) : null;
  return <aside className="hub-finance-last-updated" aria-live="polite">
    <Clock3 aria-hidden="true" />
    <div>
      <span>LAST EXPENSE ADDED</span>
      {state.loading ? <strong>Checking activity…</strong> : timestamp ? <strong>{timestamp}</strong> : <strong>No expense recorded yet.</strong>}
      {state.expense?.title && timestamp && <small>{state.expense.title}</small>}
    </div>
  </aside>;
}
