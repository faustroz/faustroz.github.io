import Hero from "@/components/hero";
import About from "@/components/about";
import Portfolio from "@/components/portfolio";

export default function Home() {
  return (
    <>
      <main className="min-h-screen bg-gray-50">
        <Hero />
        <About />
        <Portfolio />
      </main>
      <footer className="bg-black text-white py-8 px-4 border-t border-neutral-900">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-neutral-500 text-sm">
            © {new Date().getFullYear()} Ferdy Diatmika. All rights reserved.
          </p>
        </div>
      </footer>
    </>
  );
}
