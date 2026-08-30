import { LockKeyhole } from "lucide-react";
import ModuleCard from "@/components/hub/ModuleCard";
import OperationsSummary from "@/components/hub/OperationsSummary";
import { HUB_PROFILE } from "@/lib/hub/content.mjs";

export default function HubHome() {
  return (
    <main className="hub-dashboard">
      <section className="hub-dashboard-intro hub-reveal">
        <div className="hub-intro-copy">
          <h1>Personal command center.</h1>
          <p>
            One quiet place for the systems I build, track, and keep moving.
            Finance stays private. The rest stays within reach.
          </p>
        </div>

        <aside className="hub-focus-panel">
          <div className="hub-module-meta">
            <span>Current focus</span>
            <span className="hub-module-status"><i aria-hidden="true" />Active</span>
          </div>
          <h2>Build useful systems.</h2>
          <p>{HUB_PROFILE.currentFocus}</p>
        </aside>
      </section>

      <OperationsSummary />

      <section className="hub-module-grid" aria-label="Personal Hub modules">
        <div className="hub-reveal hub-reveal--1">
          <ModuleCard
            label="Finance"
            status="LOCKED"
            href="/finance"
            title="Capital and cashflow stay private."
            description="Portfolio, expenses, budgets, and recurring subscriptions behind one authenticated channel."
            variant="finance"
            testId="finance-summary"
          >
            <div className="hub-privacy-note"><LockKeyhole aria-hidden="true" /><span>Home never requests financial data.</span></div>
          </ModuleCard>
        </div>

        <div className="hub-reveal hub-reveal--2">
          <ModuleCard
            label="Study"
            status="PRIVATE"
            href="/study"
            title="Learning operations, measured."
            description="Topics, exams, flashcards, and visible progress for focused study cycles."
            variant="study"
          />
        </div>

        <div className="hub-reveal hub-reveal--3">
          <ModuleCard
            label="Projects"
            status="PRIVATE"
            href="/projects"
            title="Execution, not exhibition."
            description="Projects, tasks, delivery progress, and changelog records in an owner-only workspace."
            variant="projects"
          />
        </div>

        <div className="hub-reveal hub-reveal--4">
          <ModuleCard
            label="Settings"
            status="PRIVATE"
            href="/settings"
            title="Control the operator layer."
            description="Account status, privacy controls, and integration placeholders."
            variant="settings"
          />
        </div>

      </section>
    </main>
  );
}
