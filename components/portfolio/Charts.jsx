'use client';
import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { formatIDR } from '@/lib/portfolio/calculations';
import { CATEGORY_COLORS } from '@/lib/portfolio/priceService';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const chartDefaults = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      labels: { color: '#d4d4d8', font: { family: 'IBM Plex Mono, monospace', size: 12 } },
    },
    tooltip: {
      backgroundColor: '#18181b',
      borderColor: '#3f3f46',
      borderWidth: 1,
      titleColor: '#f5f5f5',
      bodyColor: '#d4d4d8',
    },
  },
  scales: {
    x: {
      grid: { color: '#27272a' },
      ticks: { color: '#a1a1aa', font: { family: 'IBM Plex Mono, monospace', size: 11 } },
    },
    y: {
      grid: { color: '#27272a' },
      ticks: {
        color: '#a1a1aa',
        font: { family: 'IBM Plex Mono, monospace', size: 11 },
        callback: (v) => `${(v / 1e6).toFixed(1)}M`,
      },
    },
  },
};

// ---- Portfolio Timeline Chart ----
export const PortfolioChart = /*#__PURE__*/ React.memo(function PortfolioChart({ priceHistory }) {
  const [range, setRange] = useState(30);

  const filtered = useMemo(
    () => (priceHistory ? priceHistory.slice(-range) : []),
    [priceHistory, range]
  );

  const data = useMemo(() => ({
    labels: filtered.map((h) => h.date),
    datasets: [
      {
        label: 'Nilai Portofolio (IDR)',
        data: filtered.map((h) => h.value),
        borderColor: '#22c55e',
        backgroundColor: 'rgba(34,197,94,0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: filtered.length > 20 ? 0 : 4,
        pointHoverRadius: 6,
        borderWidth: 2,
      },
    ],
  }), [filtered]);

  const options = useMemo(() => ({
    ...chartDefaults,
    plugins: {
      ...chartDefaults.plugins,
      tooltip: {
        ...chartDefaults.plugins.tooltip,
        callbacks: {
          label: (ctx) => ` ${formatIDR(ctx.raw)}`,
        },
      },
    },
    scales: {
      ...chartDefaults.scales,
      y: {
        ...chartDefaults.scales.y,
        ticks: {
          ...chartDefaults.scales.y.ticks,
          callback: (v) =>
            v >= 1e9
              ? `${(v / 1e9).toFixed(1)}B`
              : v >= 1e6
              ? `${(v / 1e6).toFixed(1)}M`
              : v >= 1e3
              ? `${(v / 1e3).toFixed(0)}K`
              : v,
        },
      },
    },
  }), []);

  return (
    <div className="pt-card pt-chart-card">
      <div className="pt-card-header">
        <h3 className="pt-card-title">Nilai Portofolio dari Waktu ke Waktu</h3>
        <div className="pt-toggle-group">
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              className={`pt-toggle-btn ${range === d ? 'active' : ''}`}
              onClick={() => setRange(d)}
            >
              {d}H
            </button>
          ))}
        </div>
      </div>
      {filtered.length < 2 ? (
        <div className="pt-empty pt-chart-empty">
          Data tren akan muncul setelah beberapa hari pencatatan portofolio.
          <br />
          <small>Refresh harga setiap hari untuk membangun histori.</small>
        </div>
      ) : (
        <div className="pt-chart-wrap">
          <Line data={data} options={options} />
        </div>
      )}
    </div>
  );
});

// ---- Allocation Doughnut Chart ----
export const AllocationChart = /*#__PURE__*/ React.memo(function AllocationChart({ summary }) {
  const { categoryBreakdown = {}, totalValue = 0 } = summary || {};

  const entries = useMemo(
    () => Object.entries(categoryBreakdown).filter(([, { value }]) => value > 0),
    [categoryBreakdown]
  );

  const labels = useMemo(() => entries.map(([cat]) => cat), [entries]);
  const values = useMemo(() => entries.map(([, { value }]) => value), [entries]);
  const colors = useMemo(
    () => labels.map((l) => CATEGORY_COLORS[l] || '#71717a'),
    [labels]
  );

  const data = useMemo(() => ({
    labels,
    datasets: [
      {
        data: values,
        backgroundColor: colors.map((c) => c + 'cc'),
        borderColor: colors,
        borderWidth: 2,
        hoverOffset: 8,
      },
    ],
  }), [labels, values, colors]);

  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    cutout: '65%',
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#18181b',
        borderColor: '#3f3f46',
        borderWidth: 1,
        titleColor: '#f5f5f5',
        bodyColor: '#d4d4d8',
        callbacks: {
          label: (ctx) => {
            const val = ctx.raw;
            const pct = totalValue > 0 ? ((val / totalValue) * 100).toFixed(1) : '0.0';
            return ` ${formatIDR(val)} (${pct}%)`;
          },
        },
      },
    },
  }), [totalValue]);

  if (entries.length === 0) {
    return (
      <div className="pt-card pt-chart-card">
        <div className="pt-card-header">
          <h3 className="pt-card-title">Alokasi Aset</h3>
        </div>
        <div className="pt-empty pt-chart-empty">Belum ada data aset</div>
      </div>
    );
  }

  return (
    <div className="pt-card pt-chart-card">
      <div className="pt-card-header">
        <h3 className="pt-card-title">Alokasi Aset</h3>
      </div>
      <div className="pt-chart-wrap doughnut">
        <Doughnut data={data} options={options} />
      </div>
      <div className="pt-allocation-legend">
        {labels.map((label, i) => {
          const pct = totalValue > 0 ? ((values[i] / totalValue) * 100).toFixed(1) : '0.0';
          return (
            <div className="pt-al-item" key={label}>
              <span className="pt-al-dot" style={{ background: colors[i] }} />
              <span className="pt-al-label">{label}</span>
              <span className="pt-al-val">{pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
});

// ---- P/L Bar Chart ----
export const PLChart = /*#__PURE__*/ React.memo(function PLChart({ summary }) {
  const { assets = [] } = summary || {};

  const sorted = useMemo(
    () => [...assets]
      .filter((a) => a.currentValue > 0)
      .sort((a, b) => b.plPercent - a.plPercent),
    [assets]
  );

  const data = useMemo(() => {
    const labels = sorted.map((a) => a.ticker);
    const plValues = sorted.map((a) => a.plPercent);
    return {
      labels,
      datasets: [
        {
          label: 'P/L (%)',
          data: plValues,
          backgroundColor: plValues.map((v) =>
            v >= 0 ? 'rgba(34,197,94,0.72)' : 'rgba(239,68,68,0.72)'
          ),
          borderColor: plValues.map((v) => (v >= 0 ? '#22c55e' : '#ef4444')),
          borderWidth: 1,
          borderRadius: 4,
        },
      ],
    };
  }, [sorted]);

  const options = useMemo(() => ({
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#18181b',
        borderColor: '#3f3f46',
        borderWidth: 1,
        titleColor: '#f5f5f5',
        bodyColor: '#d4d4d8',
        callbacks: {
          label: (ctx) => {
            const asset = sorted[ctx.dataIndex];
            return [
              ` P/L: ${ctx.raw >= 0 ? '+' : ''}${ctx.raw.toFixed(2)}%`,
              ` Nominal: ${formatIDR(asset.pl)}`,
            ];
          },
        },
      },
    },
  }), [sorted]);

  const chartHeight = Math.max(250, sorted.length * 40);

  if (sorted.length === 0) {
    return (
      <div className="pt-card pt-chart-card">
        <div className="pt-card-header">
          <h3 className="pt-card-title">Profit / Loss per Aset</h3>
        </div>
        <div className="pt-empty pt-chart-empty">Belum ada data aset</div>
      </div>
    );
  }

  return (
    <div className="pt-card pt-chart-card">
      <div className="pt-card-header">
        <h3 className="pt-card-title">Profit / Loss per Aset</h3>
      </div>
      <div className="pt-chart-wrap" style={{ height: chartHeight }}>
        <Bar data={data} options={options} />
      </div>
    </div>
  );
});
