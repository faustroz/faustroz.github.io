import AuscultationLab from "@/components/hub/AuscultationLab";

export const metadata = { title: "Auscultation Lab — Academic | 4allx", robots: "noindex, nofollow" };

export default function AcademicAuscultationLabRoute() {
  return (
    <main className="hub-private-page hub-ausc-page">
      <header className="hub-private-heading hub-reveal">
        <span>10 / ACADEMIC · AUSCULTATION LAB</span>
        <h1>Train the ear, not just the eye</h1>
        <p>Heart and lung recordings from a clinical manikin, labelled by sound type and auscultation site. Educational use — not patient data, not clinical advice.</p>
      </header>
      <AuscultationLab />
    </main>
  );
}
