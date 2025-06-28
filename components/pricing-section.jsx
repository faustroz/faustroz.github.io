import { Check, MessageCircle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function PricingSection() {
  const pricingPlans = [
    {
      name: "Landing Page",
      price: "Mulai Rp500.000",
      description: "Solusi cepat untuk tampil online secara profesional",
      features: [
        "1 halaman landing page",
        "Desain responsive",
        "SEO dasar",
        "1 bulan maintenance",
        "Free update desain",
      ],
      popular: false,
    },
    {
      name: "Company Profile",
      price: "Rp1.500.000 - Rp3.000.000",
      description: "Website lengkap untuk membangun kredibilitas perusahaan",
      features: [
        "Hingga 5 halaman",
        "SEO optimization",
        "Integrasi WhatsApp",
        "CMS opsional",
        "3 bulan maintenance",
      ],
      popular: true,
    },
    {
      name: "Custom Website",
      price: "Harga Fleksibel",
      description: "Solusi khusus sesuai kebutuhan unik bisnis Anda",
      features: [
        "Layout custom",
        "Fitur khusus",
        "Integrasi sistem",
        "Support prioritas",
        "Maintenance jangka panjang",
      ],
      popular: false,
    },
  ];

  return (
    <section id="pricing" className="py-20 px-4 bg-white">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Paket & Harga
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto mb-8">
            Pilih paket yang sesuai dengan kebutuhan bisnis Anda. Semua paket
            sudah termasuk desain modern dan responsive.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              asChild
              size="lg"
              className="bg-green-600 hover:bg-green-700"
            >
              <Link
                href="https://wa.me/6281234567890"
                className="flex items-center gap-2"
              >
                <MessageCircle className="w-5 h-5" />
                Hubungi via WhatsApp
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="#portfolio" className="flex items-center gap-2">
                <ExternalLink className="w-5 h-5" />
                Lihat Portfolio
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {pricingPlans.map((plan, index) => (
            <div
              key={index}
              className={`relative bg-gray-50 rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow ${
                plan.popular ? "ring-2 ring-blue-500 scale-105" : ""
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-blue-500 text-white px-4 py-2 rounded-full text-sm font-semibold">
                    Paling Populer
                  </span>
                </div>
              )}

              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {plan.name}
                </h3>
                <div className="text-2xl font-bold text-gray-900 mb-3">
                  {plan.price}
                </div>
                <p className="text-gray-600 text-sm">{plan.description}</p>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-center gap-3">
                    <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span className="text-gray-700 text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button asChild className="w-full bg-gray-900 hover:bg-gray-800">
                <Link href="https://wa.me/6281997970352">Pilih Paket</Link>
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
