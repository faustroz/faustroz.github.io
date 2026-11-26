import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { PROJECT_CATEGORIES } from "@/lib/hub/content.mjs";

function WorkCard({ project, featured }) {
  const className = `lp-work${featured ? " lp-work--feature" : ""}`;

  const content = (
    <>
      <div className="lp-work__media">
        <Image
          src={project.image}
          alt={`${project.name} preview`}
          fill
          sizes={
            featured
              ? "(min-width: 900px) 66vw, 100vw"
              : "(min-width: 900px) 33vw, 100vw"
          }
          className={project.imageClass}
        />
      </div>

      <div className="lp-work__body">
        <div className="lp-work__row">
          <div>
            <p className="lp-work__tag">{project.tag}</p>
            <h4 className="lp-work__name">{project.name}</h4>
          </div>
          {project.href ? (
            <ArrowUpRight className="lp-work__arrow" aria-hidden="true" />
          ) : null}
        </div>

        <p className="lp-work__desc">{project.description}</p>
      </div>
    </>
  );

  return project.href ? (
    <Link
      href={project.href}
      target="_blank"
      rel="noreferrer"
      aria-label={`Open ${project.name} website`}
      className={className}
    >
      {content}
    </Link>
  ) : (
    <article className={className}>{content}</article>
  );
}

export default function Projects() {
  return (
    <section id="portfolio" className="lp-section lp-section--soft">
      <div className="lp-shell">
        <div className="lp-section__head">
          <div>
            <p className="lp-eyebrow">Selected work</p>
            <h2 className="lp-h2">Portfolio</h2>
          </div>
          <p className="lp-section__intro">
            Three areas of work: shipped games and applications, playable map
            showcases, and production-ready 3D assets.
          </p>
        </div>

        <div className="lp-workgroups">
          {PROJECT_CATEGORIES.map((category) => (
            <div key={category.id} className="lp-workgroup">
              <div className="lp-workgroup__head">
                <p className="lp-eyebrow">
                  {category.index} / {category.title}
                </p>
                <h3 className="lp-workgroup__title">{category.title}</h3>
                <p className="lp-workgroup__desc">{category.description}</p>
              </div>

              <div className="lp-works">
                {category.items.map((project, index) => (
                  <WorkCard
                    key={`${category.id}-${project.name}`}
                    project={project}
                    featured={category.id === "projects" && index === 0}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
