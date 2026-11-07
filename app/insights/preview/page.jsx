import { CircleDollarSign, GraduationCap } from "lucide-react";
import { deriveInsightsSnapshot } from "@/lib/hub/insights.mjs";

const records = {
  expenses: [
    [1850000, "2026-06-04"], [420000, "2026-06-18"], [2400000, "2026-07-02"], [680000, "2026-07-21"],
    [3100000, "2026-08-03"], [375000, "2026-08-19"], [2250000, "2026-09-01"], [920000, "2026-09-23"],
    [4150000, "2026-10-02"], [1240000, "2026-10-17"], [2680000, "2026-11-01"], [340000, "2026-11-02"],
  ].map(([amount, spent_on], index) => ({ id: `expense-${index}`, amount, spent_on })),
  bank_accounts: [
    { id: "bca", balance: 18450000 }, { id: "jago", balance: 7320000 }, { id: "cash", balance: 850000 },
  ],
  budgets: [{ id: "b1" }, { id: "b2" }, { id: "b3" }, { id: "b4" }],
  subscriptions: [{ id: "s1", active: true }, { id: "s2", active: true }, { id: "s3", active: true }, { id: "s4", active: false }],
  financial_goals: [{ id: "g1", progress: 62 }, { id: "g2", progress: 28 }, { id: "g3", progress: 37 }],
  academic_records: [
    { credits: 4, grade: "A", semester: "1" }, { credits: 3, grade: "A-", semester: "1" },
    { credits: 3, grade: "B+", semester: "2" }, { credits: 4, grade: "A", semester: "2" },
    { credits: 2, grade: "B", semester: "3" }, { credits: 4, grade: "A", semester: "3" },
  ],
};

function formatIDR(value) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value || 0);
}

const compactIDR = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", notation: "compact", maximumFractionDigits: 1 });

function InsightCard({ icon: Icon, eyebrow, title, children }) {
  return <article className="hub-insight-card"><Icon aria-hidden="true" /><span>{eyebrow}</span><h2>{title}</h2>{children}</article>;
}

export default function InsightsPreview() {
  const snapshot = deriveInsightsSnapshot(records, new Date(2026, 10, 3));
  const { finance, academic } = snapshot;
  const trendMaximum = Math.max(...finance.trend.map(({ total }) => total), 1);
  return (
    <main className="hub-private-page">
      <header className="hub-private-heading hub-reveal">
        <span>OPERATION INSIGHTS</span>
        <h1>Reality, not dashboard theater</h1>
        <p>Small analytics derived only from your authenticated Finance records.</p>
      </header>
      <div className="hub-insights-grid">
        <InsightCard icon={CircleDollarSign} eyebrow="FINANCE / CURRENT MONTH" title={finance.expenseCount ? formatIDR(finance.currentExpenses) : "No expense data."}>
          {!finance.hasData ? <p>No finance records yet.</p> : <>{finance.hasTrend && <div className="hub-insight-trend" aria-label="Six-month expense trend">{finance.trend.map((month, index) => { const current = index === finance.trend.length - 1; return <span key={month.key} data-current={current || undefined}>{current && <b>{compactIDR.format(month.total)}</b>}<i style={{ height: `${(month.total / trendMaximum) * 100}%` }} /><small>{month.label}</small></span>; })}</div>}<dl><div><dt>Balance total</dt><dd>{finance.accountCount ? formatIDR(finance.balanceTotal) : "No accounts"}</dd></div><div><dt>Previous month</dt><dd>{finance.previousExpenses ? formatIDR(finance.previousExpenses) : "No prior expense"}</dd></div><div><dt>Budgets / goals</dt><dd>{finance.budgetCount} / {finance.goalCount}</dd></div><div><dt>Active subscriptions</dt><dd>{finance.activeSubscriptions}</dd></div>{finance.goalProgress !== null && <div><dt>Average goal progress</dt><dd>{finance.goalProgress.toFixed(0)}%</dd></div>}</dl></>}
        </InsightCard>
        <InsightCard icon={GraduationCap} eyebrow="ACADEMIC / CUMULATIVE" title={academic.ipk === null ? "No academic data." : `IPK ${academic.ipk.toFixed(2)}`}>
          {!academic.hasData ? <p>Add a grade record to calculate credits and IPK.</p> : <dl><div><dt>Credits / SKS</dt><dd>{academic.credits}</dd></div><div><dt>Semesters</dt><dd>{academic.semesterCount}</dd></div><div><dt>Grade records</dt><dd>{academic.recordCount}</dd></div></dl>}
        </InsightCard>
      </div>
    </main>
  );
}
