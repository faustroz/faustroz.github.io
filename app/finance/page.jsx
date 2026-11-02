import FinanceWorkspace from "@/components/hub/FinanceWorkspace";

export const metadata = { title: "Finance — Personal Hub" };

export default function FinancePage() {
  return (
    <main className="hub-private-page hub-finance-page">
      <header className="hub-private-heading hub-finance-heading hub-reveal"><span>FINANCE</span><h1>Finance</h1></header>
      <FinanceWorkspace />
    </main>
  );
}
