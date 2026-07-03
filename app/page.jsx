import Hero from "@/components/hero";
import About from "@/components/about";
import Portfolio from "@/components/portfolio";

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50">
      <Hero />
      <About />
      <Portfolio />
    </main>
  );
}
