'use client';
import { useState, useEffect } from 'react';
import { X, Calendar, DollarSign, Hash, Tag, FileText, TrendingUp } from 'lucide-react';
import { CATEGORIES, MANUAL_CATEGORIES } from '@/lib/portfolio/priceService';

const EMPTY_FORM = {
  type: "buy",
  assetName: "",
  ticker: "",
  coinGeckoId: "",
  category: "Saham IDX",
  date: new Date().toISOString().split("T")[0],
  units: "",
  buyPrice: "",
  brokerFee: "0",
  hargaAset: "",
};

export default function TransactionForm({ initialAsset, editTx, onSave, onClose }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (editTx) {
      setForm({ ...EMPTY_FORM, ...editTx });
    } else if (initialAsset) {
      setForm((f) => ({
        ...EMPTY_FORM,
        assetName: initialAsset.name || '',
        ticker: initialAsset.ticker || '',
        coinGeckoId: initialAsset.coinGeckoId || '',
        category: initialAsset.category || 'Saham IDX',
      }));
    }
  }, [editTx, initialAsset]);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const isReksaDana = form.category === "Reksa Dana";
  const isCrypto = form.category === "Crypto";
  const isManual = MANUAL_CATEGORIES.includes(form.category);

  const validate = () => {
    const errs = {};
    if (!form.assetName.trim()) errs.assetName = 'Nama aset wajib diisi';
    if (!form.ticker.trim()) errs.ticker = 'Kode/ticker wajib diisi';
    if (isReksaDana) {
      if (!form.hargaAset || parseFloat(form.hargaAset) <= 0)
        errs.hargaAset = "Harga aset harus > 0";
    } else {
      if (!form.units || parseFloat(form.units) <= 0)
        errs.units = "Jumlah unit harus > 0";
      if (!form.buyPrice || parseFloat(form.buyPrice) <= 0)
        errs.buyPrice = "Harga harus > 0";
    }
    if (!form.date) errs.date = 'Tanggal wajib diisi';
    if (form.category === 'Crypto' && !form.coinGeckoId.trim()) {
      errs.coinGeckoId = 'CoinGecko ID wajib untuk Crypto (contoh: bitcoin, ethereum)';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    onSave({
      ...form,
      ticker: form.ticker.trim().toUpperCase(),
      id: editTx?.id,
    });
    onClose();
  };

  return (
    <div
      className="pt-modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="pt-modal">
        <div className="pt-modal-header">
          <h2 className="pt-modal-title">
            {editTx ? "Edit Transaksi" : "Tambah Transaksi"}
          </h2>
          <button className="pt-modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="pt-modal-body">
          {/* Type toggle */}
          <div className="pt-type-toggle">
            <button
              className={`pt-type-btn ${form.type === "buy" ? "active buy" : ""}`}
              onClick={() => set("type", "buy")}
            >
              <TrendingUp size={14} /> Beli
            </button>
            <button
              className={`pt-type-btn ${form.type === "sell" ? "active sell" : ""}`}
              onClick={() => set("type", "sell")}
            >
              <TrendingUp size={14} style={{ transform: "rotate(180deg)" }} />{" "}
              Jual
            </button>
          </div>

          <div className="pt-form-grid">
            {/* Kategori */}
            <div className="pt-input-group full">
              <label className="pt-label">
                <Tag size={13} /> Kategori
              </label>
              <select
                className="pt-select"
                value={form.category}
                onChange={(e) => set("category", e.target.value)}
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Nama Aset */}
            <div className="pt-input-group">
              <label className="pt-label">
                <FileText size={13} /> Nama Aset
              </label>
              <input
                className={`pt-input ${errors.assetName ? "error" : ""}`}
                placeholder="contoh: Bank Central Asia"
                value={form.assetName}
                onChange={(e) => set("assetName", e.target.value)}
              />
              {errors.assetName && (
                <span className="pt-error">{errors.assetName}</span>
              )}
            </div>

            {/* Ticker */}
            <div className="pt-input-group">
              <label className="pt-label">
                <Hash size={13} /> Kode / Ticker
              </label>
              <input
                className={`pt-input mono ${errors.ticker ? "error" : ""}`}
                placeholder={
                  form.category === "Saham IDX"
                    ? "contoh: BBCA.JK"
                    : form.category === "Saham US"
                      ? "contoh: AAPL"
                      : form.category === "Crypto"
                        ? "contoh: BTC"
                        : "contoh: MANULIFE01"
                }
                value={form.ticker}
                onChange={(e) => set("ticker", e.target.value.toUpperCase())}
              />
              {errors.ticker && (
                <span className="pt-error">{errors.ticker}</span>
              )}
            </div>

            {/* CoinGecko ID (Crypto only) */}
            {isCrypto && (
              <div className="pt-input-group full">
                <label className="pt-label">CoinGecko ID</label>
                <input
                  className={`pt-input mono ${errors.coinGeckoId ? "error" : ""}`}
                  placeholder="contoh: bitcoin, ethereum, binancecoin"
                  value={form.coinGeckoId}
                  onChange={(e) =>
                    set("coinGeckoId", e.target.value.toLowerCase())
                  }
                />
                {errors.coinGeckoId && (
                  <span className="pt-error">{errors.coinGeckoId}</span>
                )}
                <span className="pt-hint">
                  Cari ID di{" "}
                  <a
                    href="https://www.coingecko.com"
                    target="_blank"
                    rel="noreferrer"
                  >
                    coingecko.com
                  </a>
                </span>
              </div>
            )}

            {/* Tanggal */}
            <div className="pt-input-group">
              <label className="pt-label">
                <Calendar size={13} /> Tanggal
              </label>
              <input
                type="date"
                className={`pt-input ${errors.date ? "error" : ""}`}
                value={form.date}
                onChange={(e) => set("date", e.target.value)}
              />
              {errors.date && <span className="pt-error">{errors.date}</span>}
            </div>

            {/* Units / Lot — hidden for Reksa Dana */}
            {!isReksaDana && (
              <div className="pt-input-group">
                <label className="pt-label">
                  <Hash size={13} /> Jumlah Unit / Lot
                </label>
                <input
                  type="number"
                  className={`pt-input mono ${errors.units ? "error" : ""}`}
                  placeholder="0"
                  min="0"
                  value={form.units}
                  onChange={(e) => set("units", e.target.value)}
                />
                {errors.units && (
                  <span className="pt-error">{errors.units}</span>
                )}
              </div>
            )}

            {/* Harga Aset — Reksa Dana only */}
            {isReksaDana && (
              <div className="pt-input-group">
                <label className="pt-label">
                  <DollarSign size={13} /> Harga Aset
                </label>
                <input
                  type="number"
                  className={`pt-input mono ${errors.hargaAset ? "error" : ""}`}
                  placeholder="0"
                  min="0"
                  value={form.hargaAset}
                  onChange={(e) => set("hargaAset", e.target.value)}
                />
                {errors.hargaAset && (
                  <span className="pt-error">{errors.hargaAset}</span>
                )}
              </div>
            )}

            {/* Harga Beli — hidden for Reksa Dana */}
            {!isReksaDana && (
              <div className="pt-input-group">
                <label className="pt-label">
                  <DollarSign size={13} />
                  {form.type === "sell"
                    ? "Harga Jual (per unit)"
                    : "Harga Beli (per unit)"}
                </label>
                <input
                  type="number"
                  className={`pt-input mono ${errors.buyPrice ? "error" : ""}`}
                  placeholder="0"
                  min="0"
                  value={form.buyPrice}
                  onChange={(e) => set("buyPrice", e.target.value)}
                />
                {errors.buyPrice && (
                  <span className="pt-error">{errors.buyPrice}</span>
                )}
                {form.category === "Saham US" && (
                  <span className="pt-hint">
                    Masukkan harga beli dalam IDR per unit. Harga pasar US akan
                    dikonversi otomatis ke IDR.
                  </span>
                )}
              </div>
            )}

            {/* Biaya Broker — hidden for Reksa Dana */}
            {!isReksaDana && (
              <div className="pt-input-group">
                <label className="pt-label">
                  <DollarSign size={13} /> Biaya Broker / Fee
                </label>
                <input
                  type="number"
                  className="pt-input mono"
                  placeholder="0"
                  min="0"
                  value={form.brokerFee}
                  onChange={(e) => set("brokerFee", e.target.value)}
                />
              </div>
            )}

            {/* Notes */}
            <div className="pt-input-group full">
              <label className="pt-label">Catatan (opsional)</label>
              <textarea
                className="pt-input pt-textarea"
                placeholder="Catatan tambahan..."
                value={form.notes || ""}
                onChange={(e) => set("notes", e.target.value)}
                rows={2}
              />
            </div>
          </div>

          {/* Total estimate — hidden for Reksa Dana */}
          {!isReksaDana && form.units && form.buyPrice && (
            <div className="pt-total-estimate">
              <span>Estimasi Total:</span>
              <span className="mono">
                {new Intl.NumberFormat("id-ID", {
                  style: "currency",
                  currency: "IDR",
                  minimumFractionDigits: 0,
                }).format(
                  parseFloat(form.units || 0) * parseFloat(form.buyPrice || 0) +
                    parseFloat(form.brokerFee || 0),
                )}
              </span>
            </div>
          )}
        </div>

        <div className="pt-modal-footer">
          <button className="pt-btn-ghost" onClick={onClose}>
            Batal
          </button>
          <button className="pt-btn-primary" onClick={handleSubmit}>
            {editTx ? "Simpan Perubahan" : "Simpan Transaksi"}
          </button>
        </div>
      </div>
    </div>
  );
}
