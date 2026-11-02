"use client";

import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useSearchParams } from "next/navigation";
import CrudPanel from "@/components/hub/CrudPanel";
import FinanceOverview from "@/components/hub/FinanceOverview";
import { FINANCE_CHANNELS } from "@/lib/hub/module-config.mjs";

const channel = (id) => FINANCE_CHANNELS.find((item) => item.id === id);
const PRIMARY_TABS = [
  { id: "overview", label: "Overview" },
  { id: "transactions", label: "Transactions" },
  { id: "planning", label: "Planning" },
  { id: "recurring", label: "Recurring" },
];
const SUBTABS = {
  transactions: ["income", "expenses", "transfers"],
  planning: ["categories", "budgets"],
};
const CHANNEL_DESTINATIONS = {
  income: { tab: "transactions", subtab: "income" },
  expenses: { tab: "transactions", subtab: "expenses" },
  transfers: { tab: "transactions", subtab: "transfers" },
  categories: { tab: "planning", subtab: "categories" },
  budgets: { tab: "planning", subtab: "budgets" },
  subscriptions: { tab: "recurring" },
  accounts: { detail: "accounts" },
  goals: { detail: "goals" },
};

function ChannelPanel({ id }) {
  const config = channel(id);
  if (!config) return null;
  return config.sections
    ? <div className="hub-crud-sections">{config.sections.map((section) => <CrudPanel key={section.id} {...section} />)}</div>
    : <CrudPanel {...config} />;
}

export default function FinanceWorkspace() {
  const searchParams = useSearchParams();
  const requestedChannel = searchParams.get("channel");
  const [activeTab, setActiveTab] = useState("overview");
  const [activeSubtab, setActiveSubtab] = useState({ transactions: "income", planning: "categories" });
  const [detail, setDetail] = useState(null);
  const detailChannel = detail ? channel(detail) : null;

  useEffect(() => {
    const destination = CHANNEL_DESTINATIONS[requestedChannel];
    if (!destination) return;
    setDetail(destination.detail || null);
    if (destination.tab) setActiveTab(destination.tab);
    if (destination.subtab) setActiveSubtab((current) => ({ ...current, [destination.tab]: destination.subtab }));
  }, [requestedChannel]);

  const selectTab = (id) => {
    setDetail(null);
    setActiveTab(id);
  };

  return <section className="hub-finance-workspace" aria-label="Finance workspace">
    {detailChannel ? <>
      <button type="button" className="hub-finance-back" onClick={() => setDetail(null)}><ArrowLeft size={17} aria-hidden="true" /> Back</button>
      <ChannelPanel id={detail} />
    </> : <>
      <nav className="hub-finance-primary-tabs" aria-label="Finance sections">
        {PRIMARY_TABS.map(({ id, label }) => <button key={id} type="button" onClick={() => selectTab(id)} aria-current={activeTab === id ? "page" : undefined}>{label}</button>)}
      </nav>

      {activeTab === "overview" && <>
        <FinanceOverview onOpenAccounts={() => setDetail("accounts")} onOpenGoals={() => setDetail("goals")} />
      </>}

      {SUBTABS[activeTab] && <>
        <nav className="hub-finance-subtabs" aria-label={`${activeTab} views`}>
          {SUBTABS[activeTab].map((id) => <button key={id} type="button" onClick={() => setActiveSubtab((current) => ({ ...current, [activeTab]: id }))} aria-current={activeSubtab[activeTab] === id ? "page" : undefined}>{id === "budgets" ? "Budgets" : id === "categories" ? "Categories" : channel(id)?.label}</button>)}
        </nav>
        <ChannelPanel id={activeSubtab[activeTab]} />
      </>}

      {activeTab === "recurring" && <ChannelPanel id="subscriptions" />}
    </>}
  </section>;
}
