import SettingsPanel from "@/components/hub/SettingsPanel";

export const metadata = { title: "Settings — Personal Hub" };

export default function SettingsPage() {
  return (
    <main className="hub-private-page">
      <header className="hub-private-heading hub-reveal"><span>05 / SYSTEM SETTINGS</span><h1>Operator controls.</h1><p>Account state, privacy preferences, and placeholders for future integrations.</p></header>
      <SettingsPanel />
    </main>
  );
}
