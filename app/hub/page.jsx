import { Activity, Fingerprint, LockKeyhole, Radio } from "lucide-react";
import ModuleCard from "@/components/hub/ModuleCard";
import OperationsSummary from "@/components/hub/OperationsSummary";
import { HUB_PROFILE } from "@/lib/hub/content.mjs";

export default function HubHome() {
  return (
    <main className="hub-dashboard">
      <section className="hub-dashboard-intro hub-reveal">
        <div className="hub-intro-copy">
          <div className="hub-kicker"><Radio aria-hidden="true" /> OPERATIONS / HOME</div>
          <h1>Personal command center.</h1>
          <p>
            One quiet place for the systems I build, track, and keep moving.
            Finance stays private. The rest stays within reach.
          </p>
        </div>

        <aside className="hub-focus-panel">
          <div className="hub-module-meta">
            <span>CURRENT FOCUS</span>
            <span className="hub-module-status"><i aria-hidden="true" />ACTIVE</span>
          </div>
          <div className="hub-focus-icon"><Fingerprint aria-hidden="true" /></div>
          <h2>Build useful systems.</h2>
          <p>{HUB_PROFILE.currentFocus}</p>
          <div className="hub-focus-footer"><Activity aria-hidden="true" /> PERSONAL OS / REV. 01</div>
        </aside>
      </section>

      <OperationsSummary />

      <section className="hub-module-grid" aria-label="Personal Hub modules">
        <div className="hub-reveal hub-reveal--1">
          <ModuleCard
            number="01"
            label="Finance"
            status="LOCKED"
            href="/finance"
            title="Capital and cashflow stay private."
            description="Portfolio, expenses, budgets, and recurring subscriptions behind one authenticated channel."
            variant="finance"
            testId="finance-summary"
          >
            <div className="hub-privacy-note"><LockKeyhole aria-hidden="true" /><span>NO FINANCIAL DATA REQUESTED ON HOME</span></div>
          </ModuleCard>
        </div>

        <div className="hub-reveal hub-reveal--2">
          <ModuleCard
            number="02"
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
            number="03"
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
            number="04"
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
