import { Globe, Building, BookOpen, Settings } from "lucide-react";
import Link from "next/link";
export default function Services() {
  const services = [
    {
      icon: <Globe className="w-12 h-12" />,
      title: "Landing Pages",
      description:
        "High-converting landing pages designed to capture leads and drive conversions. Optimized for performance and user experience.",
      features: [
        "Responsive Design",
        "SEO Optimized",
        "Fast Loading",
        "Conversion Focused",
      ],
    },
    {
      icon: <Building className="w-12 h-12" />,
      title: "Company Profiles",
      description:
        "Professional company websites that showcase your brand, values, and services. Perfect for establishing credibility online.",
      features: [
        "Professional Design",
        "Brand Integration",
        "Content Management",
        "Mobile Friendly",
      ],
    },
    {
      icon: <BookOpen className="w-12 h-12" />,
      title: "Blog Websites",
      description:
        "Feature-rich blog platforms with modern design and powerful content management capabilities for content creators.",
      features: [
        "Content Management",
        "SEO Features",
        "Social Integration",
        "Comment System",
      ],
    },
    {
      icon: <Settings className="w-12 h-12" />,
      title: "Custom Web Solutions",
      description:
        "Tailored web applications built to meet your specific business needs and requirements. From simple tools to complex systems.",
      features: [
        "Custom Development",
        "API Integration",
        "Database Design",
        "Scalable Architecture",
      ],
    },
  ];

  return (
    <section id="services" className="py-20 px-4 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Services I Offer
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            I provide comprehensive web development services to help your
            business succeed online. From simple landing pages to complex web
            applications, I&apos;ve got you covered.{" "}
            <Link href="/pricing" className="text-blue-600 underline">
              Pricelist
            </Link>
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {services.map((service, index) => (
            <div
              key={index}
              className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="text-gray-700 mb-6">{service.icon}</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                {service.title}
              </h3>
              <p className="text-gray-600 mb-6">{service.description}</p>
              <ul className="space-y-2">
                {service.features.map((feature, featureIndex) => (
                  <li
                    key={featureIndex}
                    className="flex items-center text-gray-600"
                  >
                    <div className="w-2 h-2 bg-gray-400 rounded-full mr-3"></div>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
