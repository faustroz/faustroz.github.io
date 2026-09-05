import TradingMonitorDashboard from "@/components/hub/TradingMonitorDashboard";

export const metadata = { title: "Trading System — Personal Hub" };

export default function TradingPage() {
  return (
    <main className="hub-private-page hub-trading-page">
      <header className="hub-private-heading hub-reveal">
        <h1>Runtime monitoring.</h1>
        <p>Private operational telemetry for the separately deployed paper-trading system. No execution or strategy controls.</p>
      </header>
      <TradingMonitorDashboard />
    </main>
  );
}
