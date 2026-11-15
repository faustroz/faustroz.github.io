import ModuleWorkspace from "@/components/hub/ModuleWorkspace";
import { REFERENCE_CHANNELS } from "@/lib/hub/module-config.mjs";

export const metadata = { title: "Referensi — Academic | 4allx", robots: "noindex, nofollow" };

export default function AcademicReferencePage() {
  return (
    <main className="hub-private-page hub-academic-page">
      <header className="hub-private-heading">
        <span>ACADEMIC REFERENCE</span>
        <h1>Obat, nilai, dosis.</h1>
        <p>Rujukan pribadi yang kamu isi sendiri. Tidak ada data bawaan dari luar.</p>
      </header>
      <ModuleWorkspace channels={REFERENCE_CHANNELS} />
    </main>
  );
}
