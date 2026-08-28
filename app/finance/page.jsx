import Link from "next/link";
import { ArrowUpRight, Landmark } from "lucide-react";
import ModuleWorkspace from "@/components/hub/ModuleWorkspace";
import { FINANCE_CHANNELS } from "@/lib/hub/module-config.mjs";

export const metadata = { title: "Finance — Personal Hub" };

export default function FinancePage() {
  return (
    <main className="hub-private-page">
      <header className="hub-private-heading hub-reveal"><span>01 / FINANCE SYSTEM</span><h1>Capital and cashflow.</h1><p>Portfolio remains intact. Operational money gets its own private ledgers.</p></header>
      <Link className="hub-specialist-link hub-reveal hub-reveal--1" href="/finance/portfolio">
        <Landmark aria-hidden="true" /><div><span>EXISTING SPECIALIST MODULE</span><h2>Portfolio Tracker</h2><p>Holdings, transactions, prices, charts, and backup tools.</p></div><ArrowUpRight aria-hidden="true" />
      </Link>
      <ModuleWorkspace channels={FINANCE_CHANNELS} />
    </main>
  );
}
