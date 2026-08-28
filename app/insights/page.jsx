import OperationsInsights from "@/components/hub/OperationsInsights";

export const metadata = { title: "Insights — Personal Hub" };

export default function InsightsPage() {
  return (
    <main className="hub-private-page">
      <header className="hub-private-heading hub-reveal">
        <span>06 / OPERATION INSIGHTS</span>
        <h1>Reality, not dashboard theater.</h1>
        <p>Small analytics derived only from your authenticated Finance, Study, and Projects records.</p>
      </header>
      <OperationsInsights />
    </main>
  );
}
