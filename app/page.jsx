import { Activity, Fingerprint, LockKeyhole, Radio } from "lucide-react";
import ModuleCard from "@/components/hub/ModuleCard";
import YouTubeSummaryCard from "@/components/hub/YouTubeSummaryCard";

export default function Home() {
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
          <p>Medicine, software, finance, and creative work—organized as modules, not noise.</p>
          <div className="hub-focus-footer"><Activity aria-hidden="true" /> PERSONAL OS / REV. 01</div>
        </aside>
      </section>

      <section className="hub-module-grid" aria-label="Personal Hub modules">
        <div className="hub-reveal hub-reveal--1">
          <ModuleCard
            number="01"
            label="Finance"
            status="LOCKED"
            href="/finance/portfolio"
            title="Portfolio stays behind the gate."
            description="Open the private tracker to manage holdings, transactions, prices, and performance."
            variant="finance"
            testId="finance-summary"
          >
            <div className="hub-privacy-note"><LockKeyhole aria-hidden="true" /><span>NO FINANCIAL DATA REQUESTED ON HOME</span></div>
          </ModuleCard>
        </div>

        <div className="hub-reveal hub-reveal--2">
          <YouTubeSummaryCard />
        </div>

        <div className="hub-reveal hub-reveal--3">
          <ModuleCard
            number="03"
            label="Projects"
            status="5 LIVE"
            href="/projects"
            title="Products, experiments, and shipped work."
            description="A field log of AI tools, finance products, readers, and automation systems."
            variant="projects"
          />
        </div>

        <div className="hub-reveal hub-reveal--4">
          <ModuleCard
            number="04"
            label="About"
            status="PROFILE"
            href="/about"
            title="The person behind the systems."
            description="Medical student, developer, game builder, and persistent digital tinkerer."
            variant="about"
          />
        </div>
      </section>
    </main>
  );
}
