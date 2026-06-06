"use client";

import { useState } from "react";
import { 
  Heart, 
  Activity, 
  Info, 
  Stethoscope,
  Droplet,
  FlaskConical
} from "lucide-react";

export default function LabValues() {
  const [activeCategory, setActiveCategory] = useState("hematology");

  const categories = [
    {
      id: "hematology",
      name: "Hematologi",
      icon: <Droplet className="w-4 h-4 text-red-500" />,
      description: "Pemeriksaan sel-sel darah dan komponen terkait lainnya.",
      disclaimer: "Nilai rujukan dapat bervariasi bergantung pada reagen dan instrumen yang digunakan oleh laboratorium analitik.",
      data: [
        { parameter: "Hemoglobin (Hb) Laki-laki", range: "13.5 - 17.5", unit: "g/dL" },
        { parameter: "Hemoglobin (Hb) Perempuan", range: "12.0 - 15.5", unit: "g/dL" },
        { parameter: "Hematokrit (Ht) Laki-laki", range: "41.0 - 50.0", unit: "%" },
        { parameter: "Hematokrit (Ht) Perempuan", range: "36.0 - 48.0", unit: "%" },
        { parameter: "Eritrosit (Sel Darah Merah) Laki-laki", range: "4.5 - 5.9", unit: "juta/µL" },
        { parameter: "Eritrosit (Sel Darah Merah) Perempuan", range: "4.1 - 5.1", unit: "juta/µL" },
        { parameter: "Leukosit (Sel Darah Putih)", range: "4.5 - 11.0", unit: "ribu/µL" },
        { parameter: "Trombosit (Keping Darah)", range: "150 - 450", unit: "ribu/µL" },
        { parameter: "Laju Endap Darah (LED) Laki-laki", range: "0 - 15", unit: "mm/jam" },
        { parameter: "Laju Endap Darah (LED) Perempuan", range: "0 - 20", unit: "mm/jam" }
      ]
    },
    {
      id: "urinalysis",
      name: "Urinalisis",
      icon: <FlaskConical className="w-4 h-4 text-amber-500" />,
      description: "Pemeriksaan fisik, kimia, dan mikroskopis sampel urin.",
      disclaimer: "Urinalisis sebaiknya dilakukan dengan sampel urin segar porsi tengah (midstream urine).",
      data: [
        { parameter: "Warna Urin", range: "Kuning Muda - Kuning Tua", unit: "-" },
        { parameter: "Kejernihan", range: "Jernih", unit: "-" },
        { parameter: "Berat Jenis (BJ)", range: "1.003 - 1.030", unit: "-" },
        { parameter: "pH Urin", range: "4.6 - 8.0", unit: "-" },
        { parameter: "Protein Urin", range: "Negatif", unit: "-" },
        { parameter: "Glukosa Urin", range: "Negatif", unit: "-" },
        { parameter: "Keton", range: "Negatif", unit: "-" },
        { parameter: "Bilirubin", range: "Negatif", unit: "-" },
        { parameter: "Urobilinogen", range: "0.1 - 1.0", unit: "EU/dL" },
        { parameter: "Eritrosit (Sedimen)", range: "0 - 2", unit: "/LPB" },
        { parameter: "Leukosit (Sedimen)", range: "0 - 5", unit: "/LPB" }
      ]
    },
    {
      id: "chemistry",
      name: "Kimia & Ginjal",
      icon: <Activity className="w-4 h-4 text-emerald-500" />,
      description: "Pemeriksaan fungsi metabolisme dan kesehatan organ ginjal.",
      disclaimer: "Pemeriksaan gula darah puasa mengharuskan pasien berpuasa selama 8-10 jam sebelum pengambilan sampel.",
      data: [
        { parameter: "Glukosa Darah Puasa (GDP)", range: "70 - 100", unit: "mg/dL" },
        { parameter: "Glukosa Darah 2 Jam PP (GD2PP)", range: "< 140", unit: "mg/dL" },
        { parameter: "Glukosa Darah Sewaktu (GDS)", range: "< 200", unit: "mg/dL" },
        { parameter: "Ureum (BUN)", range: "15 - 45", unit: "mg/dL" },
        { parameter: "Kreatinin Laki-laki", range: "0.6 - 1.2", unit: "mg/dL" },
        { parameter: "Kreatinin Perempuan", range: "0.5 - 1.1", unit: "mg/dL" },
        { parameter: "Asam Urat Laki-laki", range: "3.4 - 7.0", unit: "mg/dL" },
        { parameter: "Asam Urat Perempuan", range: "2.4 - 6.0", unit: "mg/dL" }
      ]
    },
    {
      id: "lipid",
      name: "Profil Lipid",
      icon: <Heart className="w-4 h-4 text-rose-500" />,
      description: "Pemeriksaan kadar kolesterol dan lemak dalam sirkulasi darah.",
      disclaimer: "Profil lipid lengkap disarankan dilakukan setelah puasa selama 10-12 jam untuk akurasi kadar trigliserida.",
      data: [
        { parameter: "Kolesterol Total", range: "< 200", unit: "mg/dL" },
        { parameter: "Kolesterol HDL Laki-laki", range: "> 40", unit: "mg/dL" },
        { parameter: "Kolesterol HDL Perempuan", range: "> 50", unit: "mg/dL" },
        { parameter: "Kolesterol LDL (Optimal)", range: "< 100", unit: "mg/dL" },
        { parameter: "Trigliserida", range: "< 150", unit: "mg/dL" }
      ]
    }
  ];

  const currentCategory = categories.find((cat) => cat.id === activeCategory);

  return (
    <section id="medical" className="py-16 md:py-20 px-4 bg-gray-50 border-t border-gray-100">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 border border-red-100 text-red-600 text-xs md:text-sm font-medium mb-4">
            <Stethoscope className="w-3.5 h-3.5 md:w-4 md:h-4" />
            <span>Fitur Khusus Mahasiswa Kedokteran</span>
          </div>
          <h2 className="text-2xl md:text-4xl font-bold text-gray-900 mb-3">
            Lab Value Reference Tables
          </h2>
          <p className="text-sm md:text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Kumpulan tabel rujukan nilai normal laboratorium klinik untuk menunjang pembelajaran kedokteran dan diagnosis medis dasar.
          </p>
        </div>

        {/* Category Navigation */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mb-6 md:bg-white md:p-2 md:rounded-2xl md:border md:border-gray-200/80 md:shadow-sm">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-2 py-2.5 sm:py-3 px-2 sm:px-4 rounded-xl text-[11px] sm:text-xs md:text-sm font-medium border transition-all ${
                activeCategory === cat.id
                  ? "bg-gray-950 border-gray-950 text-white shadow-sm font-bold"
                  : "text-gray-600 hover:text-gray-900 bg-white border-gray-200 hover:bg-gray-50 md:bg-transparent md:border-transparent md:hover:bg-gray-50"
              }`}
            >
              <span className="flex-shrink-0">{cat.icon}</span>
              <span className="text-center">{cat.name}</span>
            </button>
          ))}
        </div>

        {/* Content Box */}
        <div className="bg-white rounded-2xl md:rounded-3xl p-5 md:p-8 shadow-sm border border-gray-100">
          <div className="mb-6">
            <h3 className="font-bold text-gray-900 text-lg md:text-xl mb-1">
              Tabel Rujukan {currentCategory.name}
            </h3>
            <p className="text-xs md:text-sm text-gray-400 leading-relaxed">
              {currentCategory.description}
            </p>
          </div>

          {/* Mobile View: Stacked Card List */}
          <div className="block md:hidden space-y-3 mb-6">
            {currentCategory.data.map((item, index) => (
              <div 
                key={index} 
                className="bg-gray-50/60 p-4 rounded-xl border border-gray-100/70 flex flex-col justify-between gap-2"
              >
                <div className="text-xs text-gray-400 font-medium">Parameter</div>
                <div className="font-semibold text-gray-900 text-sm leading-tight">
                  {item.parameter}
                </div>
                
                <div className="flex items-center justify-between mt-1 pt-2 border-t border-gray-100">
                  <div className="text-xs text-gray-400">Nilai Normal</div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-bold text-gray-900 text-sm">
                      {item.range}
                    </span>
                    {item.unit !== "-" && (
                      <span className="text-xs text-gray-400 font-normal">
                        {item.unit}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop View: Styled Table */}
          <div className="hidden md:block overflow-hidden border border-gray-100 rounded-2xl mb-6">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-700 font-semibold">
                  <th className="px-6 py-4 text-left">Parameter</th>
                  <th className="px-6 py-4 text-center">Nilai Rujukan Normal</th>
                  <th className="px-6 py-4 text-left">Satuan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-600">
                {currentCategory.data.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">{item.parameter}</td>
                    <td className="px-6 py-4 text-center font-semibold text-gray-800">{item.range}</td>
                    <td className="px-6 py-4 text-gray-450">{item.unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Info Banner */}
          <div className="bg-amber-50/70 border border-amber-100 rounded-xl md:rounded-2xl p-4 flex items-start text-xs text-amber-800 leading-relaxed">
            <Info className="w-4 h-4 mr-3 flex-shrink-0 text-amber-600 mt-0.5" />
            <div>
              <span className="font-semibold block mb-0.5">Catatan Klinis:</span>
              <span>{currentCategory.disclaimer}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
