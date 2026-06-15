'use client';
import { useMemo, useState } from 'react';
import {
  TrendingUp, TrendingDown, Wallet, Star, AlertTriangle, RefreshCw, Clock,
} from 'lucide-react';
import { formatIDR, formatPercent } from '@/lib/portfolio/calculations';
import { CATEGORY_COLORS } from '@/lib/portfolio/priceService';

function KpiCard({ label, value, sub, subPositive, icon: Icon, accent }) {
  return (
    <div className={`pt-kpi-card ${accent || ''}`}>
      <div className="pt-kpi-header">
        <span className="pt-kpi-label">{label}</span>
        <div className="pt-kpi-icon">
          <Icon size={16} />
        </div>
      </div>
      <div className="pt-kpi-value">{value}</div>
      {sub && (
        <div className={`pt-kpi-sub ${subPositive === true ? 'positive' : subPositive === false ? 'negative' : ''}`}>
          {sub}
        </div>
      )}
    </div>
  );
}

function SparkLine({ history, color = '#f59e0b' }) {
  if (!history || history.length < 2) {
    return <div className="pt-spark-empty">Belum ada data tren</div>;
  }
  const values = history.map((h) => h.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const w = 200;
  const h = 50;
  const pts = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * w;
      const y = h - ((v - min) / range) * h;
      return `${x},${y}`;
    })
    .join(' ');

  const isUp = values[values.length - 1] >= values[0];

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="pt-sparkline"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={isUp ? '#10b981' : '#f43f5e'} stopOpacity="0.3" />
          <stop offset="100%" stopColor={isUp ? '#10b981' : '#f43f5e'} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline
        points={pts}
        fill="none"
        stroke={isUp ? '#10b981' : '#f43f5e'}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function Dashboard({ summary, priceHistory, onRefresh, lastUpdated, loading }) {
  const [trendDays, setTrendDays] = useState(30);

  const trendHistory = useMemo(() => {
    if (!priceHistory) return [];
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - trendDays);
    return priceHistory.filter((h) => new Date(h.date) >= cutoff);
  }, [priceHistory, trendDays]);

  const {
    totalValue = 0,
    totalPL = 0,
    totalPLPercent = 0,
    categoryBreakdown = {},
    bestPerformer,
    worstPerformer,
    assets = [],
  } = summary || {};

  const isProfit = totalPL >= 0;

  return (
    <div className="pt-dashboard">
      {/* Header row */}
      <div className="pt-dashboard-header">
        <div>
          <h2 className="pt-section-title">Dashboard</h2>
          {lastUpdated && (
            <p className="pt-last-updated">
              <Clock size={12} />
              Update: {lastUpdated}
            </p>
          )}
        </div>
        <button className={`pt-btn-refresh ${loading ? 'spinning' : ''}`} onClick={onRefresh}>
          <RefreshCw size={15} />
          <span>{loading ? 'Memperbarui…' : 'Refresh Harga'}</span>
        </button>
      </div>

      {/* KPI Grid */}
      <div className="pt-kpi-grid">
        <KpiCard
          label="Total Nilai Portofolio"
          value={formatIDR(totalValue)}
          icon={Wallet}
          accent="main"
        />
        <KpiCard
          label="Total Profit / Loss"
          value={formatIDR(totalPL)}
          sub={formatPercent(totalPLPercent)}
          subPositive={isProfit}
          icon={isProfit ? TrendingUp : TrendingDown}
          accent={isProfit ? 'profit' : 'loss'}
        />
        {bestPerformer && (
          <KpiCard
            label="Best Performer"
            value={bestPerformer.ticker}
            sub={`${formatPercent(bestPerformer.plPercent)} • ${bestPerformer.name}`}
            subPositive={true}
            icon={Star}
            accent="best"
          />
        )}
        {worstPerformer && worstPerformer.ticker !== bestPerformer?.ticker && (
          <KpiCard
            label="Worst Performer"
            value={worstPerformer.ticker}
            sub={`${formatPercent(worstPerformer.plPercent)} • ${worstPerformer.name}`}
            subPositive={false}
            icon={AlertTriangle}
            accent="worst"
          />
        )}
      </div>

      {/* Bottom row: Trend chart + Category breakdown */}
      <div className="pt-dashboard-bottom">
        {/* Trend Chart */}
        <div className="pt-card pt-trend-card">
          <div className="pt-card-header">
            <h3 className="pt-card-title">Tren Portofolio</h3>
            <div className="pt-toggle-group">
              {[7, 30].map((d) => (
                <button
                  key={d}
                  className={`pt-toggle-btn ${trendDays === d ? 'active' : ''}`}
                  onClick={() => setTrendDays(d)}
                >
                  {d}H
                </button>
              ))}
            </div>
          </div>
          <SparkLine history={trendHistory} />
          <div className="pt-trend-labels">
            <span>{trendHistory[0]?.date || '-'}</span>
            <span>{trendHistory[trendHistory.length - 1]?.date || '-'}</span>
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="pt-card pt-category-card">
          <div className="pt-card-header">
            <h3 className="pt-card-title">Alokasi Kategori</h3>
          </div>
          {Object.keys(categoryBreakdown).length === 0 ? (
            <div className="pt-empty">Belum ada aset</div>
          ) : (
            <div className="pt-category-list">
              {Object.entries(categoryBreakdown)
                .sort((a, b) => b[1].value - a[1].value)
                .map(([cat, { value }]) => {
                  const pct = totalValue > 0 ? (value / totalValue) * 100 : 0;
                  const color = CATEGORY_COLORS[cat] || '#6b7280';
                  return (
                    <div key={cat} className="pt-category-row">
                      <div className="pt-category-info">
                        <div
                          className="pt-category-dot"
                          style={{ background: color }}
                        />
                        <span className="pt-category-name">{cat}</span>
                      </div>
                      <div className="pt-category-right">
                        <span className="pt-category-value">{formatIDR(value)}</span>
                        <span className="pt-category-pct">{pct.toFixed(1)}%</span>
                      </div>
                      <div
                        className="pt-category-bar"
                        style={{ width: `${pct}%`, background: color }}
                      />
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </div>

      {/* Top Assets Table */}
      {assets.length > 0 && (
        <div className="pt-card">
          <div className="pt-card-header">
            <h3 className="pt-card-title">Ringkasan Aset</h3>
            <span className="pt-card-count">{assets.length} aset</span>
          </div>
          <div className="pt-table-wrap">
            <table className="pt-table">
              <thead>
                <tr>
                  <th>Aset</th>
                  <th>Kategori</th>
                  <th>Harga Sekarang</th>
                  <th>Nilai</th>
                  <th>P/L</th>
                  <th>Change 24H</th>
                </tr>
              </thead>
              <tbody>
                {assets
                  .sort((a, b) => b.currentValue - a.currentValue)
                  .map((a) => (
                    <tr key={a.ticker}>
                      <td>
                        <div className="pt-asset-name">
                          <span className="pt-asset-ticker">{a.ticker}</span>
                          <span className="pt-asset-fullname">{a.name}</span>
                        </div>
                      </td>
                      <td>
                        <span
                          className="pt-badge"
                          style={{ background: (CATEGORY_COLORS[a.category] || '#6b7280') + '22', color: CATEGORY_COLORS[a.category] || '#6b7280' }}
                        >
                          {a.category}
                        </span>
                      </td>
                      <td className="mono">{formatIDR(a.currentPrice)}</td>
                      <td className="mono">{formatIDR(a.currentValue)}</td>
                      <td className={`mono ${a.pl >= 0 ? 'positive' : 'negative'}`}>
                        {formatIDR(a.pl)}
                        <br />
                        <small>{formatPercent(a.plPercent)}</small>
                      </td>
                      <td className={`mono ${a.change24h >= 0 ? 'positive' : 'negative'}`}>
                        {formatPercent(a.change24h)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
