import Link from "next/link";

const LINKS = [
  { label: "About", href: "#about" },
  { label: "Work", href: "#portfolio" },
];

export default function SiteHeader() {
  return (
    <header className="lp-header">
      <div className="lp-shell lp-header__inner">
        <Link href="/" className="lp-brand" aria-label="Ferdy Diatmika, back to top">
          <span className="lp-brand__mark" aria-hidden="true">
            FD
          </span>
          <span>Ferdy Diatmika</span>
        </Link>

        <nav className="lp-nav" aria-label="Primary">
          {LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="lp-nav__link">
              {link.label}
            </Link>
          ))}
          <Link
            href="mailto:ferdydiatmika171@gmail.com"
            className="lp-nav__link lp-nav__cta"
          >
            Get in touch
          </Link>
        </nav>
      </div>
    </header>
  );
}
