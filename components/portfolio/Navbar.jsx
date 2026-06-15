'use client';
import { LayoutDashboard, Briefcase, ArrowLeftRight, BarChart3, Download, LogOut } from 'lucide-react';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'assets', label: 'Aset', icon: Briefcase },
  { id: 'transactions', label: 'Transaksi', icon: ArrowLeftRight },
  { id: 'charts', label: 'Grafik', icon: BarChart3 },
  { id: 'export', label: 'Backup', icon: Download },
];

export default function Navbar({ activeTab, setActiveTab, onLogout }) {
  return (
    <nav className="pt-nav">
      <div className="pt-nav-brand">
        <div className="pt-nav-logo">
          <BarChart3 size={20} />
        </div>
        <span className="pt-nav-title">Portfolio</span>
      </div>

      <div className="pt-nav-links">
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className={`pt-nav-link ${activeTab === id ? 'active' : ''}`}
            onClick={() => setActiveTab(id)}
          >
            <Icon size={16} />
            <span>{label}</span>
          </button>
        ))}
      </div>

      <button className="pt-nav-logout" onClick={onLogout} title="Keluar">
        <LogOut size={16} />
        <span>Keluar</span>
      </button>
    </nav>
  );
}
