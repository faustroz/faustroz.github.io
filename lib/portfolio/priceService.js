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
  'Saham IDX': '#f5f5f5',
  'Saham US': '#d4d4d8',
  'Crypto': '#a1a1aa',
  'Reksa Dana': '#737373',
  'Deposito': '#52525b',
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

// ---- Yahoo Finance (Stocks) — client-side fetch (static export has no API routes) ----
async function fetchUsdToIdr() {
  let usdToIdr = 16000;
  try {
    const fxRes = await fetch(
      'https://query1.finance.yahoo.com/v8/finance/chart/IDR=X?interval=1d&range=1d',
      { cache: 'no-store' }
    );
    if (fxRes.ok) {
      const fxData = await fxRes.json();
      const fxMeta = fxData?.chart?.result?.[0]?.meta;
      if (fxMeta?.regularMarketPrice) {
        usdToIdr = fxMeta.regularMarketPrice;
      }
    }
  } catch (_) {}
  return usdToIdr;
}

export async function fetchStockPrice(ticker) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1d`;

  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) return null;

  const data = await res.json();
  const result = data?.chart?.result?.[0];
  if (!result) return null;

  const meta = result.meta;
  const price = meta.regularMarketPrice ?? meta.previousClose;
  const prevClose = meta.previousClose ?? meta.chartPreviousClose;
  const change24h = prevClose ? ((price - prevClose) / prevClose) * 100 : 0;

  let usdToIdr = 16000;
  if (meta.currency === 'USD') {
    usdToIdr = await fetchUsdToIdr();
  }

  return {
    ticker,
    name: meta.longName || meta.shortName || ticker,
    price,
    currency: meta.currency,
    change24h,
    prevClose,
    usdToIdr,
    exchange: meta.exchangeName,
  };
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
