import ModuleWorkspace from "@/components/hub/ModuleWorkspace";
import { STUDY_CHANNELS } from "@/lib/hub/module-config.mjs";

export const metadata = { title: "Study — Personal Hub" };

export default function StudyPage() {
  return (
    <main className="hub-private-page">
      <header className="hub-private-heading hub-reveal"><span>02 / STUDY SYSTEM</span><h1>Learning operations.</h1><p>Topics and visible progress in one private command surface.</p></header>
      <ModuleWorkspace channels={STUDY_CHANNELS} />
    </main>
  );
}
