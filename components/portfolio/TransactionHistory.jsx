'use client';
import { useState } from 'react';
import { Trash2, Edit3, ChevronDown, ChevronUp, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { formatIDR, formatNumber } from '@/lib/portfolio/calculations';

function ConfirmDelete({ onConfirm, onCancel }) {
  return (
    <div className="pt-confirm">
      <span>Hapus transaksi ini?</span>
      <button className="pt-btn-xs danger" onClick={onConfirm}>Ya, Hapus</button>
      <button className="pt-btn-xs" onClick={onCancel}>Batal</button>
    </div>
  );
}

function TxRow({ tx, onEdit, onDelete }) {
  const [confirmDel, setConfirmDel] = useState(false);
  const isBuy = tx.type === 'buy';
  const isReksaDana = tx.category === "Reksa Dana";
  const total = isReksaDana
    ? parseFloat(tx.hargaAset || 0)
    : parseFloat(tx.units) * parseFloat(tx.buyPrice) +
      parseFloat(tx.brokerFee || 0);

  return (
    <tr className={`pt-tx-row ${isBuy ? "buy" : "sell"}`}>
      <td>
        <span className={`pt-tx-type-badge ${isBuy ? "buy" : "sell"}`}>
          {isBuy ? <ArrowDownRight size={11} /> : <ArrowUpRight size={11} />}
          {isBuy ? "BELI" : "JUAL"}
        </span>
      </td>
      <td className="mono">{tx.date}</td>
      {isReksaDana ? (
        <>
          <td className="mono" colSpan={3}>
            {formatIDR(parseFloat(tx.hargaAset || 0))}
          </td>
        </>
      ) : (
        <>
          <td className="mono">{formatNumber(tx.units)}</td>
          <td className="mono">{formatIDR(parseFloat(tx.buyPrice))}</td>
          <td className="mono">{formatIDR(parseFloat(tx.brokerFee || 0))}</td>
        </>
      )}
      <td className="mono font-semibold">{formatIDR(total)}</td>
      <td className="pt-tx-notes">{tx.notes || "—"}</td>
      <td>
        {confirmDel ? (
          <ConfirmDelete
            onConfirm={() => onDelete(tx.id)}
            onCancel={() => setConfirmDel(false)}
          />
        ) : (
          <div className="pt-tx-actions">
            <button
              className="pt-btn-sm"
              onClick={() => onEdit(tx)}
              title="Edit"
            >
              <Edit3 size={14} />
            </button>
            <button
              className="pt-btn-sm danger"
              onClick={() => setConfirmDel(true)}
              title="Hapus"
            >
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </td>
    </tr>
  );
}

export default function TransactionHistory({ transactions, onEdit, onDelete, onAddTx }) {
  const [filterType, setFilterType] = useState('all');
  const [sortDir, setSortDir] = useState('desc');
  const [selectedTicker, setSelectedTicker] = useState('Semua');

  const tickers = ['Semua', ...new Set(transactions.map((t) => t.ticker))];

  const filtered = transactions
    .filter((t) => {
      if (filterType !== 'all' && t.type !== filterType) return false;
      if (selectedTicker !== 'Semua' && t.ticker !== selectedTicker) return false;
      return true;
    })
    .sort((a, b) => {
      const da = new Date(a.date), db = new Date(b.date);
      return sortDir === 'desc' ? db - da : da - db;
    });

  const totalBuy = transactions.filter(t => t.type === 'buy')
    .reduce((s, t) => {
      if (t.category === 'Reksa Dana') return s + parseFloat(t.hargaAset || 0);
      return s + parseFloat(t.units) * parseFloat(t.buyPrice) + parseFloat(t.brokerFee || 0);
    }, 0);
  const totalSell = transactions.filter(t => t.type === 'sell')
    .reduce((s, t) => {
      if (t.category === 'Reksa Dana') return s + parseFloat(t.hargaAset || 0);
      return s + parseFloat(t.units) * parseFloat(t.buyPrice);
    }, 0);

  const allReksaDana =
    filtered.length > 0 && filtered.every((t) => t.category === "Reksa Dana");

  return (
    <div className="pt-tx-page">
      <div className="pt-section-header">
        <h2 className="pt-section-title">Histori Transaksi</h2>
        <button className="pt-btn-primary sm" onClick={onAddTx}>
          + Tambah Transaksi
        </button>
      </div>

      {/* Summary bar */}
      <div className="pt-tx-summary">
        <div className="pt-tx-sum-card">
          <span className="pt-tx-sum-label">Total Beli</span>
          <span className="pt-tx-sum-val negative">{formatIDR(totalBuy)}</span>
        </div>
        <div className="pt-tx-sum-card">
          <span className="pt-tx-sum-label">Total Jual</span>
          <span className="pt-tx-sum-val positive">{formatIDR(totalSell)}</span>
        </div>
        <div className="pt-tx-sum-card">
          <span className="pt-tx-sum-label">Jumlah Transaksi</span>
          <span className="pt-tx-sum-val">{transactions.length}</span>
        </div>
      </div>

      {/* Filters */}
      <div className="pt-filter-row">
        <div className="pt-filter-cats">
          {["all", "buy", "sell"].map((t) => (
            <button
              key={t}
              className={`pt-filter-btn ${filterType === t ? "active" : ""}`}
              onClick={() => setFilterType(t)}
            >
              {t === "all" ? "Semua" : t === "buy" ? "Beli" : "Jual"}
            </button>
          ))}
        </div>
        <select
          className="pt-select"
          value={selectedTicker}
          onChange={(e) => setSelectedTicker(e.target.value)}
        >
          {tickers.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
        <button
          className="pt-btn-sm"
          onClick={() => setSortDir((d) => (d === "desc" ? "asc" : "desc"))}
        >
          {sortDir === "desc" ? (
            <ChevronDown size={14} />
          ) : (
            <ChevronUp size={14} />
          )}
          Tanggal
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="pt-empty-state">
          <div className="pt-empty-icon">📋</div>
          <h3>Belum ada transaksi</h3>
          <p>Mulai tambahkan transaksi pertamamu</p>
          <button className="pt-btn-primary" onClick={onAddTx}>
            + Tambah Transaksi
          </button>
        </div>
      ) : (
        <div className="pt-table-wrap">
          <table className="pt-table">
            <thead>
              <tr>
                <th>Tipe</th>
                <th>Tanggal</th>
                {allReksaDana ? (
                  <th>Harga Aset</th>
                ) : (
                  <>
                    <th>Unit</th>
                    <th>Harga</th>
                    <th>Fee</th>
                  </>
                )}
                <th>Total</th>
                <th>Catatan</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((tx) => (
                <TxRow
                  key={tx.id}
                  tx={tx}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
