import PocusLab from "@/components/hub/PocusLab";

export const metadata = { title: "POCUS Lab — Academic | 4allx", robots: "noindex, nofollow" };

export default function AcademicPocusLabRoute() {
  return (
    <main className="hub-private-page hub-pocus-page">
      <header className="hub-private-heading hub-reveal">
        <span>08 / ACADEMIC · POCUS LAB</span>
        <h1>Cardiac ultrasound, real recordings</h1>
        <p>Curated point-of-care ultrasound recordings from the Edus2 collection. Educational use — not clinical imaging.</p>
      </header>
      <PocusLab />
    </main>
  );
}
