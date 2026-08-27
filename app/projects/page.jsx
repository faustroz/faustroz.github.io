import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { PROJECTS } from "@/lib/hub/content.mjs";

export const metadata = {
  title: "Projects — Ferdy Personal Hub",
  description: "Products, experiments, and systems built by Ferdy Diatmika.",
};

export default function ProjectsPage() {
  return (
    <main className="hub-page hub-projects-page">
      <header className="hub-page-heading hub-reveal">
        <span>03 / PROJECT ARCHIVE</span>
        <h1>Work that made it out of my head.</h1>
        <p>Products and experiments built around real workflows—not portfolio filler.</p>
      </header>

      <section className="hub-project-list" aria-label="Selected projects">
        {PROJECTS.map((project, index) => (
          <article className={`hub-project-record hub-reveal hub-reveal--${Math.min(index + 1, 4)}`} key={project.name}>
            <div className="hub-project-index">{String(index + 1).padStart(2, "0")}</div>
            <div className="hub-project-image">
              <Image
                src={project.image}
                alt={`${project.name} interface preview`}
                fill
                sizes="(min-width: 900px) 42vw, 100vw"
                className={project.imageClass}
              />
            </div>
            <div className="hub-project-copy">
              <span>{project.tag}</span>
              <h2>{project.name}</h2>
              <p>{project.description}</p>
              {project.href ? (
                <Link href={project.href} target="_blank" rel="noreferrer">
                  Visit project <ArrowUpRight aria-hidden="true" />
                </Link>
              ) : (
                <div className="hub-project-pending">IN ACTIVE DEVELOPMENT</div>
              )}
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
