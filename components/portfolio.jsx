import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { PROJECTS } from "@/lib/hub/content.mjs";

export default function Portfolio() {
  return (
    <section id="portfolio" className="py-16 md:py-20 px-4 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12 md:mb-16">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Portfolio
          </h2>
          <p className="text-sm sm:text-base md:text-lg text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Selected apps I built to turn repetitive workflows into practical digital products.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {PROJECTS.map((project) => {
            const content = (
              <>
                <div className="relative aspect-[16/10] bg-gray-100 overflow-hidden">
                  <Image
                    src={project.image}
                    alt={`${project.name} preview`}
                    fill
                    sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                    className={`${project.imageClass} transition-transform duration-300 group-hover:scale-105`}
                  />
                </div>

                <div className="p-6">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500 mb-2">
                        {project.tag}
                      </p>
                      <h3 className="text-lg sm:text-xl font-semibold text-gray-900">
                        {project.name}
                      </h3>
                    </div>
                    {project.href && (
                      <ArrowUpRight className="w-5 h-5 text-gray-700 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
                    )}
                  </div>

                  <p className="text-gray-600 text-sm leading-relaxed">
                    {project.description}
                  </p>
                </div>
              </>
            );

            const className = "group block overflow-hidden rounded-2xl bg-white shadow-sm hover:shadow-md transition-shadow border border-gray-100";

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
