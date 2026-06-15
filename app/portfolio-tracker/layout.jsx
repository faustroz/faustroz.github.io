// app/portfolio-tracker/layout.jsx
// Dedicated layout — dark finance theme, no root footer
import './portfolio.css';

export const metadata = {
  title: 'Portfolio Tracker',
  description: 'Track your investment portfolio — Saham IDX, Saham US, Crypto, Reksa Dana',
};

export default function PortfolioTrackerLayout({ children }) {
  return <div style={{ background: '#080c14', minHeight: '100vh' }}>{children}</div>;
}
