import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { PROJECTS } from "@/lib/hub/content.mjs";

export default function Portfolio() {
  return (
    <section id="portfolio" className="lp-section lp-section--soft">
      <div className="lp-shell">
        <div className="lp-section__head">
          <div>
            <p className="lp-eyebrow">Selected work</p>
            <h2 className="lp-h2">Portfolio</h2>
          </div>
          <p className="lp-section__intro">
            Selected apps I built to turn repetitive workflows into practical
            digital products.
          </p>
        </div>

        <div className="lp-works">
          {PROJECTS.map((project, index) => {
            const featured = index === 0;
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
                      <h3 className="lp-work__name">{project.name}</h3>
                    </div>
                    {project.href && (
                      <ArrowUpRight className="lp-work__arrow" aria-hidden="true" />
                    )}
                  </div>

                  <p className="lp-work__desc">{project.description}</p>
                </div>
              </>
            );

            return project.href ? (
              <Link
                key={project.name}
                href={project.href}
                target="_blank"
                rel="noreferrer"
                aria-label={`Open ${project.name} website`}
                className={className}
              >
                {content}
              </Link>
            ) : (
              <article key={project.name} className={className}>
                {content}
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
