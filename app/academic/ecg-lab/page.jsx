import EcgLab from "@/components/hub/EcgLab";

export const metadata = { title: "ECG Interpretation Lab — Academic | 4allx", robots: "noindex, nofollow" };

export default function AcademicEcgLabRoute() {
  return (
    <main className="hub-private-page hub-ecg-page">
      <header className="hub-private-heading hub-ecg-heading hub-reveal">
        <span>ACADEMIC · ECG LAB</span>
        <h1>Read the 12-lead, systematically</h1>
        <p>Synthetic educational ECGs on realistic clinical paper — learn the patterns, then test yourself. Not patient data, not clinical advice.</p>
      </header>
      <EcgLab />
    </main>
  );
}
