"use client";

import { motion } from "framer-motion";
import { Github, Mail, Instagram } from "lucide-react";
import Link from "next/link";

export default function Contact() {
  return (
    <section id="contact" className="py-20">
      <div className="container max-w-5xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl font-bold mb-2">Get In Touch</h2>
          <div className="w-20 h-1 bg-primary mx-auto mb-6"></div>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Have a project in mind or want to collaborate? Feel free to reach
            out to me using the links below.
          </p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          viewport={{ once: true }}
          className="flex justify-center gap-6 mb-8" // Tambah mb-8 untuk memberi jarak
        >
          <Link
            href="https://github.com/faustroz"
            target="_blank"
            rel="noopener noreferrer"
            className="p-3 rounded-full bg-card shadow-md hover:bg-primary/20 transition-all"
          >
            <Github className="w-6 h-6 text-muted-foreground" />
          </Link>

          <Link
            href="mailto:your.email@example.com"
            className="p-3 rounded-full bg-card shadow-md hover:bg-primary/20 transition-all"
          >
            <Mail className="w-6 h-6 text-muted-foreground" />
          </Link>

          <Link
            href="https://instagram.com/f0.dev"
            target="_blank"
            rel="noopener noreferrer"
            className="p-3 rounded-full bg-card shadow-md hover:bg-primary/20 transition-all"
          >
            <Instagram className="w-6 h-6 text-muted-foreground" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
