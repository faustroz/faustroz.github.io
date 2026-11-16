import { Activity, ArrowUpRight, ScanLine, Stethoscope } from "lucide-react";
import AcademicPanel from "@/components/hub/AcademicPanel";

export const metadata = { title: "Academic Record — Personal Hub" };

const CLINICAL_LABS = [
  { href: "/academic/pocus-lab", label: "POCUS Lab", Icon: ScanLine },
  { href: "/academic/ecg-lab", label: "ECG Lab", Icon: Activity },
  { href: "/academic/auscultation-lab", label: "Auscultation Lab", Icon: Stethoscope },
];

export default function AcademicPage() {
  return (
    <main className="hub-private-page hub-academic-page">
      <header className="hub-private-heading">
        <span>ACADEMIC RECORD</span>
        <h1>Credits, grades, clarity.</h1>
        <p>IP and cumulative IPK are calculated from your private grade records.</p>
      </header>

      <nav className="hub-academic-labs" aria-label="Clinical labs">
        <span>CLINICAL LABS</span>
        <div>
          {CLINICAL_LABS.map(({ href, label, Icon }) => (
            <a key={href} className="hub-academic-lab" href={href}>
              <i aria-hidden="true"><Icon /></i>
              <strong>{label}</strong>
              <em>Open <ArrowUpRight aria-hidden="true" /></em>
            </a>
          ))}
        </div>
      </nav>

      <AcademicPanel />
    </main>
  );
}
