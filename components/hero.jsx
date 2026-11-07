import { ArrowDown, ArrowUpRight, Github, Instagram, Mail } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const SOCIALS = [
  { label: "GitHub", href: "https://github.com/faustroz", Icon: Github },
  { label: "Instagram", href: "https://instagram.com/ferdydiatmikaa", Icon: Instagram },
  { label: "Email", href: "mailto:ferdydiatmika171@gmail.com", Icon: Mail },
];

export default function Hero() {
  return (
    <section className="lp-hero">
      <div className="lp-shell lp-hero__grid">
        <div>
          <p className="lp-eyebrow">
            <span className="lp-dot" aria-hidden="true" />
            Web Developer &amp; Digital Solutions Specialist
          </p>

          <h1 className="lp-hero__title">Ferdy Diatmika</h1>

          <p className="lp-hero__lead">
            Creating modern, responsive, and user-friendly web applications that
            help businesses grow and succeed in the digital world.
          </p>

          <div className="lp-actions">
            <Link href="#about" className="lp-btn lp-btn--primary">
              Learn More
            </Link>
            <Link
              href="mailto:ferdydiatmika171@gmail.com"
              className="lp-btn lp-btn--ghost"
            >
              Get In Touch
              <ArrowUpRight className="lp-btn__icon" aria-hidden="true" />
            </Link>
          </div>

          <div className="lp-socials">
            <p className="lp-socials__label">Elsewhere</p>
            {SOCIALS.map(({ label, href, Icon }) => (
              <Link key={label} href={href} className="lp-social">
                <Icon aria-hidden="true" />
                <span className="sr-only">{label}</span>
              </Link>
            ))}
          </div>

          <Link href="#portfolio" className="lp-scrollcue">
            Selected work
            <ArrowDown aria-hidden="true" />
          </Link>
        </div>

        <div className="lp-portrait">
          <Image
            src="/ferdy.webp"
            alt="Portrait of Ferdy Diatmika"
            fill
            sizes="(min-width: 900px) 340px, 148px"
            priority
          />
        </div>
      </div>
    </section>
  );
}
