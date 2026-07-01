// ============================================================
// Portfolio Tracker - Supabase Storage Service
// ============================================================

import { createClient } from '@supabase/supabase-js';

const TABLE = 'portfolio_tracker_store';

const KEYS = {
  PASSWORD: 'pt_password',
  TRANSACTIONS: 'pt_transactions',
  MANUAL_PRICES: 'pt_manual_prices',
  PRICE_HISTORY: 'pt_price_history',
  SETTINGS: 'pt_settings',
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase =
  supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

const requireSupabase = () => {
  if (!supabase) {
    throw new Error(
      'Supabase belum dikonfigurasi. Set NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY.'
    );
  }
  return supabase;
};

const read = async (key, fallback = null) => {
  const client = requireSupabase();
  const { data, error } = await client
    .from(TABLE)
    .select('value')
    .eq('key', key)
    .maybeSingle();

  if (error) throw error;
  return data?.value ?? fallback;
};

const write = async (key, value) => {
  const client = requireSupabase();
  const { error } = await client.from(TABLE).upsert({ key, value });
  if (error) throw error;
};

const remove = async (key) => {
  const client = requireSupabase();
  const { error } = await client.from(TABLE).delete().eq('key', key);
  if (error) throw error;
};

// ---- Password ----
export const hasPassword = async () => !!(await read(KEYS.PASSWORD));

export const setPassword = async (plaintext) => {
  await write(KEYS.PASSWORD, simpleHash(plaintext));
};

export const verifyPassword = async (plaintext) => {
  const stored = await read(KEYS.PASSWORD);
  if (!stored) return true; // no password set
  return stored === simpleHash(plaintext);
};

export const clearPassword = async () => {
  await remove(KEYS.PASSWORD);
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
export const getTransactions = () => read(KEYS.TRANSACTIONS, []);

export const saveTransaction = async (tx) => {
  const all = await getTransactions();
  const newTx = { ...tx, id: tx.id || Date.now().toString() };
  await write(KEYS.TRANSACTIONS, [...all, newTx]);
  return newTx;
};

export const updateTransaction = async (id, updates) => {
  const all = (await getTransactions()).map((tx) =>
    tx.id === id ? { ...tx, ...updates } : tx
  );
  await write(KEYS.TRANSACTIONS, all);
};

export const deleteTransaction = async (id) => {
  const all = (await getTransactions()).filter((tx) => tx.id !== id);
  await write(KEYS.TRANSACTIONS, all);
};

export const getTransactionsByTicker = async (ticker) =>
  (await getTransactions()).filter(
    (tx) => tx.ticker.toUpperCase() === ticker.toUpperCase()
  );

// ---- Manual Prices (Reksa Dana, Deposito) ----
export const getManualPrices = () => read(KEYS.MANUAL_PRICES, {});

export const setManualPrice = async (ticker, price) => {
  const prices = await getManualPrices();
  await write(KEYS.MANUAL_PRICES, { ...prices, [ticker.toUpperCase()]: price });
};

// ---- Price History Snapshots (for chart) ----
export const getPriceHistory = () => read(KEYS.PRICE_HISTORY, []);

export const savePriceSnapshot = async (totalValue) => {
  const history = await getPriceHistory();
  const today = new Date().toISOString().split('T')[0];
  const existing = history.findIndex((h) => h.date === today);
  if (existing >= 0) {
    history[existing] = { date: today, value: totalValue };
  } else {
    history.push({ date: today, value: totalValue });
  }
  await write(KEYS.PRICE_HISTORY, history.slice(-90));
};

// ---- Settings ----
export const getSettings = () =>
  read(KEYS.SETTINGS, { currency: 'IDR', refreshInterval: 60 });

export const updateSettings = async (updates) => {
  const s = await getSettings();
  await write(KEYS.SETTINGS, { ...s, ...updates });
};

// ---- Export / Import ----
export const exportData = async () => {
  const data = {
    version: 1,
    exportedAt: new Date().toISOString(),
    transactions: await getTransactions(),
    manualPrices: await getManualPrices(),
    priceHistory: await getPriceHistory(),
    settings: await getSettings(),
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

export const importData = async (jsonString) => {
  const data = JSON.parse(jsonString);
  if (!data.version || !Array.isArray(data.transactions)) {
    throw new Error('Format file tidak valid');
  }
  await write(KEYS.TRANSACTIONS, data.transactions);
  if (data.manualPrices) await write(KEYS.MANUAL_PRICES, data.manualPrices);
  if (data.priceHistory) await write(KEYS.PRICE_HISTORY, data.priceHistory);
  if (data.settings) await write(KEYS.SETTINGS, data.settings);
};

export const clearAllData = async () => {
  const client = requireSupabase();
  const { error } = await client.from(TABLE).delete().in('key', Object.values(KEYS));
  if (error) throw error;
};

