import SettingsPanel from "@/components/hub/SettingsPanel";
import BackupPanel from "@/components/hub/BackupPanel";
import IntegrationPanel from "@/components/hub/IntegrationPanel";

export const metadata = { title: "Settings — Personal Hub" };

export default function SettingsPage() {
  return (
    <main className="hub-private-page">
      <header className="hub-private-heading hub-reveal"><span>05 / SYSTEM SETTINGS</span><h1>Operator controls.</h1><p>Account state, privacy preferences, and selected private integrations.</p></header>
      <SettingsPanel />
      <IntegrationPanel />
      <BackupPanel />
    </main>
  );
}
