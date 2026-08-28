'use client';
import { LayoutDashboard, Briefcase, ArrowLeftRight, ArrowLeft, BarChart3, Download } from 'lucide-react';
import Link from 'next/link';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'assets', label: 'Aset', icon: Briefcase },
  { id: 'transactions', label: 'Transaksi', icon: ArrowLeftRight },
  { id: 'charts', label: 'Grafik', icon: BarChart3 },
  { id: 'export', label: 'Backup', icon: Download },
];

export default function Navbar({ activeTab, setActiveTab }) {
  return (
    <>
      <header className="pt-mobile-header">
        <div className="pt-mobile-header-brand">
          <span className="pt-hub-mark">4a</span><span className="pt-hub-wordmark">llx</span>
          <span className="pt-mobile-divider" />
          <span className="pt-nav-title">Portfolio</span>
        </div>
        <Link className="pt-hub-back pt-hub-back--mobile" href="/hub" aria-label="Back to 4allx Hub"><ArrowLeft size={17} /></Link>
      </header>

      <nav className="pt-nav" aria-label="Portfolio navigation">
        <div className="pt-nav-brand">
          <span className="pt-hub-mark">4a</span><span className="pt-hub-wordmark">llx</span>
          <span className="pt-mobile-divider" />
          <span className="pt-nav-title">Portfolio</span>
        </div>

        <Link className="pt-hub-back" href="/hub"><ArrowLeft size={15} /><span>Back to Hub</span></Link>

        <div className="pt-nav-links">
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={`pt-nav-link ${activeTab === id ? 'active' : ''}`}
              onClick={() => setActiveTab(id)}
              aria-label={label}
              aria-current={activeTab === id ? 'page' : undefined}
            >
              <Icon size={16} />
              <span>{label}</span>
            </button>
          ))}
        </div>

      </nav>
    </>
  );
}
