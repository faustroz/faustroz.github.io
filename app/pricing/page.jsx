import Pricing from "@/components/pricing"

export const metadata = {
  title: "Paket & Harga - Ferdy Diatmika Web Developer",
  description:
    "Paket web development terjangkau mulai dari Rp500.000. Landing page, company profile, dan custom website dengan kualitas profesional.",
  keywords: "harga website, paket web developer, jasa pembuatan website, landing page murah, company profile",
}

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <Pricing />
    </main>
  )
}
