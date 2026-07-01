'use client';
import { useState } from 'react';
import { formatIDR, formatPercent, formatNumber } from '@/lib/portfolio/calculations';
import { MANUAL_CATEGORIES, CATEGORY_COLORS } from '@/lib/portfolio/priceService';
import { setManualPrice } from '@/lib/portfolio/storage';
import { Edit3, Trash2, ChevronDown, ChevronUp, DollarSign } from 'lucide-react';

function ManualPriceInput({ asset, currentPrice, onUpdate }) {
  const [val, setVal] = useState(currentPrice?.toString() || '');
  const [editing, setEditing] = useState(false);

  const save = async () => {
    const parsed = parseFloat(val.replace(/\./g, '').replace(',', '.'));
    if (!isNaN(parsed) && parsed > 0) {
      await setManualPrice(asset.ticker, parsed);
      await onUpdate();
      setEditing(false);
    }
  };

  return (
    <div className="pt-manual-price">
      {editing ? (
        <div className="pt-manual-input-row">
          <input
            className="pt-input pt-input-sm"
            value={val}
            onChange={(e) => setVal(e.target.value)}
            placeholder="Harga/NAB terbaru"
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && save()}
          />
          <button className="pt-btn-xs primary" onClick={save}>Simpan</button>
          <button className="pt-btn-xs" onClick={() => setEditing(false)}>Batal</button>
        </div>
      ) : (
        <button className="pt-manual-price-btn" onClick={() => setEditing(true)}>
          <DollarSign size={12} />
          {currentPrice ? `NAB: ${formatIDR(currentPrice)}` : 'Input harga manual'}
        </button>
      )}
    </div>
  );
}

function AssetRow({ asset, onAddTx, onViewHistory, onManualUpdate }) {
  const isManual = MANUAL_CATEGORIES.includes(asset.category);
  const color = CATEGORY_COLORS[asset.category] || '#6b7280';
  const isProfit = asset.pl >= 0;

  return (
    <div className="pt-asset-row">
      <div className="pt-asset-row-main">
        <div className="pt-asset-identity">
          <div className="pt-asset-avatar" style={{ borderColor: color }}>
            {asset.category === 'Crypto' && asset.coinGeckoId ? (
              <img
                src={`https://coin-images.coingecko.com/coins/images/${asset.coinGeckoId}/small/current.png`}
                alt={asset.ticker}
                className="pt-asset-img"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.nextSibling.style.display = 'flex';
                }}
              />
            ) : null}
            <span
              className="pt-asset-letter"
              style={{ display: asset.category === 'Crypto' && asset.coinGeckoId ? 'none' : 'flex' }}
            >
              {asset.ticker.charAt(0)}
            </span>
          </div>
          <div>
            <div className="pt-asset-ticker-lg">{asset.ticker}</div>
            <div className="pt-asset-fullname-sm">{asset.name}</div>
            <span className="pt-badge" style={{ background: color + '22', color }}>
              {asset.category}
            </span>
          </div>
        </div>

        <div className="pt-asset-stats">
          <div className="pt-stat">
            <span className="pt-stat-label">Units</span>
            <span className="pt-stat-val mono">{formatNumber(asset.position.totalUnits)}</span>
          </div>
          {!isManual && (
            <div className="pt-stat">
              <span className="pt-stat-label">Harga</span>
              <span className="pt-stat-val mono">
                {asset.currentPrice > 0 ? formatIDR(asset.currentPrice) : '—'}
                {asset.category === 'Saham US' && asset.priceUSD > 0 && (
                  <>
                    <br />
                    <small>${asset.priceUSD.toFixed(2)}</small>
                  </>
                )}
              </span>
            </div>
          )}
          <div className="pt-stat">
            <span className="pt-stat-label">Nilai</span>
            <span className="pt-stat-val mono">{formatIDR(asset.currentValue)}</span>
          </div>
          {!isManual && (
            <div className="pt-stat">
              <span className="pt-stat-label">P/L</span>
              <span className={`pt-stat-val mono ${isProfit ? 'positive' : 'negative'}`}>
                {formatIDR(asset.pl)}
                <br />
                <small>{formatPercent(asset.plPercent)}</small>
              </span>
            </div>
          )}
          {!isManual && (
            <div className="pt-stat">
              <span className="pt-stat-label">24H</span>
              <span className={`pt-stat-val mono ${asset.change24h >= 0 ? 'positive' : 'negative'}`}>
                {formatPercent(asset.change24h)}
              </span>
            </div>
          )}
        </div>

        <div className="pt-asset-actions">
          {isManual && (
            <ManualPriceInput
              asset={asset}
              currentPrice={asset.currentPrice}
              onUpdate={onManualUpdate}
            />
          )}
          <button className="pt-btn-sm" onClick={() => onAddTx(asset)}>
            + Transaksi
          </button>
          <button className="pt-btn-sm ghost" onClick={() => onViewHistory(asset)}>
            Histori
          </button>
        </div>
      </div>

      {!isManual && asset.source && (
        <div className="pt-asset-source">
          Sumber: {asset.source}
        </div>
      )}
    </div>
  );
}

export default function AssetList({ summary, onAddTransaction, onViewHistory, onManualUpdate }) {
  const { assets = [] } = summary || {};
  const [sortBy, setSortBy] = useState('value');
  const [filterCat, setFilterCat] = useState('Semua');

  const categories = ['Semua', ...new Set(assets.map((a) => a.category))];

  const sorted = [...assets]
    .filter((a) => filterCat === 'Semua' || a.category === filterCat)
    .sort((a, b) => {
      if (sortBy === 'value') return b.currentValue - a.currentValue;
      if (sortBy === 'pl') return b.plPercent - a.plPercent;
      if (sortBy === 'pl-asc') return a.plPercent - b.plPercent;
      return 0;
    });

  return (
    <div className="pt-asset-list-page">
      <div className="pt-section-header">
        <h2 className="pt-section-title">Daftar Aset</h2>
        <button className="pt-btn-primary sm" onClick={() => onAddTransaction(null)}>
          + Tambah Transaksi
        </button>
      </div>

      {/* Filters */}
      <div className="pt-filter-row">
        <div className="pt-filter-cats">
          {categories.map((cat) => (
            <button
              key={cat}
              className={`pt-filter-btn ${filterCat === cat ? 'active' : ''}`}
              onClick={() => setFilterCat(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
        <select
          className="pt-select"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
        >
          <option value="value">Sort: Nilai terbesar</option>
          <option value="pl">Sort: P/L terbaik</option>
          <option value="pl-asc">Sort: P/L terburuk</option>
        </select>
      </div>

      {sorted.length === 0 ? (
        <div className="pt-empty-state">
          <div className="pt-empty-icon">📊</div>
          <h3>Belum ada aset</h3>
          <p>Tambahkan transaksi pertamamu untuk mulai melacak portofolio</p>
          <button className="pt-btn-primary" onClick={() => onAddTransaction(null)}>
            + Tambah Transaksi Pertama
          </button>
        </div>
      ) : (
        <div className="pt-asset-grid">
          {sorted.map((asset) => (
            <AssetRow
              key={asset.ticker}
              asset={asset}
              onAddTx={onAddTransaction}
              onViewHistory={onViewHistory}
              onManualUpdate={onManualUpdate}
            />
          ))}
        </div>
      )}
    </div>
  );
}
