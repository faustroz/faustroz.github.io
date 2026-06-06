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

          <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold text-gray-900 mb-4 leading-tight">
            Ferdy Diatmika
          </h1>
          <p className="text-lg sm:text-xl md:text-2xl text-gray-600 mb-6 font-medium">
            Web Developer & Digital Solutions Specialist
          </p>
          <p className="text-sm sm:text-base md:text-lg text-gray-500 max-w-2xl mx-auto mb-8 leading-relaxed">
            Creating modern, responsive, and user-friendly web applications that
            help businesses grow and succeed in the digital world.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12 w-full max-w-md mx-auto px-4">
          <Button asChild size="lg" className="w-full sm:w-auto bg-gray-900 hover:bg-gray-850">
            <Link href="#about" className="w-full justify-center">Learn More</Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
            <Link href="mailto:ferdydiatmika171@gmail.com" className="w-full justify-center">Get In Touch</Link>
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
