"use client";

import { useEffect, useMemo, useState } from "react";
import { CircleDollarSign, RefreshCw } from "lucide-react";
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
  const [expenseRevision, setExpenseRevision] = useState(0);

  useEffect(() => {
    let active = true;
    service.load()
      .then(({ snapshot }) => active && setState({ loading: false, snapshot, error: "" }))
      .catch((error) => active && setState({ loading: false, snapshot: null, error: error.message }));
    return () => { active = false; };
  }, [service, expenseRevision]);

  useEffect(() => {
    const channel = supabase.channel("operations-insights-expenses")
      .on("postgres_changes", { event: "*", schema: "public", table: "expenses" }, () => setExpenseRevision((revision) => revision + 1))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  if (state.loading) return <div className="hub-data-state"><RefreshCw className="hub-spin" /> READING REAL OPERATING DATA</div>;
  if (state.error || !state.snapshot) return <div className="hub-data-error" role="alert">{state.error || "No authenticated insight data available."}</div>;

  const { finance } = state.snapshot;
  const noExpenses = finance.expenseCount === 0;
  return (
    <div className="hub-insights-grid">
      <InsightCard icon={CircleDollarSign} eyebrow="FINANCE / CURRENT MONTH" title={noExpenses ? "No expense data." : formatIDR(finance.expenseTotal)}>
        {noExpenses ? <p>Record an expense to start this view.</p> : <dl><div><dt>Expenses</dt><dd>{finance.expenseCount}</dd></div><div><dt>Budgets</dt><dd>{finance.budgetCount}</dd></div><div><dt>Active subscriptions</dt><dd>{finance.activeSubscriptions}</dd></div></dl>}
      </InsightCard>
    </div>
  );
}
