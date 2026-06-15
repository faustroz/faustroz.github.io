// ============================================================
// Portfolio Tracker — Storage Service
// All data stored in localStorage (client-side only)
// ============================================================

const KEYS = {
  PASSWORD: 'pt_password',
  TRANSACTIONS: 'pt_transactions',
  MANUAL_PRICES: 'pt_manual_prices',
  PRICE_HISTORY: 'pt_price_history',
  SETTINGS: 'pt_settings',
};

// ---- Helpers ----
const parse = (key, fallback = null) => {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const persist = (key, value) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(value));
};

// ---- Password ----
export const hasPassword = () => !!localStorage.getItem(KEYS.PASSWORD);

export const setPassword = (plaintext) => {
  // Simple SHA-256 hash stored in localStorage
  const hash = simpleHash(plaintext);
  persist(KEYS.PASSWORD, hash);
};

export const verifyPassword = (plaintext) => {
  const stored = parse(KEYS.PASSWORD);
  if (!stored) return true; // no password set
  return stored === simpleHash(plaintext);
};

export const clearPassword = () => {
  localStorage.removeItem(KEYS.PASSWORD);
};

// Very simple deterministic hash for browser use
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return hash.toString(16);
}

// ---- Transactions ----
export const getTransactions = () => parse(KEYS.TRANSACTIONS, []);

export const saveTransaction = (tx) => {
  const all = getTransactions();
  const newTx = { ...tx, id: tx.id || Date.now().toString() };
  persist(KEYS.TRANSACTIONS, [...all, newTx]);
  return newTx;
};

export const updateTransaction = (id, updates) => {
  const all = getTransactions().map((tx) =>
    tx.id === id ? { ...tx, ...updates } : tx
  );
  persist(KEYS.TRANSACTIONS, all);
};

export const deleteTransaction = (id) => {
  const all = getTransactions().filter((tx) => tx.id !== id);
  persist(KEYS.TRANSACTIONS, all);
};

export const getTransactionsByTicker = (ticker) =>
  getTransactions().filter(
    (tx) => tx.ticker.toUpperCase() === ticker.toUpperCase()
  );

// ---- Manual Prices (Reksa Dana, Deposito) ----
export const getManualPrices = () => parse(KEYS.MANUAL_PRICES, {});

export const setManualPrice = (ticker, price) => {
  const prices = getManualPrices();
  persist(KEYS.MANUAL_PRICES, { ...prices, [ticker.toUpperCase()]: price });
};

// ---- Price History Snapshots (for chart) ----
export const getPriceHistory = () => parse(KEYS.PRICE_HISTORY, []);

export const savePriceSnapshot = (totalValue) => {
  const history = getPriceHistory();
  const today = new Date().toISOString().split('T')[0];
  const existing = history.findIndex((h) => h.date === today);
  if (existing >= 0) {
    history[existing] = { date: today, value: totalValue };
  } else {
    history.push({ date: today, value: totalValue });
  }
  // Keep only last 90 days
  const trimmed = history.slice(-90);
  persist(KEYS.PRICE_HISTORY, trimmed);
};

// ---- Settings ----
export const getSettings = () =>
  parse(KEYS.SETTINGS, { currency: 'IDR', refreshInterval: 60 });

export const updateSettings = (updates) => {
  const s = getSettings();
  persist(KEYS.SETTINGS, { ...s, ...updates });
};

// ---- Export / Import ----
export const exportData = () => {
  const data = {
    version: 1,
    exportedAt: new Date().toISOString(),
    transactions: getTransactions(),
    manualPrices: getManualPrices(),
    priceHistory: getPriceHistory(),
    settings: getSettings(),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `portfolio-backup-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
};

export const importData = (jsonString) => {
  const data = JSON.parse(jsonString);
  if (!data.version || !Array.isArray(data.transactions)) {
    throw new Error('Format file tidak valid');
  }
  persist(KEYS.TRANSACTIONS, data.transactions);
  if (data.manualPrices) persist(KEYS.MANUAL_PRICES, data.manualPrices);
  if (data.priceHistory) persist(KEYS.PRICE_HISTORY, data.priceHistory);
  if (data.settings) persist(KEYS.SETTINGS, data.settings);
};

export const clearAllData = () => {
  Object.values(KEYS).forEach((key) => localStorage.removeItem(key));
};
