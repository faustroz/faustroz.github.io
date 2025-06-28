import { ArrowDown, Github, Instagram, Linkedin, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Hero() {
  return (
    <section className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4">
      <div className="max-w-4xl mx-auto text-center">
        <div className="mb-8">
          <div className="w-32 h-32 mx-auto mb-6 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center text-4xl font-bold text-gray-700 shadow-lg overflow-hidden">
            <img
              src="/ferdy.webp"
              alt="Profile"
              className="w-full h-full object-cover"
            />
          </div>

          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-4">
            Ferdy Diatmika
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 mb-8">
            Web Developer & Digital Solutions Specialist
          </p>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto mb-8">
            Creating modern, responsive, and user-friendly web applications that
            help businesses grow and succeed in the digital world.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
          <Button asChild size="lg" className="bg-gray-900 hover:bg-gray-800">
            <Link href="#portfolio">View My Work</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="#contact">Get In Touch</Link>
          </Button>
        </div>

        <div className="flex justify-center space-x-6 mb-12">
          <Link
            href="https://github.com/faustroz"
            className="text-gray-600 hover:text-gray-900 transition-colors"
          >
            <Github className="w-6 h-6" />
            <span className="sr-only">GitHub</span>
          </Link>
          <Link
            href="https://instagram.com/ferdydiatmikaa"
            className="text-gray-600 hover:text-gray-900 transition-colors"
          >
            <Instagram className="w-6 h-6" />
            <span className="sr-only">Instagram</span>
          </Link>
          <Link
            href="mailto:ferdydiatmika171@gmail.com"
            className="text-gray-600 hover:text-gray-900 transition-colors"
          >
            <Mail className="w-6 h-6" />
            <span className="sr-only">Email</span>
          </Link>
        </div>

        <div className="animate-bounce">
          <ArrowDown className="w-6 h-6 mx-auto text-gray-400" />
        </div>
      </div>
    </section>
  );
}
