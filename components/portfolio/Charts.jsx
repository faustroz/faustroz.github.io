'use client';
import { useEffect, useRef, useState } from 'react';
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
      labels: { color: '#94a3b8', font: { family: 'JetBrains Mono, monospace', size: 12 } },
    },
    tooltip: {
      backgroundColor: '#1e293b',
      borderColor: '#334155',
      borderWidth: 1,
      titleColor: '#f1f5f9',
      bodyColor: '#94a3b8',
    },
  },
  scales: {
    x: {
      grid: { color: '#1e293b' },
      ticks: { color: '#64748b', font: { family: 'JetBrains Mono, monospace', size: 11 } },
    },
    y: {
      grid: { color: '#1e293b' },
      ticks: {
        color: '#64748b',
        font: { family: 'JetBrains Mono, monospace', size: 11 },
        callback: (v) => `${(v / 1e6).toFixed(1)}M`,
      },
    },
  },
};

// ---- Portfolio Timeline Chart ----
export function PortfolioChart({ priceHistory }) {
  const [range, setRange] = useState(30);

  const filtered = priceHistory
    ? priceHistory.slice(-range)
    : [];

  const data = {
    labels: filtered.map((h) => h.date),
    datasets: [
      {
        label: 'Nilai Portofolio (IDR)',
        data: filtered.map((h) => h.value),
        borderColor: '#f59e0b',
        backgroundColor: 'rgba(245,158,11,0.08)',
        fill: true,
        tension: 0.4,
        pointRadius: filtered.length > 20 ? 0 : 4,
        pointHoverRadius: 6,
        borderWidth: 2,
      },
    ],
  };

  const options = {
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
  };

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
}

// ---- Allocation Doughnut Chart ----
export function AllocationChart({ summary }) {
  const { categoryBreakdown = {}, totalValue = 0 } = summary || {};
  const entries = Object.entries(categoryBreakdown).filter(([, { value }]) => value > 0);

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

  const labels = entries.map(([cat]) => cat);
  const values = entries.map(([, { value }]) => value);
  const colors = labels.map((l) => CATEGORY_COLORS[l] || '#6b7280');

  const data = {
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
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '65%',
    plugins: {
      legend: {
        position: 'right',
        labels: {
          color: '#94a3b8',
          font: { family: 'JetBrains Mono, monospace', size: 12 },
          padding: 16,
          generateLabels: (chart) => {
            const ds = chart.data.datasets[0];
            return chart.data.labels.map((label, i) => {
              const val = ds.data[i];
              const pct = totalValue > 0 ? ((val / totalValue) * 100).toFixed(1) : 0;
              return {
                text: `${label}  ${pct}%`,
                fillStyle: ds.backgroundColor[i],
                strokeStyle: ds.borderColor[i],
                lineWidth: 1,
                hidden: false,
                index: i,
              };
            });
          },
        },
      },
      tooltip: {
        backgroundColor: '#1e293b',
        borderColor: '#334155',
        borderWidth: 1,
        titleColor: '#f1f5f9',
        bodyColor: '#94a3b8',
        callbacks: {
          label: (ctx) => {
            const val = ctx.raw;
            const pct = totalValue > 0 ? ((val / totalValue) * 100).toFixed(1) : 0;
            return ` ${formatIDR(val)} (${pct}%)`;
          },
        },
      },
    },
  };

  return (
    <div className="pt-card pt-chart-card">
      <div className="pt-card-header">
        <h3 className="pt-card-title">Alokasi Aset</h3>
      </div>
      <div className="pt-chart-wrap doughnut">
        <Doughnut data={data} options={options} />
      </div>
    </div>
  );
}

// ---- P/L Bar Chart ----
export function PLChart({ summary }) {
  const { assets = [] } = summary || {};

  const sorted = [...assets]
    .filter((a) => a.currentValue > 0)
    .sort((a, b) => b.plPercent - a.plPercent);

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

  const labels = sorted.map((a) => a.ticker);
  const plValues = sorted.map((a) => a.plPercent);

  const data = {
    labels,
    datasets: [
      {
        label: 'P/L (%)',
        data: plValues,
        backgroundColor: plValues.map((v) =>
          v >= 0 ? 'rgba(16,185,129,0.7)' : 'rgba(244,63,94,0.7)'
        ),
        borderColor: plValues.map((v) => (v >= 0 ? '#10b981' : '#f43f5e')),
        borderWidth: 1,
        borderRadius: 4,
      },
    ],
  };

  const options = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1e293b',
        borderColor: '#334155',
        borderWidth: 1,
        titleColor: '#f1f5f9',
        bodyColor: '#94a3b8',
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
    scales: {
      x: {
        grid: { color: '#1e293b' },
        ticks: {
          color: '#64748b',
          font: { family: 'JetBrains Mono, monospace', size: 11 },
          callback: (v) => `${v}%`,
        },
      },
      y: {
        grid: { color: 'transparent' },
        ticks: {
          color: '#94a3b8',
          font: { family: 'JetBrains Mono, monospace', size: 12 },
        },
      },
    },
  };

  const chartHeight = Math.max(250, sorted.length * 40);

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
}
