import Hero from "@/components/hero";
import About from "@/components/about";
import LabValues from "@/components/lab-values";

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50">
      <Hero />
      <About />
      <LabValues />
    </main>
  );
}
