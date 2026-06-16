// ============================================================
// Portfolio Tracker — Price Service
// Fetches live prices from CoinGecko & Yahoo Finance (via CORS proxy)
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

const DEFAULT_USD_IDR = 16000;

// ---- CoinGecko (Crypto) ----
export async function fetchCryptoPrices(coinIds) {
  if (!coinIds || coinIds.length === 0) return {};
  const ids = coinIds.join(',');
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=idr,usd&include_24hr_change=true`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error('CoinGecko API error');
  return await res.json();
}

// ---- CORS-safe JSON fetch (static export / GitHub Pages) ----
async function fetchJsonWithCors(targetUrl) {
  try {
    const direct = await fetch(targetUrl, { cache: 'no-store' });
    if (direct.ok) return await direct.json();
  } catch (_) {
    // Expected in browser — Yahoo blocks direct CORS requests.
  }

  const proxyBuilders = [
    (url) => `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
    (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  ];

  let lastError;
  for (const buildProxyUrl of proxyBuilders) {
    try {
      const proxyUrl = buildProxyUrl(targetUrl);
      const res = await fetch(proxyUrl, { cache: 'no-store' });
      if (!res.ok) continue;

      if (proxyUrl.includes('allorigins.win')) {
        const payload = await res.json();
        if (!payload?.contents) continue;
        return JSON.parse(payload.contents);
      }

      return await res.json();
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error('Gagal mengambil data pasar');
}

export function normalizeStockTicker(ticker, category) {
  const value = String(ticker || '').trim().toUpperCase();
  if (!value) return value;

  if (category === 'Saham IDX') {
    return value.endsWith('.JK') ? value : `${value}.JK`;
  }

  if (category === 'Saham US') {
    return value.replace(/\.(US|NASDAQ|NYSE)$/i, '');
  }

  return value;
}

// ---- USD/IDR ----
async function fetchUsdToIdr() {
  try {
    const res = await fetch(
      'https://api.frankfurter.dev/v1/latest?from=USD&to=IDR',
      { cache: 'no-store' }
    );
    if (res.ok) {
      const data = await res.json();
      if (data?.rates?.IDR) return data.rates.IDR;
    }
  } catch (_) {}

  try {
    const data = await fetchJsonWithCors(
      'https://query1.finance.yahoo.com/v8/finance/chart/IDR=X?interval=1d&range=1d'
    );
    const rate = data?.chart?.result?.[0]?.meta?.regularMarketPrice;
    if (rate) return rate;
  } catch (_) {}

  return DEFAULT_USD_IDR;
}

// ---- Yahoo Finance (Stocks) ----
export async function fetchStockPrice(ticker, category = '') {
  const normalizedTicker = normalizeStockTicker(ticker, category);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(normalizedTicker)}?interval=1d&range=1d`;

  const data = await fetchJsonWithCors(url);
  const result = data?.chart?.result?.[0];
  if (!result) return null;

  const meta = result.meta;
  const price = meta.regularMarketPrice ?? meta.previousClose;
  if (!price) return null;

  const prevClose = meta.previousClose ?? meta.chartPreviousClose;
  const change24h = prevClose ? ((price - prevClose) / prevClose) * 100 : 0;

  let usdToIdr = DEFAULT_USD_IDR;
  if (meta.currency === 'USD') {
    usdToIdr = await fetchUsdToIdr();
  }

  return {
    ticker: normalizedTicker,
    name: meta.longName || meta.shortName || normalizedTicker,
    price,
    currency: meta.currency,
    change24h,
    prevClose,
    usdToIdr,
    exchange: meta.exchangeName,
  };
}

// ---- Batch fetch all assets ----
export async function fetchAllPrices(assets, manualPrices = {}) {
  const prices = {};
  const usdToIdr = await fetchUsdToIdr();

  const cryptoAssets = assets.filter((a) => a.category === 'Crypto' && a.coinGeckoId);
  const stockAssets = assets.filter(
    (a) => (a.category === 'Saham IDX' || a.category === 'Saham US') && a.ticker
  );
  const manualAssets = assets.filter((a) => MANUAL_CATEGORIES.includes(a.category));

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

  for (const asset of stockAssets) {
    try {
      const data = await fetchStockPrice(asset.ticker, asset.category);
      if (data && data.price) {
        const isIDX = asset.category === 'Saham IDX';
        const fxRate = data.usdToIdr || usdToIdr || DEFAULT_USD_IDR;
        prices[asset.ticker.toUpperCase()] = {
          priceIDR: isIDX ? data.price : data.price * fxRate,
          priceUSD: isIDX ? data.price / fxRate : data.price,
          change24h: data.change24h ?? 0,
          source: 'Yahoo Finance',
          currency: data.currency,
          name: data.name,
        };
      }
    } catch (e) {
      console.warn(
        `Yahoo Finance fetch failed for ${normalizeStockTicker(asset.ticker, asset.category)}:`,
        e.message
      );
    }
  }

  for (const asset of manualAssets) {
    const manual = manualPrices[asset.ticker.toUpperCase()];
    if (manual) {
      prices[asset.ticker.toUpperCase()] = {
        priceIDR: manual,
        priceUSD: manual / usdToIdr,
        change24h: 0,
        source: 'Manual',
      };
    }
  }

  return prices;
}
