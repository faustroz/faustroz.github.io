import Link from "next/link";
import { ArrowUpRight, Phone } from "lucide-react";

export const metadata = { title: "OSINT — Personal Hub" };

export default function OsintPage() {
  return (
    <main className="hub-private-page">
      <header className="hub-private-heading hub-reveal">
        <span>09 / OSINT</span>
        <h1>Private research utilities.</h1>
        <p>Tools that operate through authenticated, server-side access. Results remain private to this session.</p>
      </header>

      <Link className="hub-specialist-link hub-reveal hub-reveal--1" href="/phone-lookup">
        <Phone aria-hidden="true" />
        <div>
          <span>OSINT UTILITY</span>
          <h2>Phone Lookup</h2>
          <p>Check one number for its available profile, tags, and provider quota.</p>
        </div>
        <ArrowUpRight aria-hidden="true" />
      </Link>
    </main>
  );
}
