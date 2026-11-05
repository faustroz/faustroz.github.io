import PocusLab from "@/components/hub/PocusLab";

export const metadata = { title: "POCUS Lab — Academic | 4allx", robots: "noindex, nofollow" };

export default function AcademicPocusLabRoute() {
  return (
    <main className="hub-private-page hub-pocus-page">
      <header className="hub-private-heading hub-reveal">
        <span>08 / ACADEMIC · POCUS LAB</span>
        <h1>Cardiac ultrasound, hands on</h1>
        <p>Interactive teaching simulator for the four basic cardiac windows. Educational simulation — not clinical imaging.</p>
      </header>
      <PocusLab />
    </main>
  );
}
