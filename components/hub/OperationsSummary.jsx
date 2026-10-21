"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight, BookOpen, CircleDollarSign, Clock3, FileText, GraduationCap, LockKeyhole, Plus, RefreshCw, Search, Signal } from "lucide-react";
import { createOperationsService } from "@/lib/hub/operations.mjs";
import { isSupabaseConfigured, supabase } from "@/lib/supabase/client";
import TradingMonitorCard from "@/components/hub/TradingMonitorCard";

const initialState = { loading: true, refreshing: false, authenticated: false, snapshot: null, error: "", updatedAt: null };

function formatIDR(value) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value || 0);
}

function greeting(date) {
  if (!date) return "PERSONAL OPERATIONS";
  const hour = date.getHours();
  if (hour < 11) return "Selamat pagi.";
  if (hour < 15) return "Selamat siang.";
  if (hour < 18) return "Selamat sore.";
  return "Selamat malam.";
}

function localDate(date) {
  return date ? new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(date) : "";
}

function formatActivityDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(date);
}

function openGlobalSearch() {
  window.dispatchEvent(new Event("hub:open-search"));
}

function openQuickAdd(kind) {
  window.dispatchEvent(new CustomEvent("hub:open-quick-add", { detail: { kind } }));
}

function SearchLauncher() {
  return <button className="hub-home-search" type="button" onClick={openGlobalSearch}><Search aria-hidden="true" /><span>Search finance, academic, vault…</span><kbd>Ctrl K</kbd></button>;
}

function LoadingHome() {
  return <div className="hub-home-loading" aria-label="Memuat ringkasan personal"><div className="hub-home-skeleton hub-home-skeleton--focus" /><div className="hub-home-skeleton" /><div className="hub-home-skeleton" /></div>;
}

function PrivateEmpty({ error, onRetry }) {
  return <section className="hub-home-private-state">
    <div className="hub-home-private-icon"><LockKeyhole aria-hidden="true" /></div>
    <div><span>PRIVATE CHANNEL / LOCKED</span><h2>{error ? "Data pribadi belum dapat dimuat." : "Hubungkan sesi pribadi."}</h2><p>{error ? "Ringkasan belum tersedia. Data tidak ditampilkan dari cache yang tidak terverifikasi." : "Masuk untuk menampilkan ringkasan Finance, Academic, dan aktivitas terbaru."}</p></div>
    {error ? <button type="button" onClick={onRetry}><RefreshCw aria-hidden="true" /> Coba lagi</button> : <Link href="/settings"><LockKeyhole aria-hidden="true" /> Buka Settings</Link>}
    <Link className="hub-home-private-search" href="/settings">Buka kanal autentikasi <ArrowUpRight aria-hidden="true" /></Link>
  </section>;
}

function CurrentFocus({ focus }) {
  if (!focus) return <section className="hub-home-focus hub-home-focus--empty">
    <div className="hub-home-section-meta"><span>NOW / CURRENT FOCUS</span><span>NO SIGNAL</span></div>
    <h2>Belum ada yang perlu ditindaklanjuti.</h2>
    <p>Aktivitas dan pengingat pribadi akan muncul di sini ketika tersedia.</p>
  </section>;

  const icons = { Finance: CircleDollarSign, Academic: GraduationCap, Vault: FileText, System: Signal };
  const Icon = icons[focus.source] || Signal;
  return <Link href={focus.href} className="hub-home-focus">
    <div className="hub-home-section-meta"><span>NOW / CURRENT FOCUS</span><span>{focus.source}</span></div>
    <div className="hub-home-focus-content"><div className="hub-home-focus-icon"><Icon aria-hidden="true" /></div><div><h2>{focus.title}</h2><p>{focus.detail}</p></div><ArrowUpRight className="hub-home-focus-arrow" aria-hidden="true" /></div>
    <span className="hub-home-focus-link">Lihat detail <ArrowUpRight aria-hidden="true" /></span>
  </Link>;
}

function FinanceSnapshot({ finance }) {
  const total = finance.incomeTotal + finance.expenseTotal;
  const expenseShare = total ? Math.round(finance.expenseTotal / total * 100) : 0;
  return <section className="hub-home-finance">
    <div className="hub-home-section-meta"><span>FINANCE / BULAN INI</span><Link href="/finance">Buka Finance <ArrowUpRight aria-hidden="true" /></Link></div>
    {finance.hasData ? <>
      {finance.incomeCount || finance.expenseCount ? <div className="hub-home-cashflow" aria-label="Ringkasan income dan expense bulan ini">
        <div><span><ArrowDownLeft aria-hidden="true" /> MASUK</span><strong>{formatIDR(finance.incomeTotal)}</strong><small>{finance.incomeCount} transaksi</small></div>
        <div><span><ArrowUpRight aria-hidden="true" /> KELUAR</span><strong>{formatIDR(finance.expenseTotal)}</strong><small>{finance.expenseCount} transaksi</small></div>
        {total > 0 && <div className="hub-home-cashflow-meter" aria-label={`${expenseShare}% arus kas bulan ini adalah expense`}><i style={{ width: `${expenseShare}%` }} /></div>}
      </div> : <p className="hub-home-empty-line">Belum ada income atau expense bulan ini.</p>}
      <p className="hub-home-finance-updated">{finance.lastExpenseAdded?.created_at ? <>Expense terakhir ditambahkan <time dateTime={finance.lastExpenseAdded.created_at}>{formatActivityDate(finance.lastExpenseAdded.created_at)}</time></> : "Belum ada expense yang tercatat."}</p>
    </> : <p className="hub-home-empty-line">Belum ada catatan Finance. Tambahkan transaksi pertama saat siap.</p>}
  </section>;
}

function AcademicSnapshot({ academic }) {
  return <Link href="/academic" className="hub-home-academic">
    <div className="hub-home-section-meta"><span>ACADEMIC / PROGRES</span><ArrowUpRight aria-hidden="true" /></div>
    {academic.hasData ? <>
      <div className="hub-home-academic-main"><GraduationCap aria-hidden="true" /><div><span>IPK KUMULATIF</span><strong>{academic.ipk.toFixed(2)}</strong></div></div>
      <dl><div><dt>SKS</dt><dd>{academic.credits}</dd></div><div><dt>Semester</dt><dd>{academic.semesterCount}</dd></div>{academic.latestSemesterIp !== null && <div><dt>IP {academic.latestSemester}</dt><dd>{academic.latestSemesterIp.toFixed(2)}</dd></div>}</dl>
      {academic.practiceAccuracy !== null && <p className="hub-home-study-progress"><BookOpen aria-hidden="true" /> {academic.practiceAccuracy.toFixed(0)}% benar dari {academic.practiceCount} jawaban terbaru</p>}
    </> : <><h2>Belum ada record akademik.</h2><p>Mulai dari course record atau latihan soal.</p></>}
  </Link>;
}

export default function OperationsSummary() {
  const service = useMemo(() => (supabase ? createOperationsService(supabase) : null), []);
  const [state, setState] = useState(initialState);
  const [now, setNow] = useState(null);
  const inFlight = useRef(false);
  const mounted = useRef(true);

  const load = useCallback(async () => {
    if (!isSupabaseConfigured || !service || inFlight.current) {
      if (!isSupabaseConfigured || !service) setState({ ...initialState, loading: false });
      return;
    }
    inFlight.current = true;
    setState((current) => ({ ...current, loading: !current.snapshot, refreshing: Boolean(current.snapshot), error: "" }));
    try {
      const { authenticated, snapshot } = await service.load();
      if (mounted.current) setState({ loading: false, refreshing: false, authenticated, snapshot, error: "", updatedAt: snapshot ? new Date() : null });
    } catch (error) {
      if (mounted.current) setState((current) => ({ ...current, loading: false, refreshing: false, error: error instanceof Error ? error.message : "Private data is unavailable." }));
    } finally {
      inFlight.current = false;
    }
  }, [service]);

  useEffect(() => {
    mounted.current = true;
    setNow(new Date());
    const clock = window.setInterval(() => setNow(new Date()), 60_000);
    load();
    return () => { mounted.current = false; window.clearInterval(clock); };
  }, [load]);

  useEffect(() => {
    if (!state.authenticated || !supabase) return undefined;
    let timer;
    const tables = ["expenses", "income_entries", "subscriptions", "budgets", "financial_goals", "academic_records", "academic_mku_records", "academic_question_attempts", "vault_documents", "hub_notifications"];
    let channel = supabase.channel("home-command-center-live");
    for (const table of tables) channel = channel.on("postgres_changes", { event: "*", schema: "public", table }, () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(load, 250);
    });
    channel.subscribe();
    return () => { window.clearTimeout(timer); supabase.removeChannel(channel); };
  }, [state.authenticated, load]);

  return <main className="hub-dashboard hub-home-command">
    <header className="hub-home-header">
      <div className="hub-home-welcome"><div><span className="hub-home-date">{localDate(now)}</span><span className="hub-home-live"><i aria-hidden="true" /> PRIVATE WORKSPACE</span></div><h1>{greeting(now)}</h1><p>Semua yang penting, di satu tempat.</p></div>
      <SearchLauncher />
    </header>

    {state.loading ? <LoadingHome /> : !state.authenticated || !state.snapshot ? <PrivateEmpty error={state.error} onRetry={load} /> : <>
      <div className="hub-home-command-grid">
        <div className="hub-home-primary-column">
          <CurrentFocus focus={state.snapshot.currentFocus} />
          <FinanceSnapshot finance={state.snapshot.finance} />
        </div>
        <AcademicSnapshot academic={state.snapshot.academic} />
      </div>

      <section className="hub-home-actions" aria-label="Quick actions">
        <span>QUICK ACTIONS</span>
        <button type="button" onClick={() => openQuickAdd("expenses")}><Plus aria-hidden="true" /> Add expense</button>
        <button type="button" onClick={() => openQuickAdd("income")}><Plus aria-hidden="true" /> Add income</button>
        <Link href="/academic"><GraduationCap aria-hidden="true" /> Record grade</Link>
        <Link href="/vault"><FileText aria-hidden="true" /> Open Vault</Link>
      </section>

      <section className="hub-home-lower-grid">
        <section className="hub-home-recent">
          <div className="hub-home-section-heading"><div><span>ACTIVITY / PRIVATE</span><h2>Recent activity</h2></div><button type="button" onClick={load} disabled={state.refreshing} aria-label="Refresh Home data"><RefreshCw className={state.refreshing ? "hub-spin" : ""} aria-hidden="true" /></button></div>
          {state.error && <p className="hub-home-stale" role="status">Connection issue · Menampilkan data terakhir yang berhasil dimuat.</p>}
          {state.snapshot.recentActivity.length ? <ol>{state.snapshot.recentActivity.map((activity) => <li key={activity.id}><span className="hub-home-activity-dot" aria-hidden="true" /><div><Link href={activity.href}>{activity.title}</Link><small>{activity.source} · {formatActivityDate(activity.updatedAt)}</small></div><ArrowUpRight aria-hidden="true" /></li>)}</ol> : <div className="hub-home-empty-activity"><Clock3 aria-hidden="true" /><p>Belum ada aktivitas terbaru.</p></div>}
        </section>
        <section className="hub-home-signal">
          <div className="hub-home-section-meta"><span>DATA CHANNEL</span>{state.refreshing ? <span>SYNCING</span> : <span>CONNECTED</span>}</div>
          <strong>{state.updatedAt ? `Updated ${formatActivityDate(state.updatedAt)}` : "Waiting for sync"}</strong>
          <p>Ringkasan hanya menggunakan data milik akun yang sedang masuk.</p>
          <Link href="/insights">Open cross-module insights <ArrowUpRight aria-hidden="true" /></Link>
        </section>
      </section>
    </>}
    <TradingMonitorCard />
  </main>;
}
