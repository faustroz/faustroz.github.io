'use client';
import { useMemo, useEffect, useRef } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function ChartsSection({ dailyData }) {
  const last28Days = useMemo(() => {
    if (!dailyData || dailyData.length === 0) return [];
    
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 28);
    
    return dailyData
      .filter(d => new Date(d.date) >= cutoff)
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [dailyData]);

  const viewsChartData = useMemo(() => {
    const labels = last28Days.map(d => {
      const date = new Date(d.date);
      return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
    });

    return {
      labels,
      datasets: [
        {
          label: 'Views Harian',
          data: last28Days.map(d => d.views || 0),
          borderColor: '#00d4ff',
          backgroundColor: 'rgba(0, 212, 255, 0.1)',
          fill: true,
          tension: 0.4,
          pointRadius: 2,
          pointHoverRadius: 5,
        },
      ],
    };
  }, [last28Days]);

  const subsChartData = useMemo(() => {
    const labels = last28Days.map(d => {
      const date = new Date(d.date);
      return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
    });

    return {
      labels,
      datasets: [
        {
          label: 'Subscriber Kumulatif',
          data: last28Days.map(d => d.total_subscribers || 0),
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          fill: true,
          tension: 0.4,
          pointRadius: 2,
          pointHoverRadius: 5,
        },
      ],
    };
  }, [last28Days]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        padding: 10,
        cornerRadius: 8,
      },
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(255, 255, 255, 0.05)',
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.5)',
          maxRotation: 45,
          minRotation: 45,
        },
      },
      y: {
        grid: {
          color: 'rgba(255, 255, 255, 0.05)',
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.5)',
        },
      },
    },
  };

  if (last28Days.length === 0) {
    return null;
  }

  return (
    <section className="yt-section">
      <h2 className="yt-section-title">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 3v18h18"/>
          <path d="m19 9-5 5-4-4-3 3"/>
        </svg>
        Grafik Tren (28 Hari Terakhir)
      </h2>

      <div className="yt-charts-grid">
        <div className="yt-chart-card">
          <h3 className="yt-chart-title">Views Harian</h3>
          <div className="yt-chart-wrap">
            <Line data={viewsChartData} options={chartOptions} />
          </div>
        </div>

        <div className="yt-chart-card">
          <h3 className="yt-chart-title">Subscriber Kumulatif</h3>
          <div className="yt-chart-wrap">
            <Line data={subsChartData} options={chartOptions} />
          </div>
        </div>
      </div>
    </section>
  );
}
