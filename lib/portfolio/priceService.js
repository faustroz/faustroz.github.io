// ============================================================
// Portfolio Tracker — Price Service
// Fetches live prices from CoinGecko & Yahoo Finance (via proxy)
// ============================================================

// Asset categories that require manual price input
export const MANUAL_CATEGORIES = ['Reksa Dana', 'Deposito'];

// Category definitions
export const CATEGORIES = [
  'Saham IDX',
  'Saham US',
  'Crypto',
  'Reksa Dana',
  'Deposito',
];

// Category colors for charts
export const CATEGORY_COLORS = {
  'Saham IDX': '#3b82f6',
  'Saham US': '#8b5cf6',
  'Crypto': '#f59e0b',
  'Reksa Dana': '#10b981',
  'Deposito': '#6b7280',
};

// ---- CoinGecko (Crypto) ----
// coinIds: array of CoinGecko coin IDs (e.g. ['bitcoin', 'ethereum'])
export async function fetchCryptoPrices(coinIds) {
  if (!coinIds || coinIds.length === 0) return {};
  const ids = coinIds.join(',');
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=idr,usd&include_24hr_change=true`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error('CoinGecko API error');
  return await res.json();
  // Returns: { bitcoin: { idr: 123456789, usd: 7500, idr_24h_change: 2.3 }, ... }
}

// ---- Yahoo Finance (Stocks) via Next.js API proxy ----
export async function fetchStockPrice(ticker) {
  const res = await fetch(`/api/yahoo-finance?ticker=${encodeURIComponent(ticker)}`, {
    cache: 'no-store',
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data; // { price, currency, change24h, name }
}

// ---- Batch fetch all assets ----
// assets: array of { ticker, category, coinGeckoId }
// manualPrices: { TICKER: price } from localStorage
export async function fetchAllPrices(assets, manualPrices = {}) {
  const prices = {}; // { TICKER: { priceIDR, priceUSD, change24h, source } }

  // Separate by type
  const cryptoAssets = assets.filter((a) => a.category === 'Crypto' && a.coinGeckoId);
  const stockAssets = assets.filter(
    (a) => (a.category === 'Saham IDX' || a.category === 'Saham US') && a.ticker
  );
  const manualAssets = assets.filter((a) => MANUAL_CATEGORIES.includes(a.category));

  // Crypto
  if (cryptoAssets.length > 0) {
    try {
      const coinIds = [...new Set(cryptoAssets.map((a) => a.coinGeckoId))];
      const cryptoData = await fetchCryptoPrices(coinIds);
      for (const asset of cryptoAssets) {
        const d = cryptoData[asset.coinGeckoId];
        if (d) {
          prices[asset.ticker.toUpperCase()] = {
            priceIDR: d.idr,
            priceUSD: d.usd,
            change24h: d.idr_24h_change ?? 0,
            source: 'CoinGecko',
          };
        }
      }
    } catch (e) {
      console.warn('CoinGecko fetch failed:', e.message);
    }
  }

  // Stocks (sequential to avoid rate limiting)
  for (const asset of stockAssets) {
    try {
      const data = await fetchStockPrice(asset.ticker);
      if (data && data.price) {
        // Yahoo Finance returns in asset's native currency
        // IDX stocks are in IDR, US stocks in USD
        const isIDX = asset.category === 'Saham IDX';
        prices[asset.ticker.toUpperCase()] = {
          priceIDR: isIDX ? data.price : data.price * (data.usdToIdr || 16000),
          priceUSD: isIDX ? data.price / (data.usdToIdr || 16000) : data.price,
          change24h: data.change24h ?? 0,
          source: 'Yahoo Finance',
          currency: data.currency,
          name: data.name,
        };
      }
    } catch (e) {
      console.warn(`Yahoo Finance fetch failed for ${asset.ticker}:`, e.message);
    }
  }

  // Manual (Reksa Dana, Deposito)
  for (const asset of manualAssets) {
    const manual = manualPrices[asset.ticker.toUpperCase()];
    if (manual) {
      prices[asset.ticker.toUpperCase()] = {
        priceIDR: manual,
        priceUSD: manual / 16000,
        change24h: 0,
        source: 'Manual',
      };
    }
  }

  return prices;
}
