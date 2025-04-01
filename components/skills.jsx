"use client";

import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";

export default function Skills() {
  const skills = [
    {
      category: "Frontend",
      items: ["HTML5", "CSS3", "JavaScript", "Next.js", "Tailwind CSS"],
    },
    {
      category: "Backend",
      items: ["Node.js", "Express", "REST APIs", "Prisma"],
    },
    {
      category: "Tools",
      items: ["Git", "GitHub", "VS Code", "Docker"],
    },
    {
      category: "Cyber Security",
      items: [
        "Kali Linux",
        "Metasploit",
        "Burp Suite",
        "Wireshark",
        "Nmap",
        "Penetration Testing",
        "Vulnerability Assessment",
        "OSINT Tools",
      ],
    },
  ];

  return (
    <section id="skills" className="py-20">
      <div className="container max-w-5xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl font-bold mb-2">Skills</h2>
          <div className="w-20 h-1 bg-primary mx-auto mb-6"></div>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            I've worked with a variety of technologies in the web development
            world. Here's a quick overview of my technical skills and areas of
            expertise.
          </p>
        </motion.div>
        <div className="flex flex-wrap gap-2">
          {skills
            .flatMap((group) => group.items)
            .map((skill, index) => (
              <motion.div
                key={skill}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: index * 0.05 }}
                viewport={{ once: true }}
              >
                <Badge variant="secondary" className="px-3 py-1 text-sm">
                  {skill}
                </Badge>
              </motion.div>
            ))}
        </div>
      </div>
    </section>
  );
}
