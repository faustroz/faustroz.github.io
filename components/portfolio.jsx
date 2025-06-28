import { ExternalLink, Github } from "lucide-react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";

export default function Portfolio() {
  const projects = [
    {
      title: "E-commerce Platform",
      description:
        "A modern e-commerce platform built with Next.js and Stripe integration. Features include product catalog, shopping cart, and secure checkout.",
      image: "/placeholder.svg?height=300&width=500",
      technologies: ["Next.js", "TypeScript", "Tailwind CSS", "Stripe"],
      liveUrl: "#",
      githubUrl: "#",
    },
    {
      title: "Restaurant Website",
      description:
        "Responsive restaurant website with online menu, reservation system, and location information. Optimized for mobile devices.",
      image: "/placeholder.svg?height=300&width=500",
      technologies: ["React", "Node.js", "MongoDB", "CSS3"],
      liveUrl: "#",
      githubUrl: "#",
    },
    {
      title: "Portfolio Dashboard",
      description:
        "Investment portfolio tracking dashboard with real-time data visualization and performance analytics.",
      image: "/placeholder.svg?height=300&width=500",
      technologies: ["React", "Chart.js", "Firebase", "Material-UI"],
      liveUrl: "#",
      githubUrl: "#",
    },
    {
      title: "Blog Platform",
      description:
        "Modern blog platform with content management system, user authentication, and social sharing features.",
      image: "/placeholder.svg?height=300&width=500",
      technologies: ["Next.js", "Prisma", "PostgreSQL", "NextAuth"],
      liveUrl: "#",
      githubUrl: "#",
    },
    {
      title: "Task Management App",
      description:
        "Collaborative task management application with team features, project tracking, and deadline notifications.",
      image: "/placeholder.svg?height=300&width=500",
      technologies: ["Vue.js", "Express.js", "Socket.io", "MySQL"],
      liveUrl: "#",
      githubUrl: "#",
    },
    {
      title: "Weather App",
      description:
        "Beautiful weather application with location-based forecasts, interactive maps, and weather alerts.",
      image: "/placeholder.svg?height=300&width=500",
      technologies: ["React Native", "OpenWeather API", "Redux", "Expo"],
      liveUrl: "#",
      githubUrl: "#",
    },
  ];

  return (
    <section id="portfolio" className="py-20 px-4 bg-white">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            My Portfolio
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Coming Soon...
            {/* Here are some of my recent projects that showcase my skills and
            experience in web development. Each project represents a unique
            challenge and solution. */}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* {projects.map((project, index) => (
            <div
              key={index}
              className="bg-gray-50 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="relative h-48 bg-gray-200">
                <Image src={project.image || "/placeholder.svg"} alt={project.title} fill className="object-cover" />
              </div>
              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-3">{project.title}</h3>
                <p className="text-gray-600 mb-4">{project.description}</p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {project.technologies.map((tech, techIndex) => (
                    <span key={techIndex} className="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded-full">
                      {tech}
                    </span>
                  ))}
                </div>
                <div className="flex gap-3">
                  <Button asChild variant="outline" size="sm">
                    <Link href={project.liveUrl} className="flex items-center gap-2">
                      <ExternalLink className="w-4 h-4" />
                      Live Demo
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <Link href={project.githubUrl} className="flex items-center gap-2">
                      <Github className="w-4 h-4" />
                      Code
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          ))} */}
        </div>
      </div>
    </section>
  );
}
