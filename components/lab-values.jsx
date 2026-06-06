"use client";

import { useState, useEffect } from "react";
import { 
  Heart, 
  Activity, 
  Info, 
  Stethoscope,
  Droplet,
  FlaskConical,
  Search,
  X,
  Plus,
  Trash2,
  RotateCcw,
  Settings,
  Check
} from "lucide-react";

const defaultParameters = [
  // Hematologi
  { category: "Hematologi", parameter: "Hemoglobin (Hb)", range: "♂ 13.5 - 17.5 | ♀ 12.0 - 15.5", unit: "g/dL", catId: "hematology" },
  { category: "Hematologi", parameter: "Hematokrit (Ht)", range: "♂ 41.0 - 50.0 | ♀ 36.0 - 48.0", unit: "%", catId: "hematology" },
  { category: "Hematologi", parameter: "Eritrosit (Sel Darah Merah)", range: "♂ 4.5 - 5.9 | ♀ 4.1 - 5.1", unit: "juta/µL", catId: "hematology" },
  { category: "Hematologi", parameter: "Leukosit (Sel Darah Putih)", range: "4.5 - 11.0", unit: "ribu/µL", catId: "hematology" },
  { category: "Hematologi", parameter: "Trombosit (Keping Darah)", range: "150 - 450", unit: "ribu/µL", catId: "hematology" },
  { category: "Hematologi", parameter: "Laju Endap Darah (LED)", range: "♂ 0 - 15 | ♀ 0 - 20", unit: "mm/jam", catId: "hematology" },
  
  // Urinalisis
  { category: "Urinalisis", parameter: "Warna Urin", range: "Kuning Muda - Kuning Tua", unit: "-", catId: "urinalysis" },
  { category: "Urinalisis", parameter: "Kejernihan", range: "Jernih", unit: "-", catId: "urinalysis" },
  { category: "Urinalisis", parameter: "Berat Jenis (BJ)", range: "1.003 - 1.030", unit: "-", catId: "urinalysis" },
  { category: "Urinalisis", parameter: "pH Urin", range: "4.6 - 8.0", unit: "-", catId: "urinalysis" },
  { category: "Urinalisis", parameter: "Protein Urin", range: "Negatif", unit: "-", catId: "urinalysis" },
  { category: "Urinalisis", parameter: "Glukosa Urin", range: "Negatif", unit: "-", catId: "urinalysis" },
  { category: "Urinalisis", parameter: "Keton", range: "Negatif", unit: "-", catId: "urinalysis" },
  { category: "Urinalisis", parameter: "Bilirubin", range: "Negatif", unit: "-", catId: "urinalysis" },
  { category: "Urinalisis", parameter: "Urobilinogen", range: "0.1 - 1.0", unit: "EU/dL", catId: "urinalysis" },
  { category: "Urinalisis", parameter: "Eritrosit (Sedimen)", range: "0 - 2", unit: "/LPB", catId: "urinalysis" },
  { category: "Urinalisis", parameter: "Leukosit (Sedimen)", range: "0 - 5", unit: "/LPB", catId: "urinalysis" },

  // Kimia & Ginjal
  { category: "Kimia & Ginjal", parameter: "Glukosa Darah Puasa (GDP)", range: "70 - 100", unit: "mg/dL", catId: "chemistry" },
  { category: "Kimia & Ginjal", parameter: "Glukosa Darah 2 Jam PP (GD2PP)", range: "< 140", unit: "mg/dL", catId: "chemistry" },
  { category: "Kimia & Ginjal", parameter: "Glukosa Darah Sewaktu (GDS)", range: "< 200", unit: "mg/dL", catId: "chemistry" },
  { category: "Kimia & Ginjal", parameter: "Ureum (BUN)", range: "15 - 45", unit: "mg/dL", catId: "chemistry" },
  { category: "Kimia & Ginjal", parameter: "Kreatinin", range: "♂ 0.6 - 1.2 | ♀ 0.5 - 1.1", unit: "mg/dL", catId: "chemistry" },
  { category: "Kimia & Ginjal", parameter: "Asam Urat", range: "♂ 3.4 - 7.0 | ♀ 2.4 - 6.0", unit: "mg/dL", catId: "chemistry" },

  // Profil Lipid
  { category: "Profil Lipid", parameter: "Kolesterol Total", range: "< 200", unit: "mg/dL", catId: "lipid" },
  { category: "Profil Lipid", parameter: "Kolesterol HDL", range: "♂ > 40 | ♀ > 50", unit: "mg/dL", catId: "lipid" },
  { category: "Profil Lipid", parameter: "Kolesterol LDL (Optimal)", range: "< 100", unit: "mg/dL", catId: "lipid" },
  { category: "Profil Lipid", parameter: "Trigliserida", range: "< 150", unit: "mg/dL", catId: "lipid" }
];

export default function LabValues() {
  const [activeCategory, setActiveCategory] = useState("hematology");
  const [searchQuery, setSearchQuery] = useState("");
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  
  // Custom Parameters State with Hydration Safety
  const [parameters, setParameters] = useState([]);
  const [isMounted, setIsMounted] = useState(false);

  // Form input states
  const [newCategory, setNewCategory] = useState("hematology");
  const [newParameter, setNewParameter] = useState("");
  const [newRange, setNewRange] = useState("");
  const [newUnit, setNewUnit] = useState("");
  const [formError, setFormError] = useState("");

  const categories = [
    {
      id: "hematology",
      name: "Hematologi",
      icon: <Droplet className="w-4 h-4 text-red-500" />,
      description: "Pemeriksaan sel-sel darah dan komponen terkait lainnya.",
      disclaimer: "Nilai rujukan dapat bervariasi bergantung pada reagen dan instrumen yang digunakan oleh laboratorium analitik.",
      badgeColor: "bg-red-50 text-red-700 border-red-100"
    },
    {
      id: "urinalysis",
      name: "Urinalisis",
      icon: <FlaskConical className="w-4 h-4 text-amber-500" />,
      description: "Pemeriksaan fisik, kimia, dan mikroskopis sampel urin.",
      disclaimer: "Urinalisis sebaiknya dilakukan dengan sampel urin segar porsi tengah (midstream urin).",
      badgeColor: "bg-amber-50 text-amber-700 border-amber-100"
    },
    {
      id: "chemistry",
      name: "Kimia & Ginjal",
      icon: <Activity className="w-4 h-4 text-emerald-500" />,
      description: "Pemeriksaan fungsi metabolisme dan kesehatan organ ginjal.",
      disclaimer: "Pemeriksaan gula darah puasa mengharuskan pasien berpuasa selama 8-10 jam sebelum pengambilan sampel.",
      badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-100"
    },
    {
      id: "lipid",
      name: "Profil Lipid",
      icon: <Heart className="w-4 h-4 text-rose-500" />,
      description: "Pemeriksaan kadar kolesterol dan lemak dalam sirkulasi darah.",
      disclaimer: "Profil lipid lengkap disarankan dilakukan setelah puasa selama 10-12 jam untuk akurasi kadar trigliserida.",
      badgeColor: "bg-rose-50 text-rose-700 border-rose-100"
    }
  ];

  // Initialize client parameters on mount to avoid SSR hydration bugs
  useEffect(() => {
    setIsMounted(true);
    const saved = localStorage.getItem("medical_lab_values");
    if (saved) {
      try {
        setParameters(JSON.parse(saved));
      } catch (e) {
        setParameters(defaultParameters);
      }
    } else {
      setParameters(defaultParameters);
    }
  }, []);

  const saveParameters = (updatedParams) => {
    setParameters(updatedParams);
    localStorage.setItem("medical_lab_values", JSON.stringify(updatedParams));
  };

  const handleAddParameter = (e) => {
    e.preventDefault();
    if (!newParameter.trim() || !newRange.trim() || !newUnit.trim()) {
      setFormError("Semua field harus diisi!");
      return;
    }

    const catObj = categories.find((c) => c.id === newCategory);
    const newItem = {
      category: catObj.name,
      parameter: newParameter,
      range: newRange,
      unit: newUnit,
      catId: newCategory
    };

    const updated = [...parameters, newItem];
    saveParameters(updated);
    
    // Reset inputs
    setNewParameter("");
    setNewRange("");
    setNewUnit("");
    setFormError("");
  };

  const handleDeleteParameter = (indexToDelete) => {
    const updated = parameters.filter((_, index) => index !== indexToDelete);
    saveParameters(updated);
  };

  const handleResetToDefault = () => {
    if (confirm("Apakah Anda yakin ingin mengembalikan semua data rujukan ke setelan awal?")) {
      saveParameters(defaultParameters);
    }
  };

  // Filter items based on activeCategory or searchQuery
  const isSearching = searchQuery.trim() !== "";
  
  const displayParameters = isMounted ? parameters : defaultParameters;

  const filteredParameters = displayParameters.map((item, originalIndex) => ({
    ...item,
    originalIndex
  })).filter((item) => {
    if (isSearching) {
      const query = searchQuery.toLowerCase();
      return (
        item.parameter.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query)
      );
    }
    return item.catId === activeCategory;
  });

  const currentCategory = categories.find((cat) => cat.id === activeCategory);

  const renderRange = (range) => {
    if (range.includes("♂") || range.includes("♀")) {
      const parts = range.split(" | ");
      return (
        <span className="inline-flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
          {parts.map((part, i) => {
            const isMale = part.startsWith("♂");
            const isFemale = part.startsWith("♀");
            const val = part.replace(/[♂♀]\s*/, "");
            return (
              <span key={i} className="inline-flex items-center gap-1">
                <span className={`font-bold ${isMale ? "text-blue-500" : isFemale ? "text-pink-500" : ""}`}>
                  {isMale ? "♂" : isFemale ? "♀" : ""}
                </span>
                <span className="text-gray-850 font-semibold">{val}</span>
                {i < parts.length - 1 && <span className="text-gray-300 ml-1 hidden sm:inline">|</span>}
              </span>
            );
          })}
        </span>
      );
    }
    return <span>{range}</span>;
  };

  return (
    <section id="medical" className="py-16 md:py-20 px-4 bg-gray-50 border-t border-gray-100">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
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

        {/* Search Bar & Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3 mb-8 max-w-2xl mx-auto">
          <div className="relative w-full">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Cari rujukan lab (cth: Hb, Kreatinin, Kolesterol)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-10 pr-10 py-3 border border-gray-200 rounded-2xl bg-white text-sm placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-950 focus:border-gray-950 shadow-sm transition-all"
            />
            {isSearching && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-700"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex gap-2 w-full sm:w-auto sm:flex-shrink-0">
            <button
              onClick={() => setIsAdminOpen(!isAdminOpen)}
              className={`flex items-center justify-center gap-2 py-3 px-5 rounded-2xl text-sm font-semibold border whitespace-nowrap transition-all w-full sm:w-auto ${
                isAdminOpen 
                  ? "bg-gray-950 text-white border-gray-950 shadow-sm"
                  : "bg-white text-gray-750 border-gray-200 hover:bg-gray-50 shadow-sm"
              }`}
            >
              <Settings className="w-4 h-4" />
              Kelola Data
            </button>
          </div>
        </div>

        {/* Manage Data Panel (Admin Form) */}
        {isAdminOpen && (
          <div className="bg-white rounded-3xl p-6 shadow-md border border-gray-150 mb-8 max-w-2xl mx-auto transition-all animate-in fade-in slide-in-from-top-4 duration-350">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-6">
              <div>
                <h3 className="font-bold text-gray-900 text-lg">Kelola Rujukan Laboratorium</h3>
                <p className="text-xs text-gray-400">Tambahkan rujukan baru atau kembalikan ke setelan default</p>
              </div>
              <button
                onClick={handleResetToDefault}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-red-200 text-red-600 bg-red-50/50 hover:bg-red-50 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset Default
              </button>
            </div>

            <form onSubmit={handleAddParameter} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">Kategori</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="block w-full rounded-xl border border-gray-200 p-2.5 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-gray-950 focus:border-gray-950"
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">Satuan</label>
                  <input
                    type="text"
                    placeholder="Contoh: g/dL, %, atau -"
                    value={newUnit}
                    onChange={(e) => setNewUnit(e.target.value)}
                    className="block w-full rounded-xl border border-gray-200 p-2.5 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-gray-950 focus:border-gray-950"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">Nama Parameter</label>
                <input
                  type="text"
                  placeholder="Contoh: Hemoglobin (Hb)"
                  value={newParameter}
                  onChange={(e) => setNewParameter(e.target.value)}
                  className="block w-full rounded-xl border border-gray-200 p-2.5 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-gray-950 focus:border-gray-950"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-gray-700">Nilai Rujukan Normal</label>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setNewRange(newRange + "♂ ")}
                      className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100 hover:bg-blue-100"
                    >
                      + ♂ Laki-laki
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewRange(newRange + "♀ ")}
                      className="px-2 py-0.5 rounded text-[10px] font-bold bg-pink-50 text-pink-700 border border-pink-100 hover:bg-pink-100"
                    >
                      + ♀ Perempuan
                    </button>
                  </div>
                </div>
                <input
                  type="text"
                  placeholder="Contoh: ♂ 13.5 - 17.5 | ♀ 12.0 - 15.5"
                  value={newRange}
                  onChange={(e) => setNewRange(e.target.value)}
                  className="block w-full rounded-xl border border-gray-200 p-2.5 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-gray-950 focus:border-gray-950"
                />
                <span className="text-[10px] text-gray-400 mt-1 block">Tips: Gunakan tombol pintasan di atas untuk memasukkan logo gender. Pisahkan Laki-laki dan Perempuan dengan tanda ` | `.</span>
              </div>

              {formError && <p className="text-xs text-red-600 font-semibold">{formError}</p>}

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-bold bg-gray-950 text-white hover:bg-gray-850 shadow transition-all mt-2"
              >
                <Plus className="w-4 h-4" />
                Tambah Rujukan Lab
              </button>
            </form>
          </div>
        )}

        {/* Category Navigation (Hidden when searching) */}
        {!isSearching && (
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
        )}

        {/* Content Box */}
        <div className="bg-white rounded-2xl md:rounded-3xl p-5 md:p-8 shadow-sm border border-gray-100">
          <div className="mb-6">
            <h3 className="font-bold text-gray-900 text-lg md:text-xl mb-1">
              {isSearching ? `Hasil Pencarian untuk "${searchQuery}"` : `Tabel Rujukan ${currentCategory.name}`}
            </h3>
            <p className="text-xs md:text-sm text-gray-400 leading-relaxed">
              {isSearching 
                ? `Ditemukan ${filteredParameters.length} rujukan lab yang cocok.` 
                : currentCategory.description}
            </p>
          </div>

          {filteredParameters.length > 0 ? (
            <>
              {/* Mobile View: Stacked Card List */}
              <div className="block md:hidden space-y-3 mb-6">
                {filteredParameters.map((item, index) => {
                  const catInfo = categories.find((c) => c.id === item.catId);
                  return (
                    <div 
                      key={index} 
                      className="bg-gray-50/60 p-4 rounded-xl border border-gray-100/70 flex flex-col justify-between gap-2 relative"
                    >
                      {isAdminOpen && (
                        <button
                          onClick={() => handleDeleteParameter(item.originalIndex)}
                          className="absolute top-3 right-3 p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                          title="Hapus Rujukan"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}

                      <div className="flex items-center justify-between pr-8">
                        <span className="text-xs text-gray-400 font-medium">Parameter</span>
                        {isSearching && (
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${catInfo?.badgeColor}`}>
                            {item.category}
                          </span>
                        )}
                      </div>
                      <div className="font-semibold text-gray-900 text-sm leading-tight pr-8">
                        {item.parameter}
                      </div>
                      
                      <div className="flex items-center justify-between mt-1 pt-2 border-t border-gray-100">
                        <div className="text-xs text-gray-400">Nilai Normal</div>
                        <div className="flex items-baseline gap-1.5">
                          <span className="font-bold text-gray-900 text-sm">
                            {renderRange(item.range)}
                          </span>
                          {item.unit !== "-" && (
                            <span className="text-xs text-gray-400 font-normal">
                              {item.unit}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop View: Styled Table */}
              <div className="hidden md:block overflow-hidden border border-gray-100 rounded-2xl mb-6">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-gray-700 font-semibold">
                      <th className="px-6 py-4 text-left">Parameter</th>
                      {isSearching && <th className="px-6 py-4 text-left">Kategori</th>}
                      <th className="px-6 py-4 text-center">Nilai Rujukan Normal</th>
                      <th className="px-6 py-4 text-left">Satuan</th>
                      {isAdminOpen && <th className="px-6 py-4 text-center">Aksi</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-gray-600">
                    {filteredParameters.map((item, index) => {
                      const catInfo = categories.find((c) => c.id === item.catId);
                      return (
                        <tr key={index} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-4 font-medium text-gray-900">{item.parameter}</td>
                          {isSearching && (
                            <td className="px-6 py-4">
                              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${catInfo?.badgeColor}`}>
                                {item.category}
                              </span>
                            </td>
                          )}
                          <td className="px-6 py-4 text-center font-semibold text-gray-800">
                            {renderRange(item.range)}
                          </td>
                          <td className="px-6 py-4 text-gray-400">{item.unit}</td>
                          {isAdminOpen && (
                            <td className="px-6 py-4 text-center">
                              <button
                                onClick={() => handleDeleteParameter(item.originalIndex)}
                                className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors inline-flex"
                                title="Hapus Rujukan"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="text-center py-12 px-4 bg-gray-50 rounded-2xl border border-dashed border-gray-200 mb-6">
              <Info className="w-8 h-8 text-gray-400 mx-auto mb-3" />
              <p className="text-sm text-gray-550 font-medium">Tidak ada rujukan lab yang cocok dengan pencarian Anda.</p>
              <button 
                onClick={() => setSearchQuery("")}
                className="mt-3 text-xs text-blue-600 underline font-semibold focus:outline-none"
              >
                Reset Pencarian
              </button>
            </div>
          )}

          {/* Info Banner (Only when not searching or matches exist) */}
          {!isSearching && (
            <div className="bg-amber-50/70 border border-amber-100 rounded-xl md:rounded-2xl p-4 flex items-start text-xs text-amber-800 leading-relaxed">
              <Info className="w-4 h-4 mr-3 flex-shrink-0 text-amber-600 mt-0.5" />
              <div>
                <span className="font-semibold block mb-0.5">Catatan Klinis:</span>
                <span>{currentCategory.disclaimer}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
