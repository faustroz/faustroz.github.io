"use client";

import { useCallback, useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { requireSupabase } from "@/lib/supabase/client";
import FinanceLastUpdated from "@/components/hub/FinanceLastUpdated";
import { getFinanceMonthRange, sumAvailableBalances, sumFinanceAmounts } from "@/lib/hub/finance-overview.mjs";

const PRIVACY_KEY = "4allx:finance-balance-privacy:v1";
const currency = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });
const amount = (value) => currency.format(Number(value || 0));

export default function FinanceOverview() {
  const [hidden, setHidden] = useState(true);
  const [accountsExpanded, setAccountsExpanded] = useState(false);
  const [snapshot, setSnapshot] = useState({ loading: true, accounts: [], income: [], expenses: [], error: "" });

  const load = useCallback(async () => {
    try {
      const client = requireSupabase();
      const { start, end } = getFinanceMonthRange();
      const [accountsResult, incomeResult, expensesResult] = await Promise.all([
        client.from("bank_accounts").select("id,name,bank_name,balance,currency").is("deleted_at", null).order("bank_name"),
        client.from("income_entries").select("amount").is("deleted_at", null).gte("received_on", start).lt("received_on", end),
        client.from("expenses").select("amount").is("deleted_at", null).gte("spent_on", start).lt("spent_on", end),
      ]);
      const failed = [accountsResult, incomeResult, expensesResult].find((result) => result.error);
      if (failed) throw failed.error;
      setSnapshot({ loading: false, accounts: accountsResult.data || [], income: incomeResult.data || [], expenses: expensesResult.data || [], error: "" });
    } catch (error) {
      setSnapshot((current) => ({ ...current, loading: false, error: error?.message || "Ringkasan Finance gagal dimuat." }));
    }
  }, []);

  useEffect(() => {
    try { setHidden(window.localStorage.getItem(PRIVACY_KEY) !== "show"); } catch { /* Keep financial amounts hidden if storage is unavailable. */ }
    void load();
    const client = requireSupabase();
    const channel = client.channel("finance-overview-summary")
      .on("postgres_changes", { event: "*", schema: "public", table: "bank_accounts" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "income_entries" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "expenses" }, load)
      .subscribe();
    return () => { client.removeChannel(channel); };
  }, [load]);

  const togglePrivacy = () => {
    const nextHidden = !hidden;
    setHidden(nextHidden);
    try { window.localStorage.setItem(PRIVACY_KEY, nextHidden ? "hide" : "show"); } catch { /* The current session toggle still works. */ }
  };

  const balanceTotal = sumAvailableBalances(snapshot.accounts);
  const currentMonth = new Intl.DateTimeFormat("id-ID", { month: "short", year: "numeric" }).format(new Date());
  const displayAmount = (value) => hidden ? "••••••" : amount(value);

  return <section className="hub-finance-overview" aria-label="Ringkasan saldo operasional">
    <header className="hub-finance-overview-head">
      <div><span>SALDO OPERASIONAL · {currentMonth.toUpperCase()}</span><h2>Ringkasan saldo</h2></div>
      <button type="button" className="hub-finance-privacy-toggle" onClick={togglePrivacy} aria-label={hidden ? "Tampilkan nominal saldo" : "Sembunyikan nominal saldo"} aria-pressed={hidden}>
        {hidden ? <Eye size={15} aria-hidden="true" /> : <EyeOff size={15} aria-hidden="true" />}{hidden ? "Tampilkan" : "Sembunyikan"}
      </button>
    </header>
    <div className="hub-finance-overview-metrics">
      <div className="hub-finance-balance-primary"><span>Total tersedia</span><strong>{snapshot.loading ? "Memuat…" : snapshot.accounts.length ? displayAmount(balanceTotal) : snapshot.error ? "Tidak tersedia" : "Belum ada rekening"}</strong></div>
      <div><span>Income bulan ini</span><strong>{snapshot.loading || snapshot.error ? "—" : displayAmount(sumFinanceAmounts(snapshot.income))}</strong></div>
      <div><span>Expense bulan ini</span><strong>{snapshot.loading || snapshot.error ? "—" : displayAmount(sumFinanceAmounts(snapshot.expenses))}</strong></div>
    </div>
    {snapshot.accounts.length > 0 && <>
      <ul className="hub-finance-account-balances" aria-label="Saldo per rekening">
        {(accountsExpanded ? snapshot.accounts : snapshot.accounts.slice(0, 2)).map((account) => <li key={account.id}><span>{[account.bank_name, account.name].filter(Boolean).join(" · ") || "Rekening"}</span><strong>{displayAmount(account.balance)}</strong></li>)}
      </ul>
      {snapshot.accounts.length > 2 && <button type="button" className="hub-finance-accounts-toggle" aria-expanded={accountsExpanded} onClick={() => setAccountsExpanded((expanded) => !expanded)}>{accountsExpanded ? "Tampilkan lebih sedikit" : `Lihat semua rekening · ${snapshot.accounts.length}`}</button>}
    </>}
    {snapshot.error && <p className="hub-finance-overview-error" role="status">{snapshot.error}</p>}
    <FinanceLastUpdated hideAmounts={hidden} />
  </section>;
}
