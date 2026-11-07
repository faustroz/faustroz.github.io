import Link from "next/link";
import { Github, Instagram, Mail } from "lucide-react";

const SOCIALS = [
  { label: "GitHub", href: "https://github.com/faustroz", Icon: Github },
  { label: "Instagram", href: "https://instagram.com/ferdydiatmikaa", Icon: Instagram },
  { label: "Email", href: "mailto:ferdydiatmika171@gmail.com", Icon: Mail },
];

export default function SiteFooter() {
  return (
    <footer className="lp-footer">
      <div className="lp-shell">
        <div className="lp-footer__grid">
          <div>
            <p className="lp-footer__name">Ferdy Diatmika</p>
            <p className="lp-footer__role">
              Web Developer &amp; Digital Solutions Specialist
            </p>
          </div>

          <div className="lp-footer__links">
            <Link href="#about" className="lp-nav__link">
              About
            </Link>
            <Link href="#portfolio" className="lp-nav__link">
              Work
            </Link>
            <Link
              href="mailto:ferdydiatmika171@gmail.com"
              className="lp-nav__link"
            >
              Email
            </Link>
          </div>
        </div>

        <div className="lp-footer__bottom">
          <p>© {new Date().getFullYear()} Ferdy Diatmika. All rights reserved.</p>
          <div className="lp-footer__links">
            {SOCIALS.map(({ label, href, Icon }) => (
              <Link key={label} href={href} className="lp-social">
                <Icon aria-hidden="true" />
                <span className="sr-only">{label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
