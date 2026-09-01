import OsintWorkspace from "@/components/hub/OsintWorkspace";

export const metadata = { title: "OSINT — Personal Hub" };

export default function OsintPage() {
  return (
    <main className="hub-private-page">
      <header className="hub-private-heading hub-reveal">
        <span>09 / OSINT</span>
        <h1>Private research utilities.</h1>
        <p>Tools that operate through authenticated, server-side access. Results remain private to this session.</p>
      </header>

      <OsintWorkspace />
    </main>
  );
}
