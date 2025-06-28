import { Check, MessageCircle, ExternalLink, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Pricing() {
  const pricingPlans = [
    {
      name: "Landing Page",
      price: "Mulai Rp500.000",
      description:
        "Solusi sempurna untuk bisnis yang ingin tampil online dengan cepat dan profesional",
      features: [
        "1 halaman landing page",
        "Desain responsive (mobile & desktop)",
        "SEO dasar (meta tags, sitemap)",
        "1 bulan maintenance gratis",
        "Free update desain minor",
        "Optimasi kecepatan loading",
        "Integrasi Google Analytics",
        "Form kontak sederhana",
      ],
      popular: false,
      buttonText: "Pilih Paket",
    },
    {
      name: "Company Profile",
      price: "Rp1.500.000 - Rp3.000.000",
      description:
        "Website lengkap untuk membangun kredibilitas dan kepercayaan perusahaan Anda",
      features: [
        "Hingga 5 halaman website",
        "SEO optimization lengkap",
        "Integrasi WhatsApp Business",
        "CMS opsional (mudah edit konten)",
        "Galeri foto/produk",
        "Halaman kontak dengan maps",
        "SSL certificate",
        "3 bulan maintenance gratis",
        "Training penggunaan website",
      ],
      popular: true,
      buttonText: "Pilih Paket",
    },
    {
      name: "Custom Website",
      price: "Harga Fleksibel",
      description:
        "Solusi khusus untuk kebutuhan unik bisnis Anda dengan fitur dan desain yang disesuaikan",
      features: [
        "Layout dan desain custom",
        "Fitur khusus sesuai kebutuhan",
        "Integrasi sistem eksternal",
        "Database dan backend custom",
        "Panel admin khusus",
        "API development",
        "Maintenance jangka panjang",
        "Support teknis prioritas",
        "Konsultasi strategi digital",
      ],
      popular: false,
      buttonText: "Konsultasi",
    },
  ];

  const faqs = [
    {
      question: "Berapa lama waktu pengerjaan website?",
      answer:
        "Landing page: 3-5 hari kerja. Company profile: 1-2 minggu. Custom website: 2-4 minggu tergantung kompleksitas.",
    },
    {
      question: "Bagaimana sistem pembayaran?",
      answer:
        "DP 50% di awal, pelunasan 50% setelah website selesai dan approved. Pembayaran via transfer bank atau e-wallet.",
    },
    {
      question: "Apakah bisa request perubahan desain?",
      answer:
        "Ya, tersedia 2-3 kali revisi gratis untuk setiap paket. Revisi tambahan dikenakan biaya sesuai kompleksitas.",
    },
    {
      question: "Apakah domain dan hosting sudah termasuk?",
      answer:
        "Domain dan hosting tidak termasuk dalam paket, namun kami akan membantu setup dan konfigurasi sesuai kebutuhan.",
    },
  ];

  return (
    <section className="py-20 px-4 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Paket & Harga
          </h1>
          <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            Pilih paket yang sesuai dengan kebutuhan bisnis Anda. Semua paket
            sudah termasuk desain modern, responsive, dan optimasi SEO untuk
            memastikan website Anda tampil maksimal.
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

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-20">
          {pricingPlans.map((plan, index) => (
            <div
              key={index}
              className={`relative bg-white rounded-2xl p-8 shadow-sm hover:shadow-lg transition-shadow ${
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

              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  {plan.name}
                </h3>
                <div className="text-3xl font-bold text-gray-900 mb-4">
                  {plan.price}
                </div>
                <p className="text-gray-600 text-sm leading-relaxed">
                  {plan.description}
                </p>
              </div>

              <ul className="space-y-4 mb-8">
                {plan.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700 text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                asChild
                className={`w-full ${
                  plan.popular
                    ? "bg-blue-600 hover:bg-blue-700"
                    : "bg-gray-900 hover:bg-gray-800"
                }`}
              >
                <Link href="https://wa.me/6281234567890">
                  {plan.buttonText}
                </Link>
              </Button>
            </div>
          ))}
        </div>

        {/* Additional Info */}
        <div className="bg-white rounded-2xl p-8 md:p-12 shadow-sm mb-20">
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
              Mengapa Memilih Layanan Saya?
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Kualitas Terjamin
              </h3>
              <p className="text-gray-600">
                Website modern dengan standar industri dan best practices
                terkini
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Support Responsif
              </h3>
              <p className="text-gray-600">
                Komunikasi lancar via WhatsApp dan support maintenance berkala
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <ExternalLink className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Hasil Optimal
              </h3>
              <p className="text-gray-600">
                Website yang cepat, SEO-friendly, dan conversion-oriented
              </p>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="bg-white rounded-2xl p-8 md:p-12 shadow-sm">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
              FAQ
            </h2>
            <p className="text-gray-600">
              Temukan jawaban untuk pertanyaan umum seputar layanan web
              development
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {faqs.map((faq, index) => (
              <div key={index} className="bg-gray-50 rounded-xl p-6">
                <div className="flex items-start gap-4">
                  <HelpCircle className="w-6 h-6 text-blue-500 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">
                      {faq.question}
                    </h3>
                    <p className="text-gray-600 leading-relaxed">
                      {faq.answer}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <p className="text-gray-600 mb-6">
              Masih ada pertanyaan lain? Jangan ragu untuk menghubungi saya!
            </p>
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
                Chat via WhatsApp
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
