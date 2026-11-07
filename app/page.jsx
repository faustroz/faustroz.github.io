import "./landing.css";
import SiteHeader from "@/components/site-header";
import Hero from "@/components/hero";
import About from "@/components/about";
import Portfolio from "@/components/portfolio";
import SiteFooter from "@/components/site-footer";

export default function Home() {
  return (
    <div className="lp-page">
      <SiteHeader />
      <main>
        <Hero />
        <About />
        <Portfolio />
      </main>
      <SiteFooter />
    </div>
  );
}
