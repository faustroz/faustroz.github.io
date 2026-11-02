import Link from "next/link";
import { ArrowUpRight, Landmark } from "lucide-react";
import FinanceOverview from "@/components/hub/FinanceOverview";
import ModuleWorkspace from "@/components/hub/ModuleWorkspace";
import { FINANCE_CHANNELS } from "@/lib/hub/module-config.mjs";

export const metadata = { title: "Finance — Personal Hub" };

export default function FinancePage() {
  return (
    <main className="hub-private-page hub-finance-page">
      <header className="hub-private-heading hub-finance-heading hub-reveal"><span>FINANCE</span><h1>Capital and cashflow.</h1></header>
      <FinanceOverview />
      <Link className="hub-specialist-link hub-finance-portfolio-link hub-reveal hub-reveal--1" href="/finance/portfolio">
        <Landmark aria-hidden="true" /><div><span>INVESTASI · TERPISAH DARI SALDO</span><h2>Portfolio Tracker</h2></div><ArrowUpRight aria-hidden="true" />
      </Link>
      <div className="hub-finance-workspace"><ModuleWorkspace channels={FINANCE_CHANNELS} /></div>
    </main>
  );
}
