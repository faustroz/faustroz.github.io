'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import LoginGate from '@/components/portfolio/LoginGate';
import Navbar from '@/components/portfolio/Navbar';
import Dashboard from '@/components/portfolio/Dashboard';
import AssetList from '@/components/portfolio/AssetList';
import TransactionHistory from '@/components/portfolio/TransactionHistory';
import TransactionForm from '@/components/portfolio/TransactionForm';
import { PortfolioChart, AllocationChart, PLChart } from '@/components/portfolio/Charts';
import ExportImport from '@/components/portfolio/ExportImport';
import {
  getTransactions,
  saveTransaction,
  updateTransaction,
  deleteTransaction,
  getManualPrices,
  getPriceHistory,
  savePriceSnapshot,
} from '@/lib/portfolio/storage';
import { fetchAllPrices } from '@/lib/portfolio/priceService';
import { calcPortfolioSummary } from '@/lib/portfolio/calculations';

const REFRESH_INTERVAL_MS = 60 * 1000; // 60s

export default function PortfolioTrackerPage() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');

  // Data state
  const [transactions, setTransactions] = useState([]);
  const [prices, setPrices] = useState({});
  const [priceHistory, setPriceHistory] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState('');

  // UI state
  const [showForm, setShowForm] = useState(false);
  const [editTx, setEditTx] = useState(null);
  const [preselectedAsset, setPreselectedAsset] = useState(null);

  const refreshTimer = useRef(null);

  // ---- Load data ----
  const loadTransactions = useCallback(() => {
    const txs = getTransactions();
    setTransactions(txs);
    return txs;
  }, []);

  const loadPriceHistory = useCallback(() => {
    const h = getPriceHistory();
    setPriceHistory(h);
  }, []);

  // ---- Fetch live prices ----
  const refreshPrices = useCallback(async (txs) => {
    const currentTxs = txs || getTransactions();
    if (currentTxs.length === 0) {
      setSummary(calcPortfolioSummary([], {}));
      return;
    }

    setLoading(true);

    // Build unique asset list from transactions
    const assetMap = {};
    for (const tx of currentTxs) {
      const key = tx.ticker.toUpperCase();
      if (!assetMap[key]) {
        assetMap[key] = {
          ticker: key,
          category: tx.category,
          coinGeckoId: tx.coinGeckoId || '',
        };
      }
    }
    const assets = Object.values(assetMap);
    const manualPrices = getManualPrices();

    try {
      const newPrices = await fetchAllPrices(assets, manualPrices);
      setPrices(newPrices);

      const newSummary = calcPortfolioSummary(currentTxs, newPrices);
      setSummary(newSummary);

      // Save price snapshot for trend chart
      if (newSummary.totalValue > 0) {
        savePriceSnapshot(newSummary.totalValue);
        loadPriceHistory();
      }

      const now = new Date();
      setLastUpdated(
        now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
      );
    } catch (err) {
      console.error('Price refresh error:', err);
    } finally {
      setLoading(false);
    }
  }, [loadPriceHistory]);

  // ---- Init after login ----
  const initData = useCallback(() => {
    const txs = loadTransactions();
    loadPriceHistory();
    refreshPrices(txs);
  }, [loadTransactions, loadPriceHistory, refreshPrices]);

  useEffect(() => {
    if (!loggedIn) return;
    initData();

    // Auto-refresh every 60s
    refreshTimer.current = setInterval(() => {
      refreshPrices();
    }, REFRESH_INTERVAL_MS);

    return () => clearInterval(refreshTimer.current);
  }, [loggedIn, initData, refreshPrices]);

  // ---- Transaction CRUD ----
  const handleSaveTx = (formData) => {
    if (formData.id) {
      updateTransaction(formData.id, formData);
    } else {
      saveTransaction(formData);
    }
    const txs = loadTransactions();
    refreshPrices(txs);
    setShowForm(false);
    setEditTx(null);
    setPreselectedAsset(null);
  };

  const handleDeleteTx = (id) => {
    deleteTransaction(id);
    const txs = loadTransactions();
    refreshPrices(txs);
  };

  const handleEditTx = (tx) => {
    setEditTx(tx);
    setPreselectedAsset(null);
    setShowForm(true);
  };

  const handleAddTx = (asset = null) => {
    setEditTx(null);
    setPreselectedAsset(asset);
    setShowForm(true);
  };

  const handleManualPriceUpdate = () => {
    refreshPrices();
  };

  const handleDataChange = () => {
    initData();
  };

  const handleLogout = () => {
    setLoggedIn(false);
    setTransactions([]);
    setPrices({});
    setSummary(null);
    setPriceHistory([]);
    setActiveTab('dashboard');
    clearInterval(refreshTimer.current);
  };

  if (!loggedIn) {
    return <LoginGate onLogin={() => setLoggedIn(true)} />;
  }

  return (
    <div className="pt-app">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLogout={handleLogout}
      />

      <main className="pt-main">
        {activeTab === 'dashboard' && (
          <Dashboard
            summary={summary}
            priceHistory={priceHistory}
            onRefresh={() => refreshPrices()}
            lastUpdated={lastUpdated}
            loading={loading}
          />
        )}

        {activeTab === 'assets' && (
          <AssetList
            summary={summary}
            onAddTransaction={handleAddTx}
            onViewHistory={(asset) => {
              setActiveTab('transactions');
            }}
            onManualUpdate={handleManualPriceUpdate}
          />
        )}

        {activeTab === 'transactions' && (
          <TransactionHistory
            transactions={transactions}
            onEdit={handleEditTx}
            onDelete={handleDeleteTx}
            onAddTx={() => handleAddTx(null)}
          />
        )}

        {activeTab === 'charts' && (
          <div className="pt-charts-page">
            <h2 className="pt-section-title">Grafik Performa</h2>
            <PortfolioChart priceHistory={priceHistory} />
            <div className="pt-charts-row">
              <AllocationChart summary={summary} />
              <PLChart summary={summary} />
            </div>
          </div>
        )}

        {activeTab === 'export' && (
          <ExportImport onDataChange={handleDataChange} />
        )}
      </main>

      {showForm && (
        <TransactionForm
          initialAsset={preselectedAsset}
          editTx={editTx}
          onSave={handleSaveTx}
          onClose={() => {
            setShowForm(false);
            setEditTx(null);
            setPreselectedAsset(null);
          }}
        />
      )}
    </div>
  );
}
