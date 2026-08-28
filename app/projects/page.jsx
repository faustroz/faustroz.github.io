import ModuleWorkspace from "@/components/hub/ModuleWorkspace";
import { PROJECT_CHANNELS } from "@/lib/hub/module-config.mjs";

export const metadata = { title: "Projects — Personal Hub" };

export default function ProjectsPage() {
  return (
    <main className="hub-private-page">
      <header className="hub-private-heading hub-reveal"><span>03 / PROJECT SYSTEM</span><h1>Execution control.</h1><p>Projects, tasks, delivery progress, and changelog records—owner-visible only.</p></header>
      <ModuleWorkspace channels={PROJECT_CHANNELS} />
    </main>
  );
}
