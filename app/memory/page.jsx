import ModuleWorkspace from "@/components/hub/ModuleWorkspace";
import { MEMORY_CHANNELS } from "@/lib/hub/module-config.mjs";

export const metadata = { title: "AI Memory — Personal Hub" };

export default function MemoryPage() {
  return (
    <main className="hub-private-page">
      <header className="hub-private-heading hub-reveal"><span>04 / AI MEMORY</span><h1>Context, made durable.</h1><p>Private structured memory prepared for future authenticated API access. No external AI calls are made in Phase 4.</p></header>
      <ModuleWorkspace channels={MEMORY_CHANNELS} />
    </main>
  );
}
