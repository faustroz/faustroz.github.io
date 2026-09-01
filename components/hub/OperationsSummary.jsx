"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Activity, ChartNoAxesCombined, CircleDollarSign, GraduationCap, LockKeyhole, RefreshCw } from "lucide-react";
import { createOperationsService } from "@/lib/hub/operations.mjs";
import { isSupabaseConfigured, supabase } from "@/lib/supabase/client";

function formatIDR(value) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function EmptySummary({ label, href }) {
  return <Link className="hub-operation-card hub-operation-card--empty" href={href}><span>{label}</span><strong>NO RECORDS</strong><small>Open module</small></Link>;
}

export default function OperationsSummary() {
  const service = useMemo(
    () => (supabase ? createOperationsService(supabase) : null),
    []
  );
  const [state, setState] = useState({ loading: true, authenticated: false, snapshot: null, error: "" });

  useEffect(() => {
    if (!isSupabaseConfigured || !service) {
      setState({ loading: false, authenticated: false, snapshot: null, error: "" });
      return undefined;
    }

    let active = true;
    service.load()
      .then(({ authenticated, snapshot }) => active && setState({ loading: false, authenticated, snapshot, error: "" }))
      .catch((error) => active && setState({ loading: false, authenticated: false, snapshot: null, error: error.message }));

    return () => { active = false; };
  }, [service]);

  if (state.loading) {
    return <section className="hub-operations-loading" role="status"><RefreshCw className="hub-spin" /> Checking session…</section>;
  }

  if (!state.authenticated) {
    return (
      <section className="hub-public-operations" data-testid="public-operations">
        <div><span>PRIVATE TELEMETRY / LOCKED</span><h2>Authenticate to read your operating signal.</h2><p>Finance, study, and projects summaries remain private until a Supabase owner session is present.</p></div>
        <Link href="/settings"><LockKeyhole aria-hidden="true" /> OPEN AUTH GATE</Link>
        {state.error && <small>STATUS: PRIVATE CHANNEL UNAVAILABLE</small>}
      </section>
    );
  }

  const { snapshot } = state;
  return (
    <section className="hub-operations" data-testid="authenticated-operations">
      <div className="hub-operations-head"><div><h2>Only what needs attention.</h2></div><Link href="/insights"><ChartNoAxesCombined aria-hidden="true" /> View insights</Link></div>

      <div className="hub-operation-grid">
        {snapshot.empty.finance ? <EmptySummary label="Finance" href="/finance" /> : <Link className="hub-operation-card" href="/finance"><CircleDollarSign aria-hidden="true" /><span>Finance · current month</span><strong>{formatIDR(snapshot.finance.expenseTotal)}</strong><small>{snapshot.finance.expenseCount} expenses · {snapshot.finance.activeSubscriptions} active subscriptions</small></Link>}
        {snapshot.empty.study ? <EmptySummary label="Study" href="/study" /> : <Link className="hub-operation-card" href="/study"><GraduationCap aria-hidden="true" /><span>Study · topic progress</span><strong>{snapshot.study.averageProgress}%</strong><small>{snapshot.study.topicCount} topics</small></Link>}
        {snapshot.empty.projects ? <EmptySummary label="Projects" href="/projects" /> : <Link className="hub-operation-card" href="/projects"><Activity aria-hidden="true" /><span>Projects · open queue</span><strong>{snapshot.projects.openTaskCount}</strong><small>{snapshot.projects.activeProjectCount} active · {snapshot.projects.taskCompletion}% tasks complete</small></Link>}
      </div>

      <div className="hub-operations-detail">
        <article className="hub-current-focus"><span>Current focus</span>{snapshot.currentFocus ? <><h3>{snapshot.currentFocus.title}</h3><p>{snapshot.currentFocus.detail}</p></> : <><h3>No active signal.</h3><p>Mark a project or study topic as active to set an operational focus.</p></>}</article>
        <article className="hub-recent-activity"><span>Recent activity</span>{snapshot.recentActivity.length ? <ol>{snapshot.recentActivity.map((item) => <li key={item.id}><i aria-hidden="true" /><div><strong>{item.title}</strong><small>{item.source} · {new Date(item.updatedAt).toLocaleDateString("id-ID", { day: "2-digit", month: "short" })}</small></div></li>)}</ol> : <p>No private records updated yet.</p>}</article>
      </div>
    </section>
  );
}
