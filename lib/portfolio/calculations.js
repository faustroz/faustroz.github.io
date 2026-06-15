// ============================================================
// Portfolio Tracker — Calculations
// ============================================================

// Format IDR currency
export const formatIDR = (value) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);

export const formatPercent = (value) =>
  `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;

export const formatNumber = (value, decimals = 4) =>
  new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(value);

// ---- Asset Summary ----
// Given all transactions for one ticker, compute current position
export function calcAssetPosition(transactions) {
  let totalUnits = 0;
  let totalCost = 0;

  for (const tx of transactions) {
    if (tx.type === 'buy') {
      const units = parseFloat(tx.units) || 0;
      const price = parseFloat(tx.buyPrice) || 0;
      const fee = parseFloat(tx.brokerFee) || 0;
      totalUnits += units;
      totalCost += units * price + fee;
    } else if (tx.type === 'sell') {
      const units = parseFloat(tx.units) || 0;
      const price = parseFloat(tx.buyPrice) || 0;
      // Reduce average cost proportionally
      if (totalUnits > 0) {
        const avgCost = totalCost / totalUnits;
        totalCost -= avgCost * units;
      }
      totalUnits -= units;
    }
  }

  const avgBuyPrice = totalUnits > 0 ? totalCost / totalUnits : 0;

  return {
    totalUnits: Math.max(0, totalUnits),
    totalCost: Math.max(0, totalCost),
    avgBuyPrice,
  };
}

// ---- Per-asset P/L ----
export function calcAssetPL(position, currentPriceIDR) {
  const currentValue = position.totalUnits * currentPriceIDR;
  const pl = currentValue - position.totalCost;
  const plPercent = position.totalCost > 0 ? (pl / position.totalCost) * 100 : 0;
  return { currentValue, pl, plPercent };
}

// ---- Full Portfolio Summary ----
// transactions: all transactions
// prices: { TICKER: { priceIDR } }
export function calcPortfolioSummary(transactions, prices) {
  const assetMap = {}; // TICKER -> { transactions, category, name, ticker, coinGeckoId }

  for (const tx of transactions) {
    const key = tx.ticker.toUpperCase();
    if (!assetMap[key]) {
      assetMap[key] = {
        ticker: key,
        name: tx.assetName,
        category: tx.category,
        coinGeckoId: tx.coinGeckoId || '',
        transactions: [],
      };
    }
    assetMap[key].transactions.push(tx);
  }

  let totalValue = 0;
  let totalCost = 0;
  const assets = [];
  const categoryBreakdown = {};

  for (const [ticker, asset] of Object.entries(assetMap)) {
    const position = calcAssetPosition(asset.transactions);
    if (position.totalUnits <= 0) continue;

    const priceData = prices[ticker];
    const currentPrice = priceData?.priceIDR ?? 0;
    const { currentValue, pl, plPercent } = calcAssetPL(position, currentPrice);

    totalValue += currentValue;
    totalCost += position.totalCost;

    // Category breakdown
    if (!categoryBreakdown[asset.category]) {
      categoryBreakdown[asset.category] = { value: 0, cost: 0 };
    }
    categoryBreakdown[asset.category].value += currentValue;
    categoryBreakdown[asset.category].cost += position.totalCost;

    assets.push({
      ...asset,
      position,
      currentPrice,
      currentValue,
      pl,
      plPercent,
      change24h: priceData?.change24h ?? 0,
      source: priceData?.source ?? 'N/A',
      priceUSD: priceData?.priceUSD ?? 0,
    });
  }

  const totalPL = totalValue - totalCost;
  const totalPLPercent = totalCost > 0 ? (totalPL / totalCost) * 100 : 0;

  // Best / worst performers
  const sorted = [...assets].sort((a, b) => b.plPercent - a.plPercent);
  const bestPerformer = sorted[0] || null;
  const worstPerformer = sorted[sorted.length - 1] || null;

  return {
    assets,
    totalValue,
    totalCost,
    totalPL,
    totalPLPercent,
    categoryBreakdown,
    bestPerformer,
    worstPerformer,
  };
}

// ---- Allocation % ----
export function calcAllocation(categoryBreakdown, totalValue) {
  return Object.entries(categoryBreakdown).map(([cat, { value }]) => ({
    category: cat,
    value,
    percent: totalValue > 0 ? (value / totalValue) * 100 : 0,
  }));
}
