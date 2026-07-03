import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

const projects = [
  {
    name: "Clipra",
    tag: "AI Video Clipper",
    description:
      "YouTube-to-short-form workflow: paste a video URL, choose timestamps, transcribe with Whisper, burn captions, and export vertical clips.",
    href: "https://clipra.app/",
    image: "/portfolio/clipra.png",
    imageClass: "object-cover",
  },
  {
    name: "Confluo",
    tag: "AI Trading Co-Pilot",
    description:
      "Discord bot that scans crypto, stocks, and forex for technical setups confirmed by sentiment, then posts structured alerts and recaps.",
    href: "https://confluo.app/",
    image: "/portfolio/confluo.png",
    imageClass: "object-cover",
  },
  {
    name: "Invopajak",
    tag: "Invoice & Tax SaaS",
    description:
      "Full-stack invoice system for Indonesian freelancers and small businesses with clients, PPN/PPh tax math, PDF export, and email sending.",
    href: "https://invopajak.com/",
    image: "/portfolio/invopajak.png",
    imageClass: "object-cover",
  },
  {
    name: "Yomu",
    tag: "Comic Reader",
    description:
      "Modern manga and comic reader with search, latest/popular collections, reading history, chapter pages, and a dark reading-first interface.",
    href: "https://yomu-coral.vercel.app/",
    image: "/portfolio/yomu.png",
    imageClass: "object-cover object-top",
  },
];

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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
          {projects.map((project) => (
            <Link
              key={project.name}
              href={project.href}
              target="_blank"
              rel="noreferrer"
              aria-label={`Open ${project.name} website`}
              className="group block overflow-hidden rounded-2xl bg-white shadow-sm hover:shadow-md transition-shadow border border-gray-100"
            >
              <div className="relative aspect-[16/10] bg-gray-100 overflow-hidden">
                <Image
                  src={project.image}
                  alt={`${project.name} preview`}
                  fill
                  sizes="(min-width: 1024px) 25vw, (min-width: 768px) 50vw, 100vw"
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
                  <ArrowUpRight className="w-5 h-5 text-gray-700 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
                </div>

                <p className="text-gray-600 text-sm leading-relaxed">
                  {project.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

