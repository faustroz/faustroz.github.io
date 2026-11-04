"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { requireSupabase } from "@/lib/supabase/client";

function formatTimestamp(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default function FinanceLastUpdated({ hideAmounts = false }) {
  const [state, setState] = useState({ loading: true, transaction: null, error: false });

  const load = useCallback(async () => {
    try {
      const client = requireSupabase();
      const [expenseResult, incomeResult] = await Promise.all([
        client.from("expenses").select("title,category,amount,created_at,spent_on").is("deleted_at", null).order("created_at", { ascending: false }).limit(1).maybeSingle(),
        client.from("income_entries").select("title,category,amount,created_at,received_on").is("deleted_at", null).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      ]);
      if (expenseResult.error) throw expenseResult.error;
      if (incomeResult.error) throw incomeResult.error;
      const candidates = [expenseResult.data && { ...expenseResult.data, kind: "expense", date: expenseResult.data.spent_on }, incomeResult.data && { ...incomeResult.data, kind: "income", date: incomeResult.data.received_on }].filter(Boolean);
      const transaction = candidates.sort((left, right) => Date.parse(right.created_at) - Date.parse(left.created_at))[0] || null;
      setState({ loading: false, transaction, error: false });
    } catch {
      // Keep the Finance workspace usable if a timestamp projection is not
      // available yet; this indicator never invents a last-update value.
      setState({ loading: false, transaction: null, error: true });
    }
  }, []);

  useEffect(() => {
    load();
    const channel = requireSupabase()
      .channel("finance-last-transaction")
      .on("postgres_changes", { event: "*", schema: "public", table: "expenses" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "income_entries" }, load)
      .subscribe();
    return () => { requireSupabase().removeChannel(channel); };
  }, [load]);

  const transaction = state.transaction;
  const timestamp = transaction ? formatTimestamp(transaction.created_at) : null;
  const title = transaction?.title || transaction?.category || (transaction?.kind === "income" ? "Income" : "Expense");
  const transactionAmount = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(transaction?.amount || 0));
  return <aside className="hub-finance-last-updated" aria-live="polite">
    {transaction?.kind === "income" ? <ArrowDownLeft aria-hidden="true" /> : <ArrowUpRight aria-hidden="true" />}
    <div>
      <span>TRANSAKSI TERAKHIR{transaction?.kind ? ` · ${transaction.kind === "income" ? "INCOME" : "EXPENSE"}` : ""}</span>
      {state.loading ? <strong>Memuat transaksi…</strong> : state.error ? <strong>Transaksi belum dapat dimuat.</strong> : transaction ? <div className="hub-finance-last-transaction"><strong title={title}>{title}</strong><b>{hideAmounts ? "••••••" : transactionAmount}</b></div> : <strong>Belum ada transaksi.</strong>}
      {timestamp && <small>{timestamp}</small>}
    </div>
  </aside>;
}
