import Image from "next/image";
import Link from "next/link";
import {
  ArrowUpRight,
  Code2,
  Gamepad2,
  Github,
  Instagram,
  Mail,
  Palette,
  Stethoscope,
} from "lucide-react";
import { CONTACTS, HUB_PROFILE, SKILLS } from "@/lib/hub/content.mjs";

const skillIcons = {
  medicine: Stethoscope,
  games: Gamepad2,
  web: Code2,
  design: Palette,
};

const contactItems = [
  { label: "GitHub", href: CONTACTS.github, icon: Github, external: true },
  { label: "Instagram", href: CONTACTS.instagram, icon: Instagram, external: true },
  { label: "Email", href: CONTACTS.email, icon: Mail, external: false },
];

export const metadata = {
  title: "About — Ferdy Personal Hub",
  description: "About Ferdy Diatmika, medical student and software builder.",
};

export default function AboutPage() {
  return (
    <main className="hub-page hub-about-page">
      <section className="hub-about-intro hub-reveal">
        <div className="hub-about-portrait">
          <Image src="/ferdy.webp" alt="Ferdy Diatmika" fill sizes="(min-width: 900px) 36vw, 100vw" priority />
          <span>SUBJECT / FD-01</span>
        </div>
        <div className="hub-about-copy">
          <span>04 / PERSONNEL FILE</span>
          <h1>{HUB_PROFILE.name}</h1>
          <strong>{HUB_PROFILE.role}</strong>
          <p>{HUB_PROFILE.longBio}</p>
          <div className="hub-about-signoff">BASED IN INDONESIA / AVAILABLE ONLINE</div>
        </div>
      </section>

      <section className="hub-skill-grid" aria-label="Areas of practice">
        {SKILLS.map((skill, index) => {
          const Icon = skillIcons[skill.id];
          return (
            <article className={`hub-skill-card hub-reveal hub-reveal--${index + 1}`} key={skill.id}>
              <div><span>{String(index + 1).padStart(2, "0")}</span><Icon aria-hidden="true" /></div>
              <h2>{skill.title}</h2>
              <p>{skill.description}</p>
            </article>
          );
        })}
      </section>

      <section className="hub-contact-panel">
        <div><span>OPEN CHANNEL</span><h2>Let’s build something useful.</h2></div>
        <nav aria-label="Contact links">
          {contactItems.map(({ label, href, icon: Icon, external }) => (
            <Link key={label} href={href} target={external ? "_blank" : undefined} rel={external ? "noreferrer" : undefined}>
              <Icon aria-hidden="true" /><span>{label}</span><ArrowUpRight aria-hidden="true" />
            </Link>
          ))}
        </nav>
      </section>
    </main>
  );
}
