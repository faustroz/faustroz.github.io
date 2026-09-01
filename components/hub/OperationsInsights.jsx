"use client";

import { useEffect, useMemo, useState } from "react";
import { CircleDollarSign, FolderArchive, GraduationCap, RefreshCw } from "lucide-react";
import { createInsightsService } from "@/lib/hub/insights.mjs";
import { supabase } from "@/lib/supabase/client";

function formatIDR(value) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value || 0);
}

function formatBytes(bytes) {
  if (!bytes) return "0 KB";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.ceil(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function InsightCard({ icon: Icon, eyebrow, title, children }) {
  return <article className="hub-insight-card"><Icon aria-hidden="true" /><span>{eyebrow}</span><h2>{title}</h2>{children}</article>;
}

export default function OperationsInsights() {
  const service = useMemo(() => createInsightsService(supabase), []);
  const [state, setState] = useState({ loading: true, snapshot: null, error: "" });
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let active = true;
    service.load()
      .then(({ snapshot }) => active && setState({ loading: false, snapshot, error: "" }))
      .catch((error) => active && setState({ loading: false, snapshot: null, error: error.message }));
    return () => { active = false; };
  }, [service, revision]);

  useEffect(() => {
    const channel = supabase.channel("personal-hub-insights")
      .on("postgres_changes", { event: "*", schema: "public", table: "expenses" }, () => setRevision((value) => value + 1))
      .on("postgres_changes", { event: "*", schema: "public", table: "bank_accounts" }, () => setRevision((value) => value + 1))
      .on("postgres_changes", { event: "*", schema: "public", table: "budgets" }, () => setRevision((value) => value + 1))
      .on("postgres_changes", { event: "*", schema: "public", table: "subscriptions" }, () => setRevision((value) => value + 1))
      .on("postgres_changes", { event: "*", schema: "public", table: "financial_goals" }, () => setRevision((value) => value + 1))
      .on("postgres_changes", { event: "*", schema: "public", table: "academic_records" }, () => setRevision((value) => value + 1))
      .on("postgres_changes", { event: "*", schema: "public", table: "vault_documents" }, () => setRevision((value) => value + 1))
      .on("postgres_changes", { event: "*", schema: "public", table: "vault_folders" }, () => setRevision((value) => value + 1))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  if (state.loading) return <div className="hub-data-state"><RefreshCw className="hub-spin" /> READING REAL OPERATING DATA</div>;
  if (state.error || !state.snapshot) return <div className="hub-data-error" role="alert">{state.error || "No authenticated insight data available."}</div>;

  const { finance, academic, vault } = state.snapshot;
  const trendMaximum = Math.max(...finance.trend.map(({ total }) => total), 1);
  return (
    <div className="hub-insights-grid">
      <InsightCard icon={CircleDollarSign} eyebrow="FINANCE / CURRENT MONTH" title={finance.expenseCount ? formatIDR(finance.currentExpenses) : "No expense data."}>
        {!finance.hasData ? <p>No finance records yet.</p> : <>{finance.hasTrend && <div className="hub-insight-trend" aria-label="Six-month expense trend">{finance.trend.map((month) => <span key={month.key}><i style={{ height: `${(month.total / trendMaximum) * 100}%` }} /><small>{month.label}</small></span>)}</div>}<dl><div><dt>Balance total</dt><dd>{finance.accountCount ? formatIDR(finance.balanceTotal) : "No accounts"}</dd></div><div><dt>Previous month</dt><dd>{finance.previousExpenses ? formatIDR(finance.previousExpenses) : "No prior expense"}</dd></div><div><dt>Budgets / goals</dt><dd>{finance.budgetCount} / {finance.goalCount}</dd></div><div><dt>Active subscriptions</dt><dd>{finance.activeSubscriptions}</dd></div>{finance.goalProgress !== null && <div><dt>Average goal progress</dt><dd>{finance.goalProgress.toFixed(0)}%</dd></div>}</dl></>}
      </InsightCard>
      <InsightCard icon={GraduationCap} eyebrow="ACADEMIC / CUMULATIVE" title={academic.ipk === null ? "No academic data." : `IPK ${academic.ipk.toFixed(2)}`}>
        {!academic.hasData ? <p>Add a grade record to calculate credits and IPK.</p> : <dl><div><dt>Credits / SKS</dt><dd>{academic.credits}</dd></div><div><dt>Semesters</dt><dd>{academic.semesterCount}</dd></div><div><dt>Grade records</dt><dd>{academic.recordCount}</dd></div></dl>}
      </InsightCard>
      <InsightCard icon={FolderArchive} eyebrow="VAULT / PRIVATE STORAGE" title={vault.hasData ? `${vault.documentCount} files` : "Vault is empty."}>
        {!vault.hasData ? <p>Upload a file or create a folder to start organizing private documents.</p> : <dl><div><dt>Storage used</dt><dd>{formatBytes(vault.byteSize)}</dd></div><div><dt>Folders</dt><dd>{vault.folderCount}</dd></div><div><dt>Documents</dt><dd>{vault.documentCount}</dd></div></dl>}
      </InsightCard>
    </div>
  );
}
