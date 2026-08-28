"use client";

import { useEffect, useMemo, useState } from "react";
import { CircleDollarSign, GraduationCap, ListChecks, RefreshCw } from "lucide-react";
import { createOperationsService } from "@/lib/hub/operations.mjs";
import { supabase } from "@/lib/supabase/client";

function formatIDR(value) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value || 0);
}

function InsightCard({ icon: Icon, eyebrow, title, children }) {
  return <article className="hub-insight-card"><Icon aria-hidden="true" /><span>{eyebrow}</span><h2>{title}</h2>{children}</article>;
}

export default function OperationsInsights() {
  const service = useMemo(() => createOperationsService(supabase), []);
  const [state, setState] = useState({ loading: true, snapshot: null, error: "" });

  useEffect(() => {
    let active = true;
    service.load()
      .then(({ snapshot }) => active && setState({ loading: false, snapshot, error: "" }))
      .catch((error) => active && setState({ loading: false, snapshot: null, error: error.message }));
    return () => { active = false; };
  }, [service]);

  if (state.loading) return <div className="hub-data-state"><RefreshCw className="hub-spin" /> READING REAL OPERATING DATA</div>;
  if (state.error || !state.snapshot) return <div className="hub-data-error" role="alert">{state.error || "No authenticated insight data available."}</div>;

  const { finance, study, projects, empty } = state.snapshot;
  return (
    <div className="hub-insights-grid">
      <InsightCard icon={CircleDollarSign} eyebrow="FINANCE / CURRENT MONTH" title={empty.finance ? "No finance records." : formatIDR(finance.expenseTotal)}>
        {empty.finance ? <p>Record an expense, budget, or subscription to start this view.</p> : <dl><div><dt>Expenses</dt><dd>{finance.expenseCount}</dd></div><div><dt>Budgets</dt><dd>{finance.budgetCount}</dd></div><div><dt>Active subscriptions</dt><dd>{finance.activeSubscriptions}</dd></div></dl>}
      </InsightCard>
      <InsightCard icon={GraduationCap} eyebrow="STUDY / REAL PROGRESS" title={empty.study ? "No study records." : `${study.averageProgress}% topic progress`}>
        {empty.study ? <p>Create a topic, exam, or flashcard to start this view.</p> : <><div className="hub-insight-meter"><i style={{ width: `${study.averageProgress}%` }} /></div><dl><div><dt>Topics</dt><dd>{study.topicCount}</dd></div><div><dt>Exams</dt><dd>{study.examCount}</dd></div><div><dt>Flashcards</dt><dd>{study.flashcardCount}</dd></div></dl></>}
      </InsightCard>
      <InsightCard icon={ListChecks} eyebrow="PROJECTS / DELIVERY SIGNAL" title={empty.projects ? "No project records." : `${projects.taskCompletion}% task completion`}>
        {empty.projects ? <p>Create a project, task, or changelog entry to start this view.</p> : <><div className="hub-insight-meter"><i style={{ width: `${projects.taskCompletion}%` }} /></div><dl><div><dt>Projects</dt><dd>{projects.projectCount}</dd></div><div><dt>Active</dt><dd>{projects.activeProjectCount}</dd></div><div><dt>Open tasks</dt><dd>{projects.openTaskCount}</dd></div></dl></>}
      </InsightCard>
    </div>
  );
}
